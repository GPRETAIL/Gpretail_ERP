<?php

namespace App\Services;

/**
 * Sales Report business logic: filters, base queries, tax/return
 * attachment, and grand totals for the Detailed/Summary grids and the
 * CSV/Excel export. Extracted out of Reports.php (which stays the thin
 * HTTP-facing layer - reads the request, calls this service, formats the
 * JSON/CSV response) so the query logic is testable and reusable
 * independent of the controller.
 *
 * None of these methods touch $this->response/$this->setting/session -
 * only db_connect() and the global request() service - so this class has
 * no dependency on BaseController and can be constructed standalone.
 */
class SalesReportService
{
    private ?array $returnedSaleIdsCache = null;

    public function filters(): array
    {
        $request = service('request');

        $rangeIn  = trim((string) $request->getVar('Range'));
        $range1In = trim((string) $request->getVar('Range1'));

        return [
            'dateFrom' => $rangeIn  ? date('Y-m-d', strtotime($rangeIn))  : date('Y-m-d', strtotime('-30 days')),
            'dateTo'   => $range1In ? date('Y-m-d', strtotime($range1In)) : date('Y-m-d'),
            'store'    => trim((string) $request->getVar('store')),
            'customer' => $request->getVar('suppr'),
            'payment'  => trim((string) $request->getVar('selectedValues')),
            'search'   => trim((string) $request->getVar('customSearch')),
            // '', 'sales', 'exchange', 'return', or 'cancel' - see
            // applyTxnTypeFilter().
            'type'     => trim((string) $request->getVar('txnType')),
        ];
    }

    /**
     * Scopes a `sales s`-based (or returnss-joined-to-sales) builder to one
     * transaction type, matching the same Sales/Return/Exchange/Cancel
     * classification used for row highlighting (see attachTaxAndReturns()):
     * a sale is Cancel if status=3, else Return if it has a returnss row
     * with retrn_amt_mtd=1 (refund), else Exchange if it has a returnss row
     * with any other retrn_amt_mtd (swap-for-another-item), else Sales.
     *
     * $defaultExcludesCancelled controls what happens when no type is
     * selected ('' / "All"): Detailed mode wants every row visible
     * (including cancelled, so it can be highlighted) so it passes false;
     * Summary/aggregate totals want cancelled sales excluded from the
     * default "All" view like before, so they pass true.
     */
    public function applyTxnTypeFilter($builder, string $type, bool $defaultExcludesCancelled)
    {
        switch ($type) {
            case 'cancel':
                $builder->where('s.status', 3);
                break;
            case 'sales':
                $builder->where('s.status !=', 3);
                $ids = $this->getReturnedSaleIds();
                if (!empty($ids)) {
                    $builder->whereNotIn('s.id', $ids);
                }
                break;
            case 'return':
                $builder->where('s.status !=', 3)
                    ->where('s.id IN (SELECT re_sales_id FROM returnss WHERE rsale_type = 0 AND retrn_amt_mtd = 1)', null, false);
                break;
            case 'exchange':
                $builder->where('s.status !=', 3)
                    ->where('s.id IN (SELECT re_sales_id FROM returnss WHERE rsale_type = 0 AND retrn_amt_mtd != 1)', null, false);
                break;
            default:
                if ($defaultExcludesCancelled) {
                    $builder->where('s.status !=', 3);
                }
                break;
        }
        return $builder;
    }

    /**
     * All distinct sale ids that have ANY returnss row (return or exchange
     * alike), as a plain int array - memoized per request. Used by the
     * "sales" (= no return/exchange at all) branch of applyTxnTypeFilter()
     * above.
     *
     * This exists because `sales.id` is `int` but `returnss.re_sales_id` is
     * `varchar(300)`: a `WHERE s.id NOT IN (SELECT re_sales_id FROM
     * returnss ...)` subquery hits that type mismatch and MySQL falls back
     * to a dependent (correlated) subquery - ~2 seconds per call, and it
     * was being called 3+ times per request (grid rows, recordsFiltered
     * count, and the totals box), which is what made the Sales filter (and
     * the totals box on every request, regardless of filter) slow.
     * `returnss` itself only has a few hundred rows though, so fetching the
     * (small) distinct id list once and filtering with a literal
     * `whereNotIn()` avoids the subquery entirely and is fast.
     */
    public function getReturnedSaleIds(): array
    {
        if ($this->returnedSaleIdsCache === null) {
            $db = db_connect();
            $this->returnedSaleIdsCache = array_map('intval', array_column(
                $db->table('returnss')->distinct()->select('re_sales_id')->where('rsale_type', 0)->get()->getResultArray(),
                're_sales_id'
            ));
        }
        return $this->returnedSaleIdsCache;
    }

