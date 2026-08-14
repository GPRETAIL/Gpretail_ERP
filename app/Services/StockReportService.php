<?php

namespace App\Services;

/**
 * Closing Stock Report business logic: filters, the paginated base
 * products query, and the batch stock-ledger computation (Initial/
 * Opening/Purchase/Sales/Cancel/Return/Closing/Value). Extracted out of
 * Reports.php, same reasoning as SalesReportService - the controller
 * stays the thin HTTP-facing layer, this class holds the queries.
 *
 * Ledger formula preserved exactly from the original per-row-loop
 * version this replaced: Initial (stock_transfer tyoftrans=5) / Opening
 * (Initial + stocks.type=0) / Purchase+Sales+Cancel+Return ("between
 * range") / Closing (Initial minus sales plus purchase/cancel/return,
 * cumulative "till end date"). See attachLedger() for the batch
 * GROUP BY queries that replaced the original ~16-queries-per-product-row
 * approach.
 */
class StockReportService
{
    public function filters(): array
    {
        $request = service('request');
        $start = trim((string) $request->getPost('start'));
        $end   = trim((string) $request->getPost('endd'));

        return [
            'start' => $start !== '' ? date('Y-m-d', strtotime($start)) : date('Y-m-d'),
            'end'   => $end !== '' ? date('Y-m-d', strtotime($end)) : date('Y-m-d'),
            // '' means "All stores" - a real cross-store aggregate (no
            // store filter applied), not a fallback to the session store.
            'store' => trim((string) $request->getPost('storesSelect')),
        ];
    }

    /**
     * Client column index -> DB column, for the columns backed directly by
     * `products` (orderable/searchable via SQL). The ledger columns
     * (Initial/Opening/Purchase/Sales/Cancel/Return/Closing/Value) are
     * computed after pagination (see attachLedger()), so they're
     * intentionally absent here.
     */
    public function columnMap(): array
    {
        return [0 => 'pr.id', 1 => 'pr.code', 2 => 'pr.name'];
    }

    public function buildBaseQuery(string $search, array $colFilters = [])
    {
        $db = db_connect();
        $columns = $this->columnMap();

        $builder = $db->table('products pr')->select('pr.id, pr.code, pr.name, pr.price');

        if ($search !== '') {
            $builder->groupStart()
                ->like('pr.name', $search)
                ->orLike('pr.code', $search)
                ->orWhere('pr.id', $search)
                ->groupEnd();
        }
        foreach ($colFilters as $i => $val) {
            if (isset($columns[$i])) {
                $builder->like($columns[$i], $val);
            }
        }

        return $builder;
    }

    /**
     * SUM($sumCol) grouped by $idCol, scoped to $ids and (optionally) a
     * store, returned as [product_id => total]. $whereTriples is a list of
     * [column, operator, value] applied as additional WHERE clauses (e.g.
     * the tyoftrans/cancel_status/date-range conditions each ledger metric
     * needs) - always via the query builder's parameter binding, never
     * string-interpolated.
     */
    public function groupedLedgerSum(string $table, string $idCol, string $sumCol, array $ids, string $storeCol, string $store, array $whereTriples = []): array
    {
        if (empty($ids)) {
            return [];
        }
        $db = db_connect();
        $builder = $db->table($table)
            ->select("$idCol as pid, SUM($sumCol) as total")
            ->whereIn($idCol, $ids)
            ->groupBy($idCol);

        if ($store !== '') {
            $builder->where($storeCol, $store);
        }
        foreach ($whereTriples as [$col, $op, $val]) {
            $builder->where("$col $op", $val);
        }

        $out = [];
        foreach ($builder->get()->getResultArray() as $r) {
            $out[(int) $r['pid']] = (float) $r['total'];
        }
        return $out;
    }

    /**
     * Attaches the full stock ledger (Initial/Opening/Purchase/Sales/
     * Cancel/Return/Closing/Value) to each row in $rows, for the given
     * date-range/store filters. Exactly 10 grouped queries total,
     * regardless of how many rows are in $rows (bounded by page size).
     */
    public function attachLedger(array $rows, array $f): array
    {
        if (empty($rows)) {
            return $rows;
        }
        $ids = array_map('intval', array_column($rows, 'id'));
        $store = $f['store'];
        $start = $f['start'];
        $end   = $f['end'];

        $initial          = $this->groupedLedgerSum('stock_transfer', 'pro_id', 'qty', $ids, 'store_id', $store, [['tyoftrans', '=', 5]]);
        $initialStocksT0  = $this->groupedLedgerSum('stocks', 'product_id', 'quantity', $ids, 'store_id', $store, [['type', '=', 0]]);
        $purchaseBetween  = $this->groupedLedgerSum('stock_transfer', 'pro_id', 'qty', $ids, 'store_id', $store, [['tyoftrans', '=', 1], ['date', '>=', $start], ['date', '<=', $end]]);
        $salesBetween     = $this->groupedLedgerSum('sale_items', 'product_id', 'qt', $ids, 'store_irrdd', $store, [['date', '>=', $start], ['date', '<=', $end]]);
        $cancelBetween    = $this->groupedLedgerSum('sale_items', 'product_id', 'qt', $ids, 'store_irrdd', $store, [['cancel_status', '=', 1], ['date', '>=', $start], ['date', '<=', $end]]);
        $returnBetween    = $this->groupedLedgerSum('retunn_items', 'prodd_ids', 'sl_newqt', $ids, 'store_idsi', $store, [['to_datte', '>=', $start], ['to_datte', '<=', $end]]);
        $salesTillEnd     = $this->groupedLedgerSum('sale_items', 'product_id', 'qt', $ids, 'store_irrdd', $store, [['date', '<=', $end]]);
        $purchaseTillEnd  = $this->groupedLedgerSum('stock_transfer', 'pro_id', 'qty', $ids, 'store_id', $store, [['tyoftrans', '=', 1], ['date', '<=', $end]]);
        $cancelTillEnd    = $this->groupedLedgerSum('sale_items', 'product_id', 'qt', $ids, 'store_irrdd', $store, [['cancel_status', '=', 1], ['date', '<=', $end]]);
        $returnTillEnd    = $this->groupedLedgerSum('retunn_items', 'prodd_ids', 'sl_newqt', $ids, 'store_idsi', $store, [['to_datte', '<=', $end]]);

        foreach ($rows as &$row) {
            $id = (int) $row['id'];
            $initialQty = $initial[$id] ?? 0;

            $row['initial']  = $initialQty;
            $row['opening']  = $initialQty + ($initialStocksT0[$id] ?? 0);
            $row['purchase'] = $purchaseBetween[$id] ?? 0;
            $row['sales']    = $salesBetween[$id] ?? 0;
            $row['cancel']   = $cancelBetween[$id] ?? 0;
            $row['return']   = $returnBetween[$id] ?? 0;
            $row['closing']  = $initialQty - ($salesTillEnd[$id] ?? 0) + ($purchaseTillEnd[$id] ?? 0) + ($cancelTillEnd[$id] ?? 0) + ($returnTillEnd[$id] ?? 0);
            $row['value']    = $row['closing'] * (float) $row['price'];
        }
        unset($row);

        return $rows;
    }
}
