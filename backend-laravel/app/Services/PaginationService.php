<?php

namespace App\Services;

use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;

class PaginationService
{
    /**
     * Paginate a query using Laravel 13's native cursorPaginate() or paginate()
     * and normalize into the standard GPRETAIL ERP JSON response shape.
     *
     * @param EloquentBuilder|QueryBuilder $query
     * @param string $resource Resource name (e.g. 'products', 'pos_sales', 'sales')
     * @param Request $request
     * @param array $options Additional overrides (e.g. 'mode', 'default_sort', 'allowed_sorts', 'limit')
     * @return array Standardized response array
     */
    public function paginate(
        EloquentBuilder|QueryBuilder $query,
        string $resource,
        Request $request,
        array $options = []
    ): array {
        $resourceConfig = config("pagination.resources.{$resource}", []);

        // 1. Resolve Limit with safeguards
        $defaultLimit = $resourceConfig['default_limit'] ?? config('pagination.default_limit', 50);
        $maxLimit = config('pagination.max_limit', 200);

        $requestedLimit = (int) ($request->input('limit') ?? $request->input('per_page') ?? $options['limit'] ?? $defaultLimit);
        $limit = max(1, min($requestedLimit, $maxLimit));

        // 2. Resolve Pagination Mode ('offset' vs 'cursor')
        $mode = $this->resolveMode($resource, $resourceConfig, $request, $options, $query);

        // 3. Resolve and apply safe sorting if not already sorted on query
        $this->applySorting($query, $resourceConfig, $request, $options);

        // 4. Delegate to Laravel 13 native paginators
        if ($mode === 'cursor') {
            // Same O(1) information_schema estimate resolveMode() already used to decide on cursor
            // mode in the first place -- reused here so the UI can show an approximate overall
            // total instead of nothing, without adding a real COUNT(*) over a huge table (the exact
            // cost this mode exists to avoid). It reflects the whole table, not the current
            // search/filters, since information_schema.TABLES has no notion of a WHERE clause.
            $estimatedTotal = $this->getEstimatedRowCount($query, $options);

            $cursor = $request->input('cursor') ?? $options['cursor'] ?? null;
            /** @var CursorPaginator $paginator */
            $paginator = $query->cursorPaginate(
                perPage: $limit,
                columns: ['*'],
                cursorName: 'cursor',
                cursor: $cursor
            );

            return $this->formatCursorResponse($paginator, $limit, $estimatedTotal);
        }

        // Offset Mode
        $page = max(1, (int) ($request->input('page', $options['page'] ?? 1)));
        /** @var LengthAwarePaginator $paginator */
        $paginator = $query->paginate(
            perPage: $limit,
            columns: ['*'],
            pageName: 'page',
            page: $page
        );

        return $this->formatOffsetResponse($paginator, $limit);
    }

    /**
     * Resolve pagination mode:
     * - If cursor param is present -> cursor
     * - If page param is present -> offset
     * - Else look up resource config mode
     * - Fallback to default_mode ('auto' -> 'offset')
     */
    public function resolveMode(
        string $resource,
        array $resourceConfig,
        Request $request,
        array $options,
        EloquentBuilder|QueryBuilder|null $query = null
    ): string {
        // 1. Explicit cursor parameter in request always uses cursor mode
        if ($request->filled('cursor')) {
            return 'cursor';
        }

        $cursorThreshold = (int) ($resourceConfig['cursor_threshold'] ?? config('pagination.cursor_threshold', 50000));
        $maxOffset = (int) ($resourceConfig['max_offset'] ?? config('pagination.max_offset', 50000));

        // 2. Protect against deep OFFSET performance collapse (> 1 Lakh records)
        $requestedPage = max(1, (int) $request->input('page', 1));
        $requestedLimit = max(1, (int) ($request->input('limit', $request->input('per_page', 50))));
        if (($requestedPage * $requestedLimit) > $maxOffset) {
            // Auto-switch to cursor pagination to prevent MariaDB slow query timeouts / filesort
            return 'cursor';
        }

        // 3. Explicit pagination_mode requested by client
        $explicitMode = $request->input('pagination_mode', $options['mode'] ?? null);
        if ($explicitMode && in_array($explicitMode, ['offset', 'cursor'], true)) {
            return $explicitMode;
        }

        $configuredMode = $resourceConfig['mode'] ?? config('pagination.default_mode', 'auto');

        // 4. No page requested and the resource is unconditionally configured for cursor mode:
        // the row-count estimate below can only ever agree, so skip that extra query entirely.
        if (!$request->filled('page') && $configuredMode === 'cursor') {
            return 'cursor';
        }

        $estimatedRows = $this->getEstimatedRowCount($query, $options);

        // 5. If client specifically requested a page number, allow offset if within 1-Lakh dataset threshold
        if ($request->filled('page')) {
            return ($estimatedRows > $cursorThreshold) ? 'cursor' : 'offset';
        }

        // 6. 1-Lakh (100,000) Automatic Threshold Detection for Auto/Offset resources
        if ($estimatedRows > $cursorThreshold) {
            return 'cursor';
        }

        return 'offset';
    }