    /**
     * Base (unbounded) query for Sales Report - Detailed mode: one row per
     * sale. Deliberately does NOT join tax_summary/returnss here - joining
     * those as aggregated derived tables against the full sales range made
     * even a 25-row page take 4+ seconds (MySQL falls back to a temp
     * table + filesort for the whole matched set before applying LIMIT,
     * even though the derived tables themselves are tiny). Tax/return
     * totals for just the rows actually being displayed are fetched
     * separately by attachTaxAndReturns() below, which is a few
     * milliseconds regardless of how big the overall date range is.
     *
     * $colFilters is per-column search text keyed by the DETAILED_COLUMNS
     * index on the client (see Reports::columnSearchValues()). Columns 7
     * (Tax) and 8 (Returns) are intentionally not filterable here - they're
     * attached after pagination for the performance reason above, so
     * filtering on them would require the exact join this method exists to
     * avoid.
     */
    public function buildDetailedQuery(array $f, array $colFilters = [])
    {
        $db = db_connect();

        $builder = $db->table('sales s')
            ->select("s.id, s.created_at, s.clientname, c.name AS cust_name, st.name AS store_name, s.paidmethod, s.subtotal, s.discountamount, s.total, s.paid, s.status")
            ->join('customers c', 'c.id = s.client_id', 'left')
            ->join('registers r', 'r.id = s.register_id', 'left')
            ->join('stores st', 'st.id = r.store_id', 'left')
            ->where('s.created_at >=', $f['dateFrom'])
            ->where('s.created_at <=', $f['dateTo']);

        // Cancelled sales are no longer excluded here - Detailed mode shows
        // every row by default (Sales/Return/Exchange/Cancel alike) and
        // highlights it by type; applyTxnTypeFilter() narrows to exactly
        // one type when the left panel's Transaction Type filter is used.
        $this->applyTxnTypeFilter($builder, $f['type'], false);

        if ($f['store'] !== '') {
            $builder->where('r.store_id', $f['store']);
        }
        if ($f['customer'] !== null && $f['customer'] !== '') {
            $builder->where('s.client_id', $f['customer']);
        }
        if ($f['payment'] !== '') {
            // paidmethod stores a "~"-delimited list of payment_mode ids
            // (e.g. "1~3~"). A plain LIKE '%1%' would also match "21" or
            // "31" - wrap both sides in the delimiter so only a real,
            // whole id matches.
            $builder->where("CONCAT('~', s.paidmethod, '~') LIKE CONCAT('%~', " . (int) $f['payment'] . ", '~%')", null, false);
        }
        if ($f['search'] !== '') {
            $builder->groupStart()
                ->like('c.name', $f['search'])
                ->orLike('s.clientname', $f['search'])
                ->orLike('s.id', $f['search'])
                ->groupEnd();
        }

        $columnFieldMap = [
            0 => 's.id',
            1 => "DATE_FORMAT(s.created_at, '%d-%m-%Y')",
            2 => 'st.name',
            3 => 'COALESCE(c.name, s.clientname)',
            4 => 's.paidmethod',
            5 => 's.subtotal',
            6 => 's.discountamount',
            9 => 's.total',
            10 => 's.paid',
            11 => '(s.total - s.paid)',
        ];
        foreach ($colFilters as $i => $val) {
            if (isset($columnFieldMap[$i])) {
                $builder->like($columnFieldMap[$i], $val);
            }
        }

        return $builder;
    }

