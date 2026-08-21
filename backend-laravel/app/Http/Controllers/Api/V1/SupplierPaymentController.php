<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DirectPurchase;
use App\Models\PurchaseInvoice;
use App\Models\StockBatch;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\SupplierPaymentItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SupplierPaymentController extends Controller
{
    public function dashboardSummary(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $totalPaidMonth = (float) SupplierPayment::where('store_id', $storeId)
            ->whereMonth('payment_date', now()->month)
            ->sum('amount');

        $pendingPayables = (float) PurchaseInvoice::where('store_id', $storeId)
            ->where('payment_status', '!=', 'PAID')
            ->sum(DB::raw('grand_total - paid_amount'));

        return response()->json([
            'success' => true,
            'data'    => [
                'totalPaymentsThisMonth'   => SupplierPayment::where('store_id', $storeId)->whereMonth('payment_date', now()->month)->count(),
                'totalAmountPaidThisMonth' => $totalPaidMonth,
                'pendingPayments'          => PurchaseInvoice::where('store_id', $storeId)->where('payment_status', '!=', 'PAID')->count(),
                'totalPayables'            => $pendingPayables,
                'paidThisMonth'            => $totalPaidMonth,
                'overduePayables'          => $pendingPayables * 0.25,
                'totalSuppliers'           => Supplier::count(),
            ],
        ]);
    }

    public function index(Request $request)
    {
        $query = SupplierPayment::with(['supplier', 'store', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('payment_no', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('payment_date', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('payment_date', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => $paginated->items(),
            'total'   => $paginated->total(),
            'page'    => $paginated->currentPage(),
            'limit'   => $paginated->perPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'supplier_id'   => 'required|exists:suppliers,id',
            'amount'        => 'required|numeric|min:0.01',
            'payment_mode'  => 'nullable|string',
            'payment_date'  => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);

        $payment = DB::transaction(function () use ($request, $storeId) {
            $paymentNo = 'PAY-' . date('Ymd') . '-' . rand(1000, 9999);
            $amount = (float) $request->input('amount');

            $supplierPayment = SupplierPayment::create([
                'supplier_id'  => $request->input('supplier_id'),
                'store_id'     => $storeId,
                'payment_no'   => $paymentNo,
                'payment_date' => $request->input('payment_date') ?: now()->toDateString(),
                'amount'       => $amount,
                'payment_mode' => $request->input('payment_mode', 'BANK_TRANSFER'),
                'reference_no' => $request->input('reference_no'),
                'notes'        => $request->input('notes'),
                'created_by'   => $request->user()?->id ?? 1,
            ]);

            // If purchase invoice id provided, link payment
            if ($request->filled('purchase_invoice_id')) {
                SupplierPaymentItem::create([
                    'supplier_payment_id' => $supplierPayment->id,
                    'purchase_invoice_id' => $request->input('purchase_invoice_id'),
                    'amount_paid'         => $amount,
                ]);

                $inv = PurchaseInvoice::find($request->input('purchase_invoice_id'));
                if ($inv) {
                    $inv->paid_amount += $amount;
                    if ($inv->paid_amount >= $inv->grand_total) {
                        $inv->payment_status = 'PAID';
                    } else {
                        $inv->payment_status = 'PARTIAL';
                    }
                    $inv->save();
                }
            }

            return $supplierPayment;
        });

        return response()->json([
            'success' => true,
            'message' => 'Supplier payment recorded successfully',
            'data'    => $payment->load('supplier'),
        ], 201);
    }

    public function pending(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $search  = trim((string) $request->input('search', ''));

        $invoiceQuery = PurchaseInvoice::with('supplier')
            ->where('store_id', $storeId)
            ->where('payment_status', '!=', 'PAID');

        $directQuery = DirectPurchase::with('supplier')
            ->where('store_id', $storeId)
            ->where('payment_status', '!=', 'PAID');

        if ($search !== '') {
            $invoiceQuery->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                  ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
            $directQuery->where(function ($q) use ($search) {
                $q->where('purchase_no', 'like', "%{$search}%")
                  ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
        }

        $invoices = $invoiceQuery->orderBy('invoice_date', 'desc')->limit(2000)->get();
        $directs  = $directQuery->orderBy('purchase_date', 'desc')->limit(2000)->get();

        $rows = [];
        foreach ($invoices as $inv) {
            $total = (float) $inv->grand_total;
            $paid = (float) $inv->paid_amount;
            $rows[] = [
                'id'            => $inv->id,
                'invoice_type'  => 'invoice',
                'invoice_no'    => $inv->invoice_no,
                'supplier_name' => $inv->supplier?->name ?? 'Unknown Supplier',
                'supplier_id'   => $inv->supplier_id,
                'invoice_date'  => $inv->invoice_date,
                'total_amount'  => $total,
                'paid_amount'   => $paid,
                'balance_due'   => max(0, $total - $paid),
                'days'          => $inv->invoice_date ? (int) now()->diffInDays($inv->invoice_date, true) : 0,
                'discount_perc' => (float) ($inv->discount_amount && $total > 0 ? round($inv->discount_amount / $total * 100, 1) : 0),
                'total'         => $total,
                'paid'          => $paid,
                'balance'       => max(0, $total - $paid),
                'amount'        => $total,
            ];
        }

        foreach ($directs as $dir) {
            $total = (float) $dir->total_amount;
            $paid = (float) $dir->paid_amount;
            $rows[] = [
                'id'            => $dir->id,
                'invoice_type'  => 'direct',
                'invoice_no'    => $dir->purchase_no,
                'supplier_name' => $dir->supplier?->name ?? 'Unknown Supplier',
                'supplier_id'   => $dir->supplier_id,
                'invoice_date'  => $dir->purchase_date,
                'total_amount'  => $total,
                'paid_amount'   => $paid,
                'balance_due'   => max(0, $total - $paid),
                'days'          => $dir->purchase_date ? (int) now()->diffInDays($dir->purchase_date, true) : 0,
                'discount_perc' => (float) ($dir->discount_amount && $total > 0 ? round($dir->discount_amount / $total * 100, 1) : 0),
                'total'         => $total,
                'paid'          => $paid,
                'balance'       => max(0, $total - $paid),
                'amount'        => $total,
            ];
        }

        // Two different Eloquent models are merged into one flat list here,
        // so pagination happens in PHP over the merged+sorted array rather
        // than via a single ->paginate() call - each source query is still
        // capped and DB-filtered above, this just slices the combined page.
        usort($rows, fn ($a, $b) => strcmp((string) $b['invoice_date'], (string) $a['invoice_date']));

        $total       = count($rows);
        $totalPayable = array_sum(array_column($rows, 'balance_due'));
        $limit       = max(1, (int) $request->input('limit', 20));
        $page        = max(1, (int) $request->input('page', 1));
        $totalPages  = max((int) ceil($total / $limit), 1);
        $pagedRows   = array_slice($rows, ($page - 1) * $limit, $limit);

        return response()->json([
            'success'      => true,
            'data'         => array_values($pagedRows),
            'total'        => $total,
            'totalPayable' => $totalPayable,
            'pagination'   => [
                'total'      => $total,
                'totalPages' => $totalPages,
            ],
        ]);
    }

    public function history(Request $request)
    {
        return $this->index($request);
    }

    /**
     * Invoice-level detail for the "click an invoice number" drill-down.
     * The frontend (SupplierPayment.jsx) has always expected an
     * {invoice, lines, summary} shape - the previous version of this
     * method returned the raw Eloquent model instead, so this screen never
     * actually rendered real data. Also adds invoice-level batch tracking:
     * sold/remaining quantity and value per line, sourced from the same
     * stock_batches ledger StockService writes on every purchase/sale -
     * never derived from current product-level stock, and never merged
     * across suppliers/invoices (each batch is scoped to exactly one
     * reference_type + reference_id).
     */
    public function pendingDetails(Request $request, $type, $id)
    {
        if ($type === 'invoice') {
            $inv = PurchaseInvoice::with(['supplier', 'items.product', 'items.variant.brand', 'items.variant.size'])->find($id);
            if (!$inv) {
                return response()->json(['success' => false, 'message' => 'Purchase invoice not found'], 404);
            }

            $sellThrough = StockBatch::sellThroughByVariant('PURCHASE_INVOICE', $inv->id, $inv->items->pluck('variant_id'));

            $lines = $inv->items->map(function ($item) use ($sellThrough) {
                return $this->buildLine(
                    id: $item->id,
                    productName: $item->product?->name,
                    brandName: $item->variant?->brand?->name ?? $item->product?->brand?->name,
                    size: $item->variant?->size?->name,
                    designNo: $item->variant?->design_no,
                    rate: (float) $item->rate,
                    purchasedQty: (float) $item->quantity,
                    variantId: $item->variant_id,
                    sellThrough: $sellThrough,
                );
            })->values();

            $paid = (float) $inv->paid_amount;
            $total = (float) $inv->grand_total;

            return response()->json(['success' => true, 'data' => [
                'invoice' => [
                    'id' => $inv->id,
                    'invoice_type' => 'invoice',
                    'invoice_no' => $inv->invoice_no,
                    'supplier_name' => $inv->supplier?->name,
                    'company_name' => null,
                    'invoice_date' => $inv->invoice_date,
                    'total' => $total,
                    'tax' => (float) $inv->tax_amount,
                    'discount' => (float) $inv->discount_amount,
                    'paid' => $paid,
                    'balance' => max(0, $total - $paid),
                    'payment_amount' => $total,
                    'paid_amount' => $paid,
                    'outstanding_amount' => max(0, $total - $paid),
                ],
                'lines' => $lines,
                'summary' => $this->buildSummary($lines),
            ]]);
        }

        $dir = DirectPurchase::with(['supplier', 'items.product'])->find($id);
        if (!$dir) {
            return response()->json(['success' => false, 'message' => 'Direct purchase not found'], 404);
        }

        $sellThrough = StockBatch::sellThroughByVariant('DIRECT_PURCHASE', $dir->id, $dir->items->pluck('variant_id'));

        $lines = $dir->items->map(function ($item) use ($sellThrough) {
            return $this->buildLine(
                id: $item->id,
                productName: $item->product_name ?? $item->product?->name,
                brandName: $item->brand_name,
                size: $item->size,
                designNo: $item->design_no,
                rate: (float) $item->cost,
                purchasedQty: (float) $item->qty,
                variantId: $item->variant_id,
                sellThrough: $sellThrough,
            );
        })->values();

        $paid = (float) $dir->paid_amount;
        $total = (float) $dir->total_amount;

        return response()->json(['success' => true, 'data' => [
            'invoice' => [
                'id' => $dir->id,
                'invoice_type' => 'direct',
                'invoice_no' => $dir->invoice_no ?: $dir->purchase_no,
                'supplier_name' => $dir->supplier?->name ?? $dir->supplier_name,
                'company_name' => $dir->company_name,
                'invoice_date' => $dir->invoice_date ?: $dir->purchase_date,
                'total' => $total,
                'tax' => (float) $dir->tax_amount,
                'discount' => (float) $dir->discount_amount,
                'paid' => $paid,
                'balance' => max(0, $total - $paid),
                'payment_amount' => $total,
                'paid_amount' => $paid,
                'outstanding_amount' => max(0, $total - $paid),
            ],
            'lines' => $lines,
            'summary' => $this->buildSummary($lines),
        ]]);
    }

    private function buildLine(
        $id,
        ?string $productName,
        ?string $brandName,
        ?string $size,
        ?string $designNo,
        float $rate,
        float $purchasedQty,
        ?int $variantId,
        \Illuminate\Support\Collection $sellThrough,
    ): array {
        $through = $variantId ? $sellThrough->get($variantId) : null;
        $soldQty = $through['sold_qty'] ?? null;
        $remainingQty = $through['remaining_qty'] ?? null;
        $earliestReceivedAt = $through['earliest_received_at'] ?? null;

        $daysInStock = $earliestReceivedAt ? max(1, (int) now()->diffInDays($earliestReceivedAt, true)) : null;
        $velocity = ($soldQty !== null && $daysInStock !== null) ? round($soldQty / $daysInStock, 3) : null;
        $movementStatus = $velocity !== null ? $this->classifyMovement($velocity) : null;

        return [
            'id' => $id,
            'product_name' => $productName,
            'brand_name' => $brandName,
            'size' => $size,
            'design_no' => $designNo,
            'rate' => $rate,
            'purchased_qty' => $purchasedQty,
            'purchase_cost' => $rate,
            'purchased_value' => $purchasedQty * $rate,
            'sold_qty' => $soldQty,
            'remaining_qty' => $remainingQty,
            'remaining_stock_value' => $remainingQty !== null ? $remainingQty * $rate : null,
            'days_in_stock' => $daysInStock,
            'velocity' => $velocity,
            'movement_status' => $movementStatus,
        ];
    }

    /** Sales velocity (units sold per day since the stock was received) tiering. */
    private function classifyMovement(float $velocity): string
    {
        if ($velocity >= 1) {
            return 'FAST';
        }
        if ($velocity < 0.3) {
            return 'SLOW';
        }

        return 'MODERATE';
    }

    /**
     * Movement relaxes the sold% bar for "eligible for payment": a Fast
     * Moving item will clear its remaining stock soon even if not fully
     * sold yet, so it needs a lower sold% to be considered safe to pay;
     * a Slow Moving item needs much more of it actually sold first.
     */
    private function eligibilityThreshold(?string $movementStatus): float
    {
        return match ($movementStatus) {
            'FAST' => 0.30,
            'SLOW' => 0.70,
            default => 0.50,
        };
    }

    private function buildSummary($lines): array
    {
        $purchasedQty = (float) $lines->sum('purchased_qty');
        $soldQty = (float) $lines->sum('sold_qty');
        $remainingQty = $lines->sum('remaining_qty');
        $purchasedValue = (float) $lines->sum('purchased_value');
        $remainingStockValue = $lines->sum('remaining_stock_value');

        // Dominant movement tier = whichever tier's lines carry the most
        // purchased qty, so one odd line doesn't skew the whole invoice's
        // verdict. Falls back to null (no batch/sell-through data yet -
        // e.g. a purchase not yet Completed) rather than guessing.
        $tieredQty = $lines->filter(fn ($l) => $l['movement_status'])->groupBy('movement_status')
            ->map(fn ($group) => $group->sum('purchased_qty'));
        $movementStatus = $tieredQty->isEmpty() ? null : $tieredQty->sortDesc()->keys()->first();

        $soldPct = $purchasedQty > 0 ? $soldQty / $purchasedQty : 0;
        $threshold = $this->eligibilityThreshold($movementStatus);
        $eligible = $movementStatus !== null && $soldPct >= $threshold;

        $movementLabel = match ($movementStatus) {
            'FAST' => 'Fast Moving',
            'SLOW' => 'Slow Moving',
            'MODERATE' => 'Moderate Moving',
            default => 'No Sales Data',
        };
        $pctLabel = round($soldPct * 100) . '%';
        $reason = $movementStatus === null
            ? 'No stock movement recorded yet for this invoice.'
            : ($eligible
                ? "{$pctLabel} sold, {$movementLabel} - eligible for payment."
                : "{$pctLabel} sold, {$movementLabel} - needs " . round($threshold * 100) . "%+ sold before payment is recommended.");

        return [
            'purchased_qty' => $purchasedQty,
            'sold_qty' => $soldQty,
            'remaining_qty' => $remainingQty,
            'purchased_value' => $purchasedValue,
            'remaining_stock_value' => $remainingStockValue,
            'movement_status' => $movementStatus,
            'movement_label' => $movementLabel,
            'eligible_for_payment' => $eligible,
            'eligibility_reason' => $reason,
        ];
    }
}
