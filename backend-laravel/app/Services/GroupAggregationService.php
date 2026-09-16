<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

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

    /**
     * Bounded 2D cross-tab: rows x columns x one aggregate measure, e.g.
     * "revenue by store x month". Sibling to summarize() above, not a
     * replacement -- summarize()'s ~20 existing call sites are untouched.
     *
     * Row and column dimensions are both drawn from
     * config("pagination.resources.{resource}.pivotable_columns") -- a
     * deliberately separate, small allow-list from groupable_columns (which can
     * be high-cardinality, e.g. product name) so a pivot's two axes can never
     * multiply out to an unbounded cell count. The measure comes from
     * config("pagination.resources.{resource}.measures"), which replaces
     * summarize()'s hardcoded COUNT(*) with a caller-selectable SUM/COUNT
     * expression.
     *
     * Boundedness is structural, not just a LIMIT on the final query: the top
     * $rowLimit row values and top $colLimit column values (by total measure)
     * are found first via two cheap single-dimension queries, and the final
     * per-cell query is pre-filtered to only those values -- so the result can
     * never exceed rowLimit x colLimit cells regardless of real cardinality,
     * and every query stays an indexed GROUP BY with no unbounded in-PHP work
     * (this app runs on shared hosting with no queue worker, so aggregation
     * has to happen in the database, not by loading rows into PHP).
     *
     * @param EloquentBuilder|QueryBuilder $query Already has the caller's filters applied.
     */
    public function crossTab(
        EloquentBuilder|QueryBuilder $query,
        string $resource,
        Request $request
    ): array {
        $pivotable = config("pagination.resources.{$resource}.pivotable_columns", []);
        $measures = config("pagination.resources.{$resource}.measures", []);

        $rowKey = (string) $request->input('row_by', '');
        $colKey = (string) $request->input('column_by', '');
        $measureKey = (string) ($request->input('measure') ?: (array_key_first($measures) ?? ''));

        if ($rowKey === '' || !array_key_exists($rowKey, $pivotable)
            || $colKey === '' || !array_key_exists($colKey, $pivotable)
            || !array_key_exists($measureKey, $measures)) {
            return [
                'success' => false,
                'message' => "Unknown or unsupported row_by/column_by/measure for {$resource}.",
            ];
        }

        if ($rowKey === $colKey) {
            return ['success' => false, 'message' => 'row_by and column_by must be different dimensions.'];
        }

        $baseTable = method_exists($query, 'getModel') ? $query->getModel()->getTable() : $query->from;
        $rowConfig = $pivotable[$rowKey];
        $colConfig = $pivotable[$colKey];
        $measureConfig = $measures[$measureKey];

        $rowExpr = $this->dimensionExpr($rowConfig, $baseTable);
        $colExpr = $this->dimensionExpr($colConfig, $baseTable);
        $measureExpr = $this->measureExpr($measureConfig, $baseTable);

        $rowLimit = max(1, min((int) ($request->input('row_limit') ?? 50), 200));
        $colLimit = max(1, min((int) ($request->input('column_limit') ?? 12), 50));

        $topRows = $this->topDimensionValues((clone $query), $baseTable, $rowConfig, $measureConfig, $rowExpr, $measureExpr, $rowLimit);
        $topCols = $this->topDimensionValues((clone $query), $baseTable, $colConfig, $measureConfig, $colExpr, $measureExpr, $colLimit);

        $meta = [
            'row_by' => $rowKey,
            'column_by' => $colKey,
            'measure' => $measureKey,
            'measure_label' => $measureConfig['label'] ?? $measureKey,
        ];

        if ($topRows->isEmpty() || $topCols->isEmpty()) {
            return [
                'success' => true,
                'rows' => [], 'columns' => [], 'cells' => [],
                'rowTotals' => [], 'colTotals' => [], 'grandTotal' => 0,
                'meta' => $meta,
            ];
        }

        $rowValues = $topRows->pluck('dim_value')->all();
        $colValues = $topCols->pluck('dim_value')->all();

        $cellQuery = clone $query;
        $appliedJoins = [];
        $this->applyJoinOnce($cellQuery, $rowConfig, $baseTable, $appliedJoins);
        $this->applyJoinOnce($cellQuery, $colConfig, $baseTable, $appliedJoins);
        $this->applyJoinOnce($cellQuery, $measureConfig, $baseTable, $appliedJoins);
        $this->whereInDimension($cellQuery, $rowExpr, $rowValues);
        $this->whereInDimension($cellQuery, $colExpr, $colValues);

        $cellRows = $cellQuery
            ->selectRaw("{$rowExpr} as row_value, {$colExpr} as col_value, {$measureExpr} as measure_value")
            ->groupBy(DB::raw($rowExpr), DB::raw($colExpr))
            ->get();

        $cells = [];
        foreach ($cellRows as $cell) {
            $rk = $cell->row_value === null ? '__null__' : (string) $cell->row_value;
            $ck = $cell->col_value === null ? '__null__' : (string) $cell->col_value;
            $cells[$rk][$ck] = (float) $cell->measure_value;
        }

        $rows = $topRows->map(fn ($r) => $this->dimensionEntry($r))->values();
        $columns = $topCols->map(fn ($c) => $this->dimensionEntry($c))->values();

        $rowTotals = [];
        $colTotals = [];
        $grandTotal = 0.0;
        foreach ($rows as $r) {
            $sum = 0.0;
            foreach ($columns as $c) {
                $v = $cells[$r['key']][$c['key']] ?? 0.0;
                $sum += $v;
                $colTotals[$c['key']] = ($colTotals[$c['key']] ?? 0.0) + $v;
            }
            $rowTotals[$r['key']] = round($sum, 2);
            $grandTotal += $sum;
        }
        foreach ($colTotals as $key => $value) {
            $colTotals[$key] = round($value, 2);
        }

        return [
            'success' => true,
            'rows' => $rows,
            'columns' => $columns,
            'cells' => $cells,
            'rowTotals' => $rowTotals,
            'colTotals' => $colTotals,
            'grandTotal' => round($grandTotal, 2),
            'meta' => $meta,
        ];
    }

    private function dimensionEntry($row): array
    {
        $key = $row->dim_value === null ? '__null__' : (string) $row->dim_value;
        $label = $row->dim_label ?? ($row->dim_value === null ? '(Blank)' : (string) $row->dim_value);
        return ['key' => $key, 'value' => $row->dim_value, 'label' => (string) $label];
    }

    private function dimensionExpr(array $config, string $baseTable): string
    {
        $column = $config['column'];
        if (!empty($config['raw'])) {
            return $column;
        }
        return str_contains($column, '.') ? $column : "{$baseTable}.{$column}";
    }

    private function measureExpr(array $config, string $baseTable): string
    {
        $agg = $config['agg'] ?? 'SUM';
        $column = $config['column'];
        if (!empty($config['raw'])) {
            return "{$agg}({$column})";
        }
        if ($column === '*') {
            return "{$agg}(*)";
        }
        $qualified = str_contains($column, '.') ? $column : "{$baseTable}.{$column}";
        return "{$agg}({$qualified})";
    }

    /**
     * Applies a dimension or measure's configured join(s), skipping any join
     * table already applied this call. `join` is either a single
     * {table,foreign,local} step, or an array of such steps applied in order
     * for a multi-hop join (e.g. stocks -> products -> brands, where
     * products.brand_id isn't reachable from `stocks` directly).
     */
    private function applyJoinOnce(EloquentBuilder|QueryBuilder $query, array $config, string $baseTable, array &$appliedJoins): void
    {
        if (empty($config['join'])) {
            return;
        }
        $steps = isset($config['join'][0]) && is_array($config['join'][0]) ? $config['join'] : [$config['join']];

        foreach ($steps as $join) {
            $joinTable = $join['table'];
            if (isset($appliedJoins[$joinTable])) {
                continue;
            }
            $foreign = str_contains($join['foreign'], '.') ? $join['foreign'] : "{$baseTable}.{$join['foreign']}";
            $query->leftJoin($joinTable, $foreign, '=', "{$joinTable}.{$join['local']}");
            $appliedJoins[$joinTable] = true;
        }
    }

    /**
     * Cheap single-dimension GROUP BY: the top $limit values of one dimension
     * ranked by total measure. Used twice per crossTab() call (once for rows,
     * once for columns) to determine the bounded axis values before the more
     * expensive two-dimension cell query runs. Applies both the dimension's own
     * join and the measure's join (e.g. a `stocks` measure referencing
     * products.cost_price still needs `products` joined even when the
     * dimension being ranked here is `store`, which doesn't need it itself).
     */
    private function topDimensionValues(
        EloquentBuilder|QueryBuilder $query,
        string $baseTable,
        array $config,
        array $measureConfig,
        string $dimExpr,
        string $measureExpr,
        int $limit
    ): Collection {
        $appliedJoins = [];
        $this->applyJoinOnce($query, $config, $baseTable, $appliedJoins);
        $this->applyJoinOnce($query, $measureConfig, $baseTable, $appliedJoins);

        $selects = ["{$dimExpr} as dim_value", "{$measureExpr} as agg_value"];
        if (!empty($config['join']) && !empty($config['label_from'])) {
            $selects[] = "MAX({$config['label_from']}) as dim_label";
        }

        return $query->selectRaw(implode(', ', $selects))
            ->groupBy(DB::raw($dimExpr))
            ->orderByDesc('agg_value')
            ->limit($limit)
            ->get();
    }

    /**
     * whereIn() against a raw dimension expression (not a plain column), with
     * NULL handled separately since SQL's IN() never matches NULL even when
     * NULL is one of the listed values.
     */
    private function whereInDimension(EloquentBuilder|QueryBuilder $query, string $expr, array $values): void
    {
        $nonNull = array_values(array_filter($values, fn ($v) => $v !== null));
        $hasNull = count($nonNull) !== count($values);

        $query->where(function ($q) use ($expr, $nonNull, $hasNull) {
            if (!empty($nonNull)) {
                $placeholders = implode(',', array_fill(0, count($nonNull), '?'));
                $q->whereRaw("{$expr} IN ({$placeholders})", $nonNull);
            }
            if ($hasNull) {
                $q->orWhereRaw("{$expr} IS NULL");
            }
        });
    }
}