    /**
     * Fetches SUM(tax)/SUM(returns) for exactly the given sale IDs and
     * merges them into $rows (keyed by 'id'). Bounded by count($rows), so
     * this stays fast no matter how large the overall filtered date range
     * is - see note on buildDetailedQuery() above.
     *
     * Also splits returnss into return_total (retrn_amt_mtd=1, a refund)
     * vs exchange_total (any other retrn_amt_mtd, a swap-for-another-item)
     * and derives each row's 'row_type' (sales/return/exchange/cancel),
     * used both for the Status column and for highlighting the row on the
     * client - same classification as applyTxnTypeFilter() uses server-side
     * for the left panel's Transaction Type filter.
     */
    public function attachTaxAndReturns(array $rows): array
    {
        if (empty($rows)) {
            return $rows;
        }
        $db = db_connect();
        $ids = array_column($rows, 'id');

        $taxBySale = [];
        foreach ($db->table('tax_summary')->select('salesid, SUM(CAST(taxamount AS DECIMAL(12,2))) AS tax_total')->whereIn('salesid', $ids)->groupBy('salesid')->get()->getResultArray() as $t) {
            $taxBySale[$t['salesid']] = (float) $t['tax_total'];
        }

        $returnBySale = [];
        $exchangeBySale = [];
        foreach (
            $db->table('returnss')
                ->select('re_sales_id, retrn_amt_mtd, SUM(CAST(tootal AS DECIMAL(12,2))) AS ret_total')
                ->where('rsale_type', 0)
                ->whereIn('re_sales_id', $ids)
                ->groupBy('re_sales_id, retrn_amt_mtd')
                ->get()->getResultArray() as $r
        ) {
            if ((int) $r['retrn_amt_mtd'] === 1) {
                $returnBySale[$r['re_sales_id']] = ($returnBySale[$r['re_sales_id']] ?? 0) + (float) $r['ret_total'];
            } else {
                $exchangeBySale[$r['re_sales_id']] = ($exchangeBySale[$r['re_sales_id']] ?? 0) + (float) $r['ret_total'];
            }
        }

        foreach ($rows as &$row) {
            $row['tax_total'] = $taxBySale[$row['id']] ?? 0.0;
            $returnAmt = $returnBySale[$row['id']] ?? 0.0;
            $exchangeAmt = $exchangeBySale[$row['id']] ?? 0.0;
            $row['return_total'] = $returnAmt;
            $row['exchange_total'] = $exchangeAmt;
            // Combined, for the grid's existing "Returns" column.
            $row['ret_total'] = $returnAmt + $exchangeAmt;

            if ((int) ($row['status'] ?? 0) === 3) {
                $row['row_type'] = 'cancel';
            } elseif ($returnAmt > 0) {
                $row['row_type'] = 'return';
            } elseif ($exchangeAmt > 0) {
                $row['row_type'] = 'exchange';
            } else {
                $row['row_type'] = 'sales';
            }
        }

        return $rows;
    }

    /**
     * Base (unbounded) query for Sales Report - Summary mode: totals
     * aggregated per day or per month. Tax/returns are attached afterward
     * by attachPeriodTaxAndReturns() (aggregated directly by their own date
     * columns) for the same reason described on buildDetailedQuery().
     */
    public function buildSummaryQuery(array $f, string $group, array $colFilters = [])
    {
        $db = db_connect();
        $periodExpr = $group === 'monthly' ? "DATE_FORMAT(s.created_at, '%Y-%m')" : "DATE(s.created_at)";

        $builder = $db->table('sales s')
            ->select("$periodExpr AS period, COUNT(*) AS invoice_count, SUM(s.subtotal) AS subtotal, SUM(s.discountamount) AS discount, SUM(s.total) AS net_total, SUM(s.paid) AS paid")
            ->where('s.created_at >=', $f['dateFrom'])
            ->where('s.created_at <=', $f['dateTo']);

        // Unlike Detailed mode, Summary's default ('' / "All") view still
        // excludes cancelled sales from the aggregated totals (as before) -
        // there's no per-row highlighting here to make a mixed-in cancelled
        // amount visible/obvious, so silently including it would just be
        // misleading. Selecting "Cancel" explicitly still works.
        $this->applyTxnTypeFilter($builder, $f['type'], true);

        if ($f['store'] !== '') {
            $builder->where('s.register_id IN (SELECT id FROM registers WHERE store_id = ' . (int) $f['store'] . ')', null, false);
        }
        if ($f['customer'] !== null && $f['customer'] !== '') {
            $builder->where('s.client_id', $f['customer']);
        }
        if ($f['payment'] !== '') {
            // paidmethod stores a "~"-delimited list of payment_mode ids
            // (e.g. "1~3~"). A plain LIKE '%1%' would also match "21" or
            // "31" - wrap both sides in the delimiter so only a real,
            // whole id matches.
            $builder->where("CONCAT('~', s.paidmethod, '~') LIKE CONCAT('%~', " . (int) $f['payment'] . ", '~%')", null, false);
        }

        $builder->groupBy('period');

        // Global search box + per-column filters are both applied via
        // HAVING, since period/invoice_count/subtotal/etc are all
        // computed/aggregated columns once GROUP BY is in play. Tax (index
        // 4) and Returns (index 5) aren't filterable here - see the note on
        // buildDetailedQuery().
        $havingFieldMap = [
            0 => 'period',
            1 => 'invoice_count',
            2 => 'subtotal',
            3 => 'discount',
            6 => 'net_total',
            7 => 'paid',
            8 => '(net_total - paid)',
        ];
        foreach ($colFilters as $i => $val) {
            if (isset($havingFieldMap[$i])) {
                $builder->having($havingFieldMap[$i] . ' LIKE', '%' . $val . '%');
            }
        }

        if (!empty($f['search'])) {
            $builder->having('period LIKE', '%' . $f['search'] . '%');
        }

        return $builder;
    }

