<?php

namespace App\Services\Reports;

use App\Enums\PurchaseOrderStatus;
use App\Enums\TransferStatus;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Warehouse Reports tabs that need their own rows: purchase orders against what was received, purchase tax,
 * section-wise purchases and returns, transfers between stores and the retail stock cover. Every query keeps to the
 * stores in the request's store context (a transfer belongs to both its sending and its receiving store).
 */
class WarehouseReports
{
    public const REPORTS = ['po_lines', 'po_summary', 'purchase_tax', 'purchase_tax_summary', 'section_purchase', 'section_returns',
        'cancelled_returns', 'outwards', 'outward_lines', 'stock_movement', 'pending_inward', 'pending_outward', 'retail_stock'];

    /** @param list<int> $storeIds */
    public function rows(string $report, array $storeIds): Collection
    {
        $storeIds = $storeIds ?: [0];

        return match ($report) {
            'po_lines' => $this->poLines($storeIds),
            'po_summary' => $this->poSummary($storeIds),
            'purchase_tax' => $this->purchaseTax($storeIds),
            'purchase_tax_summary' => $this->purchaseTaxSummary($storeIds),
            'section_purchase' => $this->sectionPurchase($storeIds),
            'section_returns' => $this->sectionReturns($storeIds),
            'cancelled_returns' => $this->returns($storeIds)->where('status', 'CANCELLED')->values(),
            'outwards' => $this->outwards($storeIds),
            'outward_lines' => $this->outwardLines($storeIds),
            'stock_movement' => $this->stockMovement($storeIds),
            'pending_inward' => $this->outwards($storeIds, TransferStatus::InTransit->value, 'h.target_store_id'),
            'pending_outward' => $this->outwards($storeIds, TransferStatus::InTransit->value, 'h.source_store_id'),
            'retail_stock' => $this->retailStock($storeIds),
        };
    }

    /** Every purchase order line with what has arrived (Direct Purchases received against it) and what is pending. */
    private function poLines(array $storeIds): Collection
    {
        $receipts = DB::table('direct_purchases')->whereIn('store_id', $storeIds)->whereNotNull('purchase_order_id')
            ->select('purchase_order_id', 'purchase_no', 'invoice_no')->get()->groupBy('purchase_order_id');

        return DB::table('purchase_orders as h')->whereIn('h.store_id', $storeIds)
            ->join('purchase_order_items as i', 'i.purchase_order_id', '=', 'h.id')
            ->leftJoin('suppliers as s', 's.id', '=', 'h.supplier_id')
            ->leftJoin('products as p', 'p.id', '=', 'i.product_id')
            ->leftJoin('product_variants as v', 'v.id', '=', 'i.variant_id')
            ->leftJoin('sizes as z', 'z.id', '=', 'v.size_id')
            ->select('h.id as order_id', 'h.po_no', 'h.po_date', 'h.expected_date', 'h.status', 's.name as supplier', 'p.name as product', 'p.code',
                'z.name as size', 'i.quantity', 'i.received_qty', 'i.unit_cost', 'i.amount')
            ->orderByDesc('h.po_date')->orderBy('h.po_no')->limit(20000)->get()
            ->map(function ($row) use ($receipts) {
                $open = in_array($row->status, PurchaseOrderStatus::openValues(), true);
                $pending = $open ? max(0, (float) $row->quantity - (float) $row->received_qty) : 0;

                return [
                    'po_no' => $row->po_no, 'po_date' => substr((string) $row->po_date, 0, 10), 'expected_date' => $row->expected_date ? substr((string) $row->expected_date, 0, 10) : '-',
                    'status' => $this->poStatus($row->status, (float) $row->received_qty), 'supplier' => $row->supplier ?? '-', 'product' => $row->product ?? '-', 'code' => $row->code ?? '-',
                    'size' => $row->size ?? '-', 'ordered' => (float) $row->quantity, 'received' => (float) $row->received_qty, 'pending' => $pending,
                    'unit_cost' => (float) $row->unit_cost, 'amount' => (float) $row->amount, 'pending_value' => round($pending * (float) $row->unit_cost, 2),
                    'receipts' => ($receipts[$row->order_id] ?? collect())->map(fn ($r) => $r->purchase_no.($r->invoice_no ? " ({$r->invoice_no})" : ''))->implode(', ') ?: '-',
                ];
            });
    }

