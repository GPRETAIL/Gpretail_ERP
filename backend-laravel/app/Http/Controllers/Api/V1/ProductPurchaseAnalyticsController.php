<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Supplier x Product purchase analytics. No shortcut exists for this in the
 * schema -- products have no supplier_id, only purchase documents do (a
 * product can have several suppliers over time) -- so "supplier-based
 * products" is built by aggregating purchase history, not a lookup.
 *
 * Sources: Direct Purchases + Purchase Invoices only. GRNs are deliberately
 * excluded to avoid double-counting the same physical receipt when a store's
 * workflow posts both a GRN and a separate Invoice for it -- confirmed with
 * the business as the initial scope; GRNs can be folded in later once that
 * workflow is confirmed store-by-store.
 */
class ProductPurchaseAnalyticsController extends Controller
{
    private const ROW_LIMIT_DEFAULT = 50;
    private const ROW_LIMIT_MAX = 200;
    private const COL_LIMIT_DEFAULT = 12;
    private const COL_LIMIT_MAX = 50;

    /**
     * Bounded product x supplier cross-tab (or supplier x product, via
     * row_by), measured by purchased quantity or amount. Same
     * {rows,columns,cells,rowTotals,colTotals,grandTotal,meta} shape as
     * GroupAggregationService::crossTab() so the frontend PivotTable component
     * doesn't need to know which backend path produced it -- built by hand
     * here rather than through that service because the source is a two-table
     * UNION, not a single table with joins.
     */
    public function supplierProductSummary(Request $request)
    {
        $rowBy = (string) $request->input('row_by', 'product');
        if (!in_array($rowBy, ['product', 'supplier'], true)) {
            return response()->json(['success' => false, 'message' => 'row_by must be "product" or "supplier".'], 422);
        }
        $colBy = $rowBy === 'product' ? 'supplier' : 'product';

        $measure = (string) $request->input('measure', 'amount');
        if (!in_array($measure, ['amount', 'qty'], true)) {
            return response()->json(['success' => false, 'message' => 'measure must be "amount" or "qty".'], 422);
        }
        $measureColumn = $measure === 'amount' ? 'line_total' : 'qty';

        $storeId = $request->input('company_id') ?: $request->header('X-Company-Scope-Id');
        $storeId = ($storeId && $storeId !== 'all') ? $storeId : null;
        $dateFrom = $request->input('dateFrom');
        $dateTo = $request->input('dateTo');

        $rowLimit = max(1, min((int) ($request->input('row_limit') ?? self::ROW_LIMIT_DEFAULT), self::ROW_LIMIT_MAX));
        $colLimit = max(1, min((int) ($request->input('column_limit') ?? self::COL_LIMIT_DEFAULT), self::COL_LIMIT_MAX));

        $buildUnified = fn () => $this->unifiedPurchaseQuery($storeId, $dateFrom, $dateTo);

        $rowDim = $rowBy === 'product' ? 'product_id' : 'supplier_key';
        $rowLabel = $rowBy === 'product' ? 'product_label' : 'supplier_label';
        $colDim = $colBy === 'product' ? 'product_id' : 'supplier_key';
        $colLabel = $colBy === 'product' ? 'product_label' : 'supplier_label';
        $measureExpr = "SUM(u.{$measureColumn})";

        $topRows = DB::query()->fromSub($buildUnified(), 'u')
            ->selectRaw("u.{$rowDim} as dim_value, MAX(u.{$rowLabel}) as dim_label, {$measureExpr} as agg_value")
            ->groupBy("u.{$rowDim}")
            ->orderByDesc('agg_value')
            ->limit($rowLimit)
            ->get();

        $topCols = DB::query()->fromSub($buildUnified(), 'u')
            ->selectRaw("u.{$colDim} as dim_value, MAX(u.{$colLabel}) as dim_label, {$measureExpr} as agg_value")
            ->groupBy("u.{$colDim}")
            ->orderByDesc('agg_value')
            ->limit($colLimit)
            ->get();

        $meta = [
            'row_by' => $rowBy,
            'column_by' => $colBy,
            'measure' => $measure,
            'measure_label' => $measure === 'amount' ? 'Purchase Amount' : 'Qty',
        ];

        if ($topRows->isEmpty() || $topCols->isEmpty()) {
            return response()->json([
                'success' => true,
                'rows' => [], 'columns' => [], 'cells' => [],
                'rowTotals' => [], 'colTotals' => [], 'grandTotal' => 0,
                'meta' => $meta,
            ]);
        }

        $rowValues = $topRows->pluck('dim_value')->all();
        $colValues = $topCols->pluck('dim_value')->all();

        $cellRows = DB::query()->fromSub($buildUnified(), 'u')
            ->whereIn("u.{$rowDim}", $rowValues)
            ->whereIn("u.{$colDim}", $colValues)
            ->selectRaw("u.{$rowDim} as row_value, u.{$colDim} as col_value, {$measureExpr} as measure_value")
            ->groupBy("u.{$rowDim}", "u.{$colDim}")
            ->get();

        $cells = [];
        foreach ($cellRows as $cell) {
            $cells[(string) $cell->row_value][(string) $cell->col_value] = (float) $cell->measure_value;
        }

        $entry = fn ($row) => [
            'key' => (string) $row->dim_value,
            'value' => $row->dim_value,
            'label' => $row->dim_label !== null ? (string) $row->dim_label : (string) $row->dim_value,
        ];
        $rows = $topRows->map($entry)->values();
        $columns = $topCols->map($entry)->values();

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

        return response()->json([
            'success' => true,
            'rows' => $rows,
            'columns' => $columns,
            'cells' => $cells,
            'rowTotals' => $rowTotals,
            'colTotals' => $colTotals,
            'grandTotal' => round($grandTotal, 2),
            'meta' => $meta,
        ]);
    }