    /**
     * Fetches SUM(tax)/SUM(returns) grouped by the same day/month period as
     * the summary rows (using tax_summary.datedd / returnss.todate directly,
     * not a per-sale join) and merges them into $rows (keyed by 'period').
     */
    public function attachPeriodTaxAndReturns(array $rows, string $group, array $f): array
    {
        if (empty($rows)) {
            return $rows;
        }
        $db = db_connect();
        $periodExprTax = $group === 'monthly' ? "DATE_FORMAT(datedd, '%Y-%m')" : "DATE(datedd)";
        $periodExprRet = $group === 'monthly' ? "DATE_FORMAT(todate, '%Y-%m')" : "DATE(todate)";

        $taxByPeriod = [];
        foreach (
            $db->table('tax_summary')
                ->select("$periodExprTax AS period, SUM(CAST(taxamount AS DECIMAL(12,2))) AS tax_total")
                ->where('datedd >=', $f['dateFrom'])->where('datedd <=', $f['dateTo'])
                ->groupBy('period')->get()->getResultArray() as $t
        ) {
            $taxByPeriod[$t['period']] = (float) $t['tax_total'];
        }
        $retByPeriod = [];
        foreach (
            $db->table('returnss')
                ->select("$periodExprRet AS period, SUM(CAST(tootal AS DECIMAL(12,2))) AS ret_total")
                ->where('rsale_type', 0)
                ->where('todate >=', $f['dateFrom'])->where('todate <=', $f['dateTo'])
                ->groupBy('period')->get()->getResultArray() as $r
        ) {
            $retByPeriod[$r['period']] = (float) $r['ret_total'];
        }

        foreach ($rows as &$row) {
            $row['tax_total'] = $taxByPeriod[$row['period']] ?? 0.0;
            $row['ret_total'] = $retByPeriod[$row['period']] ?? 0.0;
        }

        return $rows;
    }