    private function poSummary(array $storeIds): Collection
    {
        return $this->poLines($storeIds)->groupBy('po_no')->map(fn (Collection $lines) => [
            'po_no' => $lines->first()['po_no'], 'po_date' => $lines->first()['po_date'], 'expected_date' => $lines->first()['expected_date'],
            'supplier' => $lines->first()['supplier'], 'status' => $lines->first()['status'], 'lines' => $lines->count(),
            'ordered' => $lines->sum('ordered'), 'received' => $lines->sum('received'), 'pending' => $lines->sum('pending'),
            'amount' => round($lines->sum('amount'), 2), 'receipts' => $lines->first()['receipts'],
        ])->values();
    }

    private function poStatus(string $status, float $received): string
    {
        return match (true) {
            $status === 'APPROVED' && $received > 0 => 'Part received',
            default => ucfirst(strtolower($status)),
        };
    }

    /** Tax per bill and rate: a direct purchase's tax lines, and a purchase invoice's lines by their tax. */
    private function purchaseTax(array $storeIds): Collection
    {
        $direct = DB::table('direct_purchases as h')->whereIn('h.store_id', $storeIds)
            ->where(fn ($q) => $q->whereNull('h.invoice_workflow_status')->orWhere('h.invoice_workflow_status', '<>', 'temporary'))
            ->leftJoin('suppliers as s', 's.id', '=', 'h.supplier_id')
            ->select('h.purchase_no', 'h.invoice_no', 'h.purchase_date', 'h.tax_lines', 'h.bill_value', 'h.tax_amount', 's.name as supplier', 'h.supplier_name')
            ->orderByDesc('h.purchase_date')->limit(10000)->get()
            ->flatMap(function ($row) {
                $lines = json_decode($row->tax_lines ?? '[]', true) ?: [];
                $base = ['source' => 'Direct purchase', 'bill_no' => $row->invoice_no ?: $row->purchase_no, 'date' => substr((string) $row->purchase_date, 0, 10),
                    'supplier' => $row->supplier ?? $row->supplier_name ?? '-'];
                if (! $lines) {
                    return [[...$base, 'tax_name' => '-', 'rate' => 0.0, 'taxable' => (float) $row->bill_value, 'tax' => (float) $row->tax_amount]];
                }

                return collect($lines)->map(fn ($line) => [...$base, 'tax_name' => $line['taxTypeName'] ?? $line['tax_type_name'] ?? '-',
                    'rate' => (float) ($line['taxPerc'] ?? $line['tax_perc'] ?? 0), 'taxable' => (float) ($line['taxValue'] ?? $line['tax_value'] ?? 0),
                    'tax' => (float) ($line['taxAmount'] ?? $line['tax_amount'] ?? 0)])->all();
            });
        $invoices = DB::table('purchase_invoices as h')->whereIn('h.store_id', $storeIds)
            ->where(fn ($q) => $q->whereNull('h.status')->orWhere('h.status', '<>', 'CANCELLED'))
            ->join('purchase_invoice_items as i', 'i.purchase_invoice_id', '=', 'h.id')
            ->leftJoin('taxes as t', 't.id', '=', 'i.tax_id')
            ->leftJoin('suppliers as s', 's.id', '=', 'h.supplier_id')
            ->groupBy('h.id', 'i.tax_id')
            ->selectRaw('MAX(h.invoice_no) as bill_no, MAX(h.invoice_date) as bill_date, MAX(s.name) as supplier, MAX(t.name) as tax_name, MAX(COALESCE(t.rate, 0)) as rate,
                SUM(i.total - i.tax_amount) as taxable, SUM(i.tax_amount) as tax')
            ->limit(20000)->get()
            ->map(fn ($row) => ['source' => 'Purchase invoice', 'bill_no' => $row->bill_no, 'date' => substr((string) $row->bill_date, 0, 10), 'supplier' => $row->supplier ?? '-',
                'tax_name' => $row->tax_name ?? '-', 'rate' => (float) $row->rate, 'taxable' => round((float) $row->taxable, 2), 'tax' => round((float) $row->tax, 2)]);

        return $direct->concat($invoices)->sortByDesc('date')->values();
    }

    private function purchaseTaxSummary(array $storeIds): Collection
    {
        return $this->purchaseTax($storeIds)->groupBy(fn ($row) => number_format($row['rate'], 2))->map(fn (Collection $rows, $rate) => [
            'rate' => (float) $rate, 'bills' => $rows->pluck('bill_no')->unique()->count(),
            'taxable' => round($rows->sum('taxable'), 2), 'tax' => round($rows->sum('tax'), 2), 'total' => round($rows->sum('taxable') + $rows->sum('tax'), 2),
        ])->sortBy('rate')->values();
    }

    /** Labels printed per section (product category) and item, with the purchase they came from. */
    private function sectionPurchase(array $storeIds): Collection
    {
        return DB::table('barcodes as b')
            ->join('products as p', 'p.id', '=', 'b.product_id')
            ->whereIn('p.company_id', $storeIds)
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->leftJoin('direct_purchases as d', 'd.id', '=', 'b.direct_purchase_id')
            ->leftJoin('inventory_entries as e', 'e.id', '=', 'b.inventory_entry_id')
            ->groupBy('p.category_id', 'b.product_id')
            ->selectRaw('MAX(c.name) as section, MAX(p.name) as product, MAX(p.code) as code, COUNT(*) as barcodes,
                SUM(CASE WHEN b.direct_purchase_id IS NOT NULL THEN 1 ELSE 0 END) as from_purchase, SUM(CASE WHEN b.inventory_entry_id IS NOT NULL THEN 1 ELSE 0 END) as from_entry,
                MAX(COALESCE(b.final_price, b.selling_price, 0)) as price, MAX(COALESCE(d.purchase_date, e.entry_date)) as last_received')
            ->orderBy('section')->orderBy('product')->limit(20000)->get()
            ->map(fn ($row) => ['section' => $row->section ?? '(No section)', 'product' => $row->product, 'code' => $row->code, 'barcodes' => (int) $row->barcodes,
                'from_purchase' => (int) $row->from_purchase, 'from_entry' => (int) $row->from_entry, 'price' => (float) $row->price,
                'last_received' => $row->last_received ? substr((string) $row->last_received, 0, 10) : '-']);
    }

    private function returns(array $storeIds): Collection
    {
        return DB::table('purchase_returns as h')->whereIn('h.store_id', $storeIds)
            ->leftJoin('suppliers as s', 's.id', '=', 'h.supplier_id')
            ->select('h.return_no', 'h.return_date', 'h.status', 'h.reason', 'h.total_amount', 's.name as supplier')
            ->orderByDesc('h.return_date')->limit(10000)->get()
            ->map(fn ($row) => ['return_no' => $row->return_no, 'return_date' => substr((string) $row->return_date, 0, 10), 'supplier' => $row->supplier ?? '-',
                'reason' => $row->reason ?? '-', 'status' => $row->status, 'amount' => (float) $row->total_amount]);
    }

    private function sectionReturns(array $storeIds): Collection
    {
        return DB::table('purchase_returns as h')->whereIn('h.store_id', $storeIds)
            ->join('purchase_return_items as i', 'i.purchase_return_id', '=', 'h.id')
            ->leftJoin('products as p', 'p.id', '=', 'i.product_id')
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->groupBy('p.category_id')
            ->selectRaw('MAX(c.name) as section, COUNT(DISTINCT h.id) as returns, COUNT(DISTINCT i.product_id) as items, SUM(i.quantity) as qty, SUM(i.total) as amount')
            ->orderByDesc('amount')->get()
            ->map(fn ($row) => ['section' => $row->section ?? '(No section)', 'returns' => (int) $row->returns, 'items' => (int) $row->items,
                'qty' => (float) $row->qty, 'amount' => round((float) $row->amount, 2)]);
    }

    /** Transfers this store sent or received (optionally only those in a status, at one end). */
    private function outwards(array $storeIds, ?string $status = null, ?string $end = null): Collection
    {
        return DB::table('stock_outwards as h')
            ->where(fn ($q) => $end ? $q->whereIn($end, $storeIds) : $q->whereIn('h.source_store_id', $storeIds)->orWhereIn('h.target_store_id', $storeIds))
            ->when($status, fn ($q) => $q->where('h.status', $status))
            ->leftJoin('stores as fs', 'fs.id', '=', 'h.source_store_id')
            ->leftJoin('stores as ts', 'ts.id', '=', 'h.target_store_id')
            ->leftJoin('stock_outward_items as i', 'i.stock_outward_id', '=', 'h.id')
            ->groupBy('h.id')
            ->selectRaw('MAX(h.outward_no) as outward_no, MAX(h.outward_date) as outward_date, MAX(h.status) as status, MAX(fs.name) as from_store, MAX(ts.name) as to_store,
                MAX(h.dispatched_at) as dispatched_at, MAX(h.received_at) as received_at, COUNT(i.id) as line_count, SUM(COALESCE(i.quantity, 0)) as qty,
                SUM(COALESCE(i.received_qty, 0)) as received, SUM(COALESCE(i.quantity, 0) * COALESCE(i.unit_price, 0)) as value')
            ->orderByDesc('outward_date')->limit(10000)->get()
            ->map(fn ($row) => ['outward_no' => $row->outward_no, 'outward_date' => substr((string) $row->outward_date, 0, 10), 'from_store' => $row->from_store ?? '-',
                'to_store' => $row->to_store ?? '-', 'status' => $this->transferStatus($row->status), 'lines' => (int) $row->line_count, 'qty' => (float) $row->qty,
                'received' => (float) $row->received, 'value' => round((float) $row->value, 2),
                'dispatched_at' => $row->dispatched_at ? substr((string) $row->dispatched_at, 0, 16) : '-', 'received_at' => $row->received_at ? substr((string) $row->received_at, 0, 16) : '-']);
    }

    private function outwardLines(array $storeIds): Collection
    {
        return DB::table('stock_outwards as h')
            ->where(fn ($q) => $q->whereIn('h.source_store_id', $storeIds)->orWhereIn('h.target_store_id', $storeIds))
            ->join('stock_outward_items as i', 'i.stock_outward_id', '=', 'h.id')
            ->leftJoin('stores as fs', 'fs.id', '=', 'h.source_store_id')
            ->leftJoin('stores as ts', 'ts.id', '=', 'h.target_store_id')
            ->select('h.outward_no', 'h.outward_date', 'h.status', 'fs.name as from_store', 'ts.name as to_store', 'i.product_name', 'i.product_code', 'i.size',
                'i.design_no', 'i.quantity', 'i.received_qty', 'i.damaged_qty', 'i.unit_price')
            ->orderByDesc('h.outward_date')->limit(20000)->get()
            ->map(fn ($row) => ['outward_no' => $row->outward_no, 'outward_date' => substr((string) $row->outward_date, 0, 10), 'from_store' => $row->from_store ?? '-',
                'to_store' => $row->to_store ?? '-', 'status' => $this->transferStatus($row->status), 'product' => $row->product_name ?? '-', 'code' => $row->product_code ?? '-',
                'size' => $row->size ?: '-', 'design_no' => $row->design_no ?: '-', 'qty' => (float) $row->quantity, 'received' => (float) $row->received_qty,
                'damaged' => (float) $row->damaged_qty, 'unit_price' => (float) $row->unit_price, 'value' => round((float) $row->quantity * (float) $row->unit_price, 2)]);
    }

    /** Goods moved between each pair of stores, per item. */
    private function stockMovement(array $storeIds): Collection
    {
        return $this->outwardLines($storeIds)->where('status', '!=', 'Cancelled')->groupBy(fn ($row) => $row['from_store'].'|'.$row['to_store'].'|'.$row['code'])
            ->map(fn (Collection $rows) => ['from_store' => $rows->first()['from_store'], 'to_store' => $rows->first()['to_store'], 'product' => $rows->first()['product'],
                'code' => $rows->first()['code'], 'transfers' => $rows->pluck('outward_no')->unique()->count(), 'sent' => $rows->sum('qty'), 'received' => $rows->sum('received'),
                'in_transit' => $rows->where('status', 'In transit')->sum('qty'), 'value' => round($rows->sum('value'), 2)])
            ->sortBy([['from_store', 'asc'], ['to_store', 'asc'], ['product', 'asc']])->values();
    }

    private function transferStatus(?string $status): string
    {
        return match ($status) {
            TransferStatus::InTransit->value => 'In transit', TransferStatus::Received->value => 'Received', TransferStatus::Cancelled->value => 'Cancelled', default => (string) $status,
        };
    }

    /** Stock on hand per item against the last 30 days' sales: how many days the shelf stock lasts at that rate. */
    private function retailStock(array $storeIds): Collection
    {
        $since = now()->subDays(30)->toDateString();
        $sold = DB::table('pos_sales as s')->whereIn('s.store_id', $storeIds)->whereDate('s.sale_date', '>=', $since)
            ->where(fn ($q) => $q->whereNull('s.status')->orWhereNotIn('s.status', ['CANCELLED', 'CANCELED']))
            ->join('pos_sale_items as i', 'i.pos_sale_id', '=', 's.id')
            ->groupBy('i.product_id')->selectRaw('i.product_id, SUM(i.quantity) as qty, MAX(s.sale_date) as last_sale')->get()->keyBy('product_id');

        return DB::table('stocks as h')->whereIn('h.store_id', $storeIds)
            ->join('products as p', 'p.id', '=', 'h.product_id')
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->groupBy('h.product_id')
            ->selectRaw('h.product_id, MAX(p.name) as product, MAX(p.code) as code, MAX(c.name) as section, SUM(h.quantity) as stock, MAX(p.selling_price) as price')
            ->orderBy('product')->limit(20000)->get()
            ->map(function ($row) use ($sold) {
                $qty = (float) ($sold[$row->product_id]->qty ?? 0);
                $perDay = $qty / 30;

                return ['product' => $row->product, 'code' => $row->code, 'section' => $row->section ?? '-', 'stock' => (float) $row->stock, 'sold_30_days' => $qty,
                    'per_day' => round($perDay, 2), 'days_of_cover' => $perDay > 0 ? (int) floor((float) $row->stock / $perDay) : null,
                    'stock_value' => round((float) $row->stock * (float) $row->price, 2),
                    'last_sale' => isset($sold[$row->product_id]) ? substr((string) $sold[$row->product_id]->last_sale, 0, 10) : '-',
                    'status' => match (true) {
                        (float) $row->stock <= 0 => 'Out of stock', $perDay <= 0 => 'No sales in 30 days', (float) $row->stock / $perDay < 7 => 'Under a week', default => 'OK',
                    }];
            })->sortBy(fn ($row) => $row['days_of_cover'] ?? PHP_INT_MAX)->values();
    }
}