    /**
     * Drill-down: one product's raw purchase-document lines (Direct Purchases +
     * Purchase Invoices), newest first -- what a pivot cell expands into.
     */
    public function productPurchaseHistory(Request $request, int $productId)
    {
        $storeId = $request->input('company_id') ?: $request->header('X-Company-Scope-Id');
        $storeId = ($storeId && $storeId !== 'all') ? $storeId : null;

        $direct = DB::table('direct_purchase_items as dpi')
            ->join('direct_purchases as dp', 'dp.id', '=', 'dpi.direct_purchase_id')
            ->leftJoin('suppliers as s1', 's1.id', '=', 'dp.supplier_id')
            ->where('dpi.product_id', $productId)
            ->when($storeId, fn ($q) => $q->where('dp.store_id', $storeId))
            ->selectRaw("
                'direct_purchase' as source,
                dp.id as document_id,
                dp.purchase_no as document_no,
                dp.purchase_date as document_date,
                COALESCE(s1.name, CONCAT(dp.supplier_name, ' (unmatched)')) as supplier_label,
                dpi.quantity as qty,
                dpi.total_price as line_total
            ");

        $invoice = DB::table('purchase_invoice_items as pii')
            ->join('purchase_invoices as pi', 'pi.id', '=', 'pii.purchase_invoice_id')
            ->join('suppliers as s2', 's2.id', '=', 'pi.supplier_id')
            ->where('pii.product_id', $productId)
            ->when($storeId, fn ($q) => $q->where('pi.store_id', $storeId))
            ->selectRaw("
                'purchase_invoice' as source,
                pi.id as document_id,
                pi.invoice_no as document_no,
                pi.invoice_date as document_date,
                s2.name as supplier_label,
                pii.quantity as qty,
                pii.total as line_total
            ");

        $rows = $direct->unionAll($invoice)
            ->orderByDesc('document_date')
            ->limit(200)
            ->get();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    /**
     * Direct Purchases UNION ALL Purchase Invoices, item-level, flattened to a
     * common shape: {product_id, product_label, supplier_key, supplier_label,
     * qty, line_total}. `direct_purchases.supplier_id` (a real FK that exists
     * but isn't used for grouping on the list-page config, which groups by the
     * denormalized supplier_name string instead) is used here as the join key,
     * not supplier_name -- fixing that inconsistency for this report. Rows with
     * a NULL supplier_id (legacy free-text-only entries) fall back to a
     * synthetic `legacy:<name>` bucket instead of being silently dropped, so
     * the data-quality gap is visible rather than hidden.
     */
    private function unifiedPurchaseQuery($storeId, $dateFrom, $dateTo)
    {
        $direct = DB::table('direct_purchase_items as dpi')
            ->join('direct_purchases as dp', 'dp.id', '=', 'dpi.direct_purchase_id')
            ->join('products as p1', 'p1.id', '=', 'dpi.product_id')
            ->leftJoin('suppliers as s1', 's1.id', '=', 'dp.supplier_id')
            ->when($storeId, fn ($q) => $q->where('dp.store_id', $storeId))
            ->when($dateFrom, fn ($q) => $q->whereDate('dp.purchase_date', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('dp.purchase_date', '<=', $dateTo))
            ->selectRaw("
                dpi.product_id as product_id,
                p1.name as product_label,
                COALESCE(CAST(dp.supplier_id AS CHAR), CONCAT('legacy:', dp.supplier_name)) as supplier_key,
                COALESCE(s1.name, CONCAT(dp.supplier_name, ' (unmatched)')) as supplier_label,
                dpi.quantity as qty,
                dpi.total_price as line_total
            ");

        $invoice = DB::table('purchase_invoice_items as pii')
            ->join('purchase_invoices as pi', 'pi.id', '=', 'pii.purchase_invoice_id')
            ->join('products as p2', 'p2.id', '=', 'pii.product_id')
            ->join('suppliers as s2', 's2.id', '=', 'pi.supplier_id')
            ->when($storeId, fn ($q) => $q->where('pi.store_id', $storeId))
            ->when($dateFrom, fn ($q) => $q->whereDate('pi.invoice_date', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('pi.invoice_date', '<=', $dateTo))
            ->selectRaw("
                pii.product_id as product_id,
                p2.name as product_label,
                CAST(pi.supplier_id AS CHAR) as supplier_key,
                s2.name as supplier_label,
                pii.quantity as qty,
                pii.total as line_total
            ");

        return $direct->unionAll($invoice);
    }
}
