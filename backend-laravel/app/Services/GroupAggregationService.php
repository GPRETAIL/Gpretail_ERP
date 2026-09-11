<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;

/**
 * Server-side Group By summaries -- sibling to PaginationService, same config-driven shape
 * (config('pagination.resources.{resource}.groupable_columns')), but paginates over DISTINCT
 * group values instead of rows. Exists because FilterableDataTable's client-side grouping bulk-
 * fetches a capped sample (25k/2k rows) and groups it in JS -- fine at normal scale, silently wrong
 * once a table has a real 1,000,000+ rows. This computes the true grouping in the database instead.
 */
class GroupAggregationService
{
    /**
     * @param EloquentBuilder|QueryBuilder $query Already has the caller's search/column_filters applied.
     * @return array{success:bool,data?:array,pagination?:array,meta?:array,message?:string}
     */
    public function summarize(
        EloquentBuilder|QueryBuilder $query,
        string $resource,
        Request $request
    ): array {
        $groupableColumns = config("pagination.resources.{$resource}.groupable_columns", []);
        $groupByKey = (string) $request->input('group_by', '');

        if ($groupByKey === '' || !array_key_exists($groupByKey, $groupableColumns)) {
            return [
                'success' => false,
                'message' => "Unknown or unsupported group_by column for {$resource}.",
            ];
        }

        $config = $groupableColumns[$groupByKey];
        $column = $config['column'];
        $baseTable = method_exists($query, 'getModel') ? $query->getModel()->getTable() : $query->from;

        // Cheap indexed COUNT(*) on the already-filtered query, before groupBy() reshapes it.
        $totalMatchingRows = (clone $query)->count();

        $selectColumn = "{$baseTable}.{$column} as group_value";
        $labelSelect = null;

        if (!empty($config['join']) && !empty($config['label_from'])) {
            $join = $config['join'];
            $query->leftJoin(
                $join['table'],
                "{$baseTable}.{$join['foreign']}",
                '=',
                "{$join['table']}.{$join['local']}"
            );
            // MAX(), not a bare column: {$config['label_from']} lives on the JOINED table, so
            // under ONLY_FULL_GROUP_BY (MariaDB's default) it isn't provably functionally
            // dependent on the GROUP BY column even though it's 1:1 with it in practice (every row
            // sharing a given foreign key has the identical joined label). MAX() is a real
            // aggregate, which satisfies strict mode without changing the actual grouping.
            $labelSelect = "MAX({$config['label_from']}) as group_label";
        }

        $limit = max(1, min((int) ($request->input('limit') ?? 20), 200));
        $page = max(1, (int) $request->input('page', 1));
        $sort = $request->input('group_sort') === 'label' ? 'group_value' : 'row_count';
        $direction = $sort === 'row_count' ? 'desc' : 'asc';

        $selects = array_filter([$selectColumn, $labelSelect, "COUNT(*) as row_count"]);

        $paginator = $query
            ->selectRaw(implode(', ', $selects))
            ->groupBy("{$baseTable}.{$column}")
            ->orderBy($sort, $direction)
            ->paginate($limit, ['*'], 'page', $page);

        $items = collect($paginator->items())->map(function ($row) {
            return [
                'group_value' => $row->group_value,
                'label' => $row->group_label ?? ($row->group_value === null ? '(Blank)' : (string) $row->group_value),
                'row_count' => (int) $row->row_count,
            ];
        })->values()->all();

        return [
            'success' => true,
            'data' => $items,
            'pagination' => [
                'mode' => 'offset',
                'page' => $paginator->currentPage(),
                'per_page' => $limit,
                'total' => $paginator->total(),
                'total_pages' => $paginator->lastPage(),
                'has_next' => $paginator->hasMorePages(),
                'has_previous' => $paginator->currentPage() > 1,
            ],
            'meta' => [
                'group_by' => $groupByKey,
                'total_matching_rows' => $totalMatchingRows,
            ],
        ];
    }
}
