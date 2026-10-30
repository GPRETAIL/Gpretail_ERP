<?php

namespace App\Services;

use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

class DashboardMetricHistory
{
    public static function trend(float $current, float $previous, string $label = 'vs previous period'): array
    {
        if ($previous == 0 && $current != 0) {
            return ['direction' => 'new', 'changePercent' => null, 'message' => 'No percentage baseline (previous value 0)', 'label' => $label];
        }
        $change = $previous == 0 ? 0 : round(($current - $previous) / abs($previous) * 100, 1);

        return ['direction' => $change == 0 ? 'flat' : ($change > 0 ? 'up' : 'down'),
            'changePercent' => abs($change), 'label' => $label];
    }

    /**
     * Compare current, authorized store totals with each store's last recorded day in the
     * previous calendar month. Snapshots are observations, never reconstructed history.
     * All-store comparisons require a baseline for every included store.
     *
     * @param  array<int>  $storeIds
     * @param  array<int, int|numeric-string>  $employeeTotals
     * @param  array<int, float|numeric-string>  $stockValues
     */
    public function compareAndRecord(array $storeIds, array $employeeTotals, array $stockValues): array
    {
        $unavailable = ['direction' => 'unavailable', 'changePercent' => null, 'message' => 'Last-month snapshot unavailable'];
        $result = ['employees' => $unavailable, 'stockValue' => $unavailable];
        if ($storeIds === [] || app(StoreSchema::class)->columns('dashboard_metric_snapshots') === []) {
            return $result;
        }
        $employeeTotals = array_intersect_key($employeeTotals, array_flip($storeIds));
        $stockValues = array_intersect_key($stockValues, array_flip($storeIds));
        $now = now();
        $month = $now->copy()->subMonthNoOverflow();
        $latest = DB::table('dashboard_metric_snapshots')->select('store_id')
            ->selectRaw('MAX(snapshot_date) as snapshot_date')
            ->whereIn('store_id', $storeIds)
            ->whereBetween('snapshot_date', [$month->copy()->startOfMonth()->toDateString(), $month->copy()->endOfMonth()->toDateString()])
            ->groupBy('store_id');
        $previous = DB::table('dashboard_metric_snapshots as snapshots')
            ->joinSub($latest, 'latest', fn (JoinClause $join) => $join->on('snapshots.store_id', '=', 'latest.store_id')
                ->on('snapshots.snapshot_date', '=', 'latest.snapshot_date'))
            ->get(['snapshots.store_id', 'snapshots.active_employees', 'snapshots.stock_value']);

        // A single batched write keeps the cost constant as the number of stores grows.
        // Refreshes update today's observation only; past dates are never overwritten.
        $rows = [];
        foreach ($storeIds as $id) {
            $rows[] = ['store_id' => $id, 'snapshot_date' => $now->toDateString(),
                'active_employees' => (int) ($employeeTotals[$id] ?? 0), 'stock_value' => (float) ($stockValues[$id] ?? 0),
                'created_at' => $now, 'updated_at' => $now];
        }
        DB::table('dashboard_metric_snapshots')->upsert($rows, ['store_id', 'snapshot_date'], ['active_employees', 'stock_value', 'updated_at']);

        if ($previous->count() === count($storeIds)) {
            $label = 'vs last month (recorded)';
            $result['employees'] = self::trend((float) array_sum($employeeTotals), (float) $previous->sum('active_employees'), $label);
            $result['stockValue'] = self::trend((float) array_sum($stockValues), (float) $previous->sum('stock_value'), $label);
        }

        return $result;
    }
}