    /**
     * Get estimated row count in O(1) time without running a slow COUNT(*) on millions of rows.
     * Uses MySQL/MariaDB information_schema.TABLES metadata.
     *
     * Caveat: TABLE_ROWS is InnoDB's own sampled estimate, not an exact count -- it can be
     * significantly stale after a bulk delete/import, or before the next ANALYZE TABLE runs. A
     * stale-low estimate on a resource actually configured 'auto'/'offset' could leave a genuinely
     * huge table on offset pagination (the exact problem this exists to prevent); a stale-high one
     * could switch a modest table to cursor mode unnecessarily. This only matters for resources
     * relying on the auto-threshold check (resolveMode() step 6) -- an unconditionally-configured
     * 'cursor' resource never reaches this at all when no ?page= is present (see resolveMode()
     * step 4), so it's unaffected by estimate accuracy.
     */
    public function getEstimatedRowCount(EloquentBuilder|QueryBuilder|null $query, array $options = []): int
    {
        if (isset($options['estimated_count'])) {
            return (int) $options['estimated_count'];
        }

        if ($query === null) {
            return 0;
        }

        $tableName = $this->extractTableName($query);
        if (!$tableName) {
            return 0;
        }

        // In SQLite (automated feature tests), fast direct count
        if (config('database.default') === 'sqlite') {
            try {
                return (int) (clone $query)->count();
            } catch (\Throwable) {
                return 0;
            }
        }

        // In MariaDB / MySQL, instant O(1) read from information_schema
        try {
            $row = \Illuminate\Support\Facades\DB::selectOne(
                "SELECT TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
                [$tableName]
            );
            if ($row && $row->TABLE_ROWS !== null) {
                return (int) $row->TABLE_ROWS;
            }
        } catch (\Throwable) {
            // Fallback if permission or schema error
        }

        return 0;
    }

    /**
     * Extract primary table name from Eloquent or Query Builder.
     */
    public function extractTableName(EloquentBuilder|QueryBuilder $query): ?string
    {
        if ($query instanceof EloquentBuilder) {
            return $query->getModel()->getTable();
        }

        $from = $query->from;
        if (is_string($from)) {
            $parts = preg_split('/\s+(as\s+)?/i', trim($from));
            return $parts[0] ?? $from;
        }

        return null;
    }

    /**
     * Apply sorting with column whitelist check.
     */
    protected function applySorting(
        EloquentBuilder|QueryBuilder $query,
        array $resourceConfig,
        Request $request,
        array $options
    ): void {
        // If the query already has orders defined, preserve them
        $orders = $query instanceof EloquentBuilder ? $query->getQuery()->orders : $query->orders;
        if (!empty($orders)) {
            return;
        }

        $allowedSorts = $options['allowed_sorts'] ?? $resourceConfig['allowed_sorts'] ?? ['id', 'created_at', 'name'];
        $defaultSort = $options['default_sort'] ?? $resourceConfig['default_sort'] ?? 'id';
        $defaultOrder = $options['default_order'] ?? $resourceConfig['default_order'] ?? 'desc';
        $tieBreaker = $options['tie_breaker'] ?? $resourceConfig['tie_breaker'] ?? 'id';

        $sort = $request->input('sort', $defaultSort);
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = $defaultSort;
        }

        $order = strtolower($request->input('order', $request->input('direction', $defaultOrder))) === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sort, $order);
        if ($tieBreaker && $tieBreaker !== $sort) {
            $query->orderBy($tieBreaker, $order);
        }
    }

    /**
     * Format Laravel's LengthAwarePaginator into ERP standard response.
     */
    protected function formatOffsetResponse(LengthAwarePaginator $paginator, int $limit): array
    {
        $items = $paginator->items();
        $total = $paginator->total();
        $currentPage = $paginator->currentPage();
        $lastPage = $paginator->lastPage();

        return [
            'success' => true,
            'data'    => $items,
            'pagination' => [
                'mode'         => 'offset',
                'page'         => $currentPage,
                'per_page'     => $limit,
                'total'        => $total,
                'total_pages'  => $lastPage,
                'has_next'     => $paginator->hasMorePages(),
                'has_previous' => $currentPage > 1,
                'current_page' => $currentPage,
                'last_page'    => $lastPage,
            ],
            // Top-level aliases for backward compatibility with existing ERP screens
            'total'      => $total,
            'page'       => $currentPage,
            'limit'      => $limit,
            'totalPages' => $lastPage,
        ];
    }

    /**
     * Format Laravel's CursorPaginator into ERP standard response.
     */
    protected function formatCursorResponse(CursorPaginator $paginator, int $limit, ?int $estimatedTotal = null): array
    {
        $items = $paginator->items();
        $nextCursor = $paginator->nextCursor()?->encode();
        $prevCursor = $paginator->previousCursor()?->encode();
        $hasMore = $paginator->hasMorePages();

        return [
            'success' => true,
            'data'    => $items,
            'pagination' => [
                'mode'            => 'cursor',
                'limit'           => $limit,
                'per_page'        => $limit,
                'next_cursor'     => $nextCursor,
                'previous_cursor' => $prevCursor,
                'has_more'        => $hasMore,
                'has_next'        => $hasMore,
                'has_previous'    => $prevCursor !== null,
                // Approximate, whole-table (not filtered) -- see the comment where this is computed
                // in paginate(). Still no exact 'total' key: an exact count is precisely the cost
                // cursor mode exists to avoid, so this is deliberately a separate, clearly-named field
                // rather than something that could be mistaken for offset mode's real total.
                'estimated_total' => $estimatedTotal,
            ],
            // Top-level aliases for UI tolerance. No top-level 'total' here -- unlike offset
            // mode's real grand total, cursor mode has no cheap way to know the true row count,
            // and reporting count($items) (<= limit) under the same key name a caller might read
            // from either mode is worse than omitting it.
            'limit'   => $limit,
            'hasMore' => $hasMore,
        ];
    }
}