    /**
     * Grand totals (Sub Total / Sales / Exchange / Return / Cancel / Total)
     * across the ENTIRE filtered date range - not just the current page -
     * shown in the summary box above the grid. Six single-row aggregate
     * queries, independent of how many sales match: no per-row loop, no
     * pagination involved.
     */
    public function totals(array $f): array
    {
        $db = db_connect();

        $applyCommonFilters = function ($builder) use ($f) {
            $builder->where('s.created_at >=', $f['dateFrom'])->where('s.created_at <=', $f['dateTo']);
            if ($f['store'] !== '') {
                $builder->where('r.store_id', $f['store']);
            }
            if ($f['customer'] !== null && $f['customer'] !== '') {
                $builder->where('s.client_id', $f['customer']);
            }
            if ($f['payment'] !== '') {
                $builder->where("CONCAT('~', s.paidmethod, '~') LIKE CONCAT('%~', " . (int) $f['payment'] . ", '~%')", null, false);
            }
            if (!empty($f['search'])) {
                $builder->groupStart()
                    ->like('c.name', $f['search'])
                    ->orLike('s.clientname', $f['search'])
                    ->orWhere('s.id', $f['search'])
                    ->groupEnd();
            }
            return $builder;
        };

        // Every sub-metric below is ALSO scoped by applyTxnTypeFilter() with
        // the current $f['type'] - so if the left panel's Transaction Type
        // filter is set to (say) "Return", Sales/Exchange/Cancel all
        // naturally come back 0 (their own type condition contradicts
        // "type=return") and only Return is non-zero. With type='' ("All"),
        // each sub-metric keeps its own always-applicable definition below.
        $baseRow = $applyCommonFilters(
            $this->applyTxnTypeFilter(
                $db->table('sales s')
                    ->select('COALESCE(SUM(s.subtotal),0) AS subtotal, COALESCE(SUM(s.total),0) AS total')
                    ->join('customers c', 'c.id = s.client_id', 'left')
                    ->join('registers r', 'r.id = s.register_id', 'left')
                    ->where('s.status !=', 3),
                $f['type'],
                false
            )
        )->get()->getRowArray();

        $cancelRow = $applyCommonFilters(
            $this->applyTxnTypeFilter(
                $db->table('sales s')
                    ->select('COALESCE(SUM(s.total),0) AS cancel_total')
                    ->join('customers c', 'c.id = s.client_id', 'left')
                    ->join('registers r', 'r.id = s.register_id', 'left')
                    ->where('s.status', 3),
                $f['type'],
                false
            )
        )->get()->getRowArray();

        // Sales = non-cancelled sales with no return/exchange at all.
        // whereNotIn() with the pre-fetched id list, not a NOT IN subquery -
        // see getReturnedSaleIds() for why.
        $salesBuilder = $db->table('sales s')
            ->select('COALESCE(SUM(s.total),0) AS sales_total')
            ->join('customers c', 'c.id = s.client_id', 'left')
            ->join('registers r', 'r.id = s.register_id', 'left')
            ->where('s.status !=', 3);
        $returnedIds = $this->getReturnedSaleIds();
        if (!empty($returnedIds)) {
            $salesBuilder->whereNotIn('s.id', $returnedIds);
        }
        $salesRow = $applyCommonFilters(
            $this->applyTxnTypeFilter($salesBuilder, $f['type'], false)
        )->get()->getRowArray();

        // Return = refunds only (retrn_amt_mtd = 1).
        $returnRow = $applyCommonFilters(
            $this->applyTxnTypeFilter(
                $db->table('returnss rt')
                    ->select('COALESCE(SUM(rt.tootal),0) AS return_total')
                    ->join('sales s', 's.id = rt.re_sales_id')
                    ->join('customers c', 'c.id = s.client_id', 'left')
                    ->join('registers r', 'r.id = s.register_id', 'left')
                    ->where('rt.rsale_type', 0)
                    ->where('rt.retrn_amt_mtd', 1)
                    ->where('s.status !=', 3),
                $f['type'],
                false
            )
        )->get()->getRowArray();

        // Exchange = everything else in returnss (swap for another item,
        // not a cash refund).
        $exchangeRow = $applyCommonFilters(
            $this->applyTxnTypeFilter(
                $db->table('returnss rt')
                    ->select('COALESCE(SUM(rt.tootal),0) AS exchange_total')
                    ->join('sales s', 's.id = rt.re_sales_id')
                    ->join('customers c', 'c.id = s.client_id', 'left')
                    ->join('registers r', 'r.id = s.register_id', 'left')
                    ->where('rt.rsale_type', 0)
                    ->where('rt.retrn_amt_mtd !=', 1)
                    ->where('s.status !=', 3),
                $f['type'],
                false
            )
        )->get()->getRowArray();

        return [
            'subtotal' => (float) $baseRow['subtotal'],
            'sales'    => (float) $salesRow['sales_total'],
            'exchange' => (float) $exchangeRow['exchange_total'],
            'return'   => (float) $returnRow['return_total'],
            'cancel'   => (float) $cancelRow['cancel_total'],
            'total'    => (float) $baseRow['total'],
        ];
    }
}
