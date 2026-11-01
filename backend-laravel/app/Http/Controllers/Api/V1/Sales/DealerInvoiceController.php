<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\Barcode;
use App\Models\Customer;
use App\Models\DealerInvoice;
use App\Models\DealerInvoiceItem;
use App\Models\DealerInvoiceReturn;
use App\Models\DealerInvoiceReturnItem;
use App\Models\Product;
use App\Models\Tax;
use App\Services\Documents\DocumentNumberService;
use App\Services\Inventory\StockService;
use App\Support\GroupAggregationService;
use App\Support\PaginationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Dealer (wholesale) invoices and returns. An invoice takes its goods out of stock and posts a credit sale;
 * a return brings goods back in and reverses the sale (LedgerPoster dealer_return); cancelling an invoice
 * puts its stock back and drops its voucher. Totals are recomputed here, never taken from the screen.
 */
class DealerInvoiceController extends Controller
{
    public function __construct(
        private readonly PaginationService $paginationService,
        private readonly GroupAggregationService $groupAggregationService,
        private readonly StockService $stockService,
    ) {}

    private function filteredQuery(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id');
        $query = DealerInvoice::with(['customer', 'items.product', 'creator'])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('store_id', $storeId));

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        return $query;
    }

    private function filteredReturnQuery(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id');
        $query = DealerInvoiceReturn::with(['customer', 'items.product', 'creator', 'dealerInvoice:id,invoice_no'])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('store_id', $storeId));

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('return_no', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        return $query;
    }

    public function groupedSummary(Request $request)
    {
        $result = $this->groupAggregationService->summarize($this->filteredQuery($request), 'dealer_invoices', $request);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function returnsGroupedSummary(Request $request)
    {
        $result = $this->groupAggregationService->summarize($this->filteredReturnQuery($request), 'dealer_invoice_returns', $request);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function index(Request $request)
    {
        return $this->listing($request, $this->filteredQuery($request), 'dealer_invoices', 'invoice_date', 'invoice_no');
    }

    public function returnsIndex(Request $request)
    {
        return $this->listing($request, $this->filteredReturnQuery($request), 'dealer_invoice_returns', 'return_date', 'return_no');
    }

    private function listing(Request $request, $query, string $resource, string $dateColumn, string $numberColumn): JsonResponse
    {
        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy($dateColumn, 'desc')->limit(2000)->get();

            return response()->json(['success' => true, 'data' => $items->map(fn ($doc) => $this->present($doc)), 'total' => $items->count()]);
        }

        $result = $this->paginationService->paginate($query, $resource, $request, [
            'default_sort' => 'id',
            'default_order' => 'desc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', $dateColumn, $numberColumn, 'created_at'],
        ]);
        $result['data'] = collect($result['data'])->map(fn ($doc) => $this->present($doc))->all();

        return response()->json($result);
    }

    /** The list and detail shape both dealer screens read (bill_no/return_no, dates, customer, products, qty, amount). */
    private function present(DealerInvoice|DealerInvoiceReturn $doc): array
    {
        $isReturn = $doc instanceof DealerInvoiceReturn;
        $date = $isReturn ? $doc->return_date : $doc->invoice_date;
        $stamp = $date->toDateString().' '.($doc->created_at?->format('H:i:s') ?? '00:00:00');

        return array_merge($doc->toArray(), [
            $isReturn ? 'return_no' : 'bill_no' => $isReturn ? $doc->return_no : $doc->invoice_no,
            $isReturn ? 'return_at' : 'sale_at' => $stamp,
            'customer_name' => $doc->customer?->name,
            'total_qty' => (float) $doc->items->sum('quantity'),
            'amount' => (float) $doc->grand_total,
            'items' => $doc->items->map(fn ($item) => array_merge($item->toArray(), ['product_name' => $item->product?->name]))->all(),
        ]);
    }

    public function show($id)
    {
        $invoice = DealerInvoice::with(['customer', 'items.product', 'creator', 'returns:id,dealer_invoice_id,return_no,status'])->find($id);
        if (! $invoice) {
            return response()->json(['success' => false, 'message' => 'Dealer invoice not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $this->present($invoice)]);
    }

    public function store(Request $request)
    {
        return $this->saveDocument($request, false);
    }

    public function returnsStore(Request $request)
    {
        return $this->saveDocument($request, true);
    }

    private function saveDocument(Request $request, bool $isReturn): JsonResponse
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        try {
            $lines = $this->lines($request);
            $customerId = $this->customerId($request);
            $source = $isReturn ? $this->sourceInvoice($request, $customerId, $lines) : null;
        } catch (ValidationException $e) {
            return response()->json(['success' => false, 'message' => collect($e->errors())->flatten()->first(), 'errors' => $e->errors()], 422);
        }
        $totals = $this->totals($request, $lines);

        try {
            $document = DB::transaction(function () use ($request, $storeId, $isReturn, $lines, $customerId, $source, $totals) {
                $header = [
                    'store_id' => $storeId, 'customer_id' => $customerId, 'status' => 'COMPLETED',
                    'subtotal' => $totals['subtotal'], 'discount_amount' => $totals['discount'], 'tax_amount' => $totals['tax'],
                    'other_charges' => $totals['charges'], 'grand_total' => $totals['total'],
                    'remarks' => $request->input('remarks'), 'created_by' => $request->user()?->id,
                ];
                $document = $isReturn
                    ? DealerInvoiceReturn::create($header + [
                        'return_no' => DocumentNumberService::resolve($request, $storeId, 'DRET'),
                        'dealer_invoice_id' => $source?->id,
                        'return_date' => $this->documentDate($request->input('returnAt') ?? $request->input('return_date')),
                    ])
                    : DealerInvoice::create($header + [
                        'invoice_no' => $request->input('invoice_no') ?: DocumentNumberService::resolve($request, $storeId, 'DINV'),
                        'invoice_date' => $this->documentDate($request->input('saleAt') ?? $request->input('invoice_date')),
                        'so_no' => $request->input('soNo') ?? $request->input('so_no'),
                    ]);

                foreach ($lines as $line) {
                    $row = ['product_id' => $line['product_id'], 'variant_id' => $line['variant_id'], 'barcode_id' => $line['barcode_id'],
                        'quantity' => $line['qty'], 'price' => $line['price'], 'discount' => $line['discount'],
                        'tax_amount' => $line['tax_amount'], 'total' => $line['total']];
                    $isReturn
                        ? DealerInvoiceReturnItem::create($row + ['dealer_invoice_return_id' => $document->id])
                        : DealerInvoiceItem::create($row + ['dealer_invoice_id' => $document->id]);

                    // Sale out, return in. Returned goods go back at the product's cost, like a POS return.
                    $this->stockService->adjust(
                        storeId: $storeId, productId: $line['product_id'], variantId: $line['variant_id'],
                        delta: $isReturn ? $line['qty'] : -$line['qty'],
                        referenceType: $isReturn ? 'DEALER_RETURN' : 'DEALER_INVOICE', referenceId: $document->id,
                        costPrice: $line['cost'], userId: $request->user()?->id,
                    );
                }

                return $document;
            });
        } catch (InsufficientStockException $e) {
            $name = Product::query()->whereKey($e->productId)->value('name') ?? "product {$e->productId}";

            return response()->json(['success' => false, 'message' => "Not enough stock for {$name}: {$e->available} available, {$e->requested} requested."], 422);
        }

        $document->load(['customer', 'items.product']);

        return response()->json([
            'success' => true,
            'message' => $isReturn ? 'Dealer invoice return saved' : 'Dealer invoice created successfully',
            'data' => $this->present($document),
        ], 201);
    }

    /** Cancels an invoice: its stock comes back and LedgerPoster drops its voucher (CANCELLED counts as closed). */
    public function destroy(Request $request, $id)
    {
        $invoice = DealerInvoice::with('items')->whereKey($id)->first();
        if (! $invoice) {
            return response()->json(['success' => false, 'message' => 'Dealer invoice not found'], 404);
        }
        if (strtoupper((string) $invoice->status) === 'CANCELLED') {
            return response()->json(['success' => false, 'message' => 'This dealer invoice is already cancelled.'], 422);
        }
        // Cancelling restores every invoiced unit, so goods already returned would come back twice.
        if (DealerInvoiceReturn::where('dealer_invoice_id', $invoice->id)->where('status', '!=', 'CANCELLED')->exists()) {
            return response()->json(['success' => false, 'message' => 'This invoice has returns against it, so it cannot be cancelled. Return the remaining items instead.'], 422);
        }

        DB::transaction(function () use ($invoice, $request) {
            foreach ($invoice->items as $item) {
                // Same reference as the sale, so StockService restores the original FIFO batches.
                $this->stockService->adjust(
                    storeId: (int) $invoice->store_id, productId: (int) $item->product_id,
                    variantId: $item->variant_id ? (int) $item->variant_id : null, delta: (float) $item->quantity,
                    referenceType: 'DEALER_INVOICE', referenceId: $invoice->id, userId: $request->user()?->id,
                );
            }
            $invoice->update(['status' => 'CANCELLED', 'cancelled_at' => now(), 'cancelled_by' => $request->user()?->id]);
        });

        return response()->json(['success' => true, 'message' => 'Dealer invoice cancelled and its stock restored', 'data' => $this->present($invoice->fresh(['customer', 'items.product']))]);
    }

    /**
     * Items as the screens send them (barcodeId = the printed label, qty, price, discount = whole-line discount,
     * tax = GST %) or the older shape (product_id, quantity). Each resolves to this store's product and variant.
     *
     * @return array<int, array{product_id: int, variant_id: ?int, barcode_id: ?int, qty: float, price: float, discount: float, tax_amount: float, total: float, cost: float}>
     */
    private function lines(Request $request): array
    {
        $items = $request->input('items');
        if (! is_array($items) || $items === []) {
            throw ValidationException::withMessages(['items' => 'Add at least one product.']);
        }

        $lines = [];
        foreach (array_values($items) as $i => $item) {
            $qty = (float) ($item['qty'] ?? $item['quantity'] ?? 0);
            $price = (float) ($item['price'] ?? 0);
            $discount = (float) ($item['discount'] ?? 0);
            $taxRate = (float) ($item['tax'] ?? 0);
            if ($qty <= 0 || $price < 0 || $discount < 0 || $taxRate < 0 || $taxRate > 100) {
                throw ValidationException::withMessages(["items.$i" => 'Each line needs a quantity above 0, and a price, discount and tax that are not negative.']);
            }

            $barcode = isset($item['barcodeId']) ? Barcode::find((int) $item['barcodeId']) : null;
            $productId = (int) ($barcode->product_id ?? $item['productId'] ?? $item['product_id'] ?? 0);
            $product = $productId ? Product::find($productId) : null; // Store-scoped: another store's product is not found.
            if (! $product) {
                throw ValidationException::withMessages(["items.$i" => 'Product not found in this store.']);
            }
            $variantId = $barcode->variant_id ?? $item['variantId'] ?? $item['variant_id'] ?? null;

            $subtotal = round($qty * $price, 2);
            $taxAmount = round($subtotal * $taxRate / 100, 2);
            $lines[] = [
                'product_id' => $product->id, 'variant_id' => $variantId ? (int) $variantId : null, 'barcode_id' => $barcode?->id,
                'qty' => $qty, 'price' => $price, 'discount' => round($discount, 2), 'tax_amount' => $taxAmount,
                'total' => round($subtotal + $taxAmount - $discount, 2), 'cost' => (float) ($product->cost_price ?? 0), 'subtotal' => $subtotal,
            ];
        }

        return $lines;
    }

    /** Same arithmetic as the screens: line totals + extra tax lines - tax discount - additional discount + charges. */
    private function totals(Request $request, array $lines): array
    {
        $extraTax = 0.0;
        $taxDiscount = 0.0;
        foreach ((array) $request->input('taxLines', []) as $taxLine) {
            $rate = (float) (Tax::query()->whereKey($taxLine['taxTypeId'] ?? 0)->value('rate') ?? 0);
            $value = max(0, (float) ($taxLine['taxValue'] ?? 0));
            $lineDiscount = max(0, (float) ($taxLine['taxDiscount'] ?? 0));
            $taxDiscount += $lineDiscount;
            $extraTax += round(max(0, $value - $lineDiscount) * $rate / 100, 2);
        }
        $addlDiscount = max(0, (float) $request->input('addlDiscount', 0));
        $charges = max(0, (float) $request->input('addlCharge', 0));
        $lineTotal = array_sum(array_column($lines, 'total'));

        return [
            'subtotal' => round(array_sum(array_column($lines, 'subtotal')), 2),
            'discount' => round(array_sum(array_column($lines, 'discount')) + $taxDiscount + $addlDiscount, 2),
            'tax' => round(array_sum(array_column($lines, 'tax_amount')) + $extraTax, 2),
            'charges' => round($charges, 2),
            'total' => max(0, round($lineTotal + $extraTax - $taxDiscount - $addlDiscount + $charges, 2)),
        ];
    }

    private function customerId(Request $request): int
    {
        $id = (int) ($request->input('customerId') ?? $request->input('customer_id') ?? 0);
        if (! $id || ! Customer::find($id)) {
            throw ValidationException::withMessages(['customerId' => 'Select a customer from this store.']);
        }

        return $id;
    }

    /** A return may name the invoice it reverses; then it must be that customer's, live, and not exceed what was sold. */
    private function sourceInvoice(Request $request, int $customerId, array $lines): ?DealerInvoice
    {
        $id = $request->input('dealerInvoiceId') ?? $request->input('dealer_invoice_id');
        if (! $id) {
            return null;
        }
        $invoice = DealerInvoice::with('items')->whereKey($id)->first();
        if (! $invoice || strtoupper((string) $invoice->status) === 'CANCELLED' || (int) $invoice->customer_id !== $customerId) {
            throw ValidationException::withMessages(['dealerInvoiceId' => 'That invoice is not a live invoice for this customer.']);
        }
        $returned = DealerInvoiceReturnItem::whereHas('dealerInvoiceReturn', fn ($q) => $q->where('dealer_invoice_id', $invoice->id)->where('status', '!=', 'CANCELLED'))
            ->get()->groupBy(fn ($i) => $i->product_id.':'.($i->variant_id ?: 0))->map(fn ($g) => (float) $g->sum('quantity'));
        $sold = $invoice->items->groupBy(fn ($i) => $i->product_id.':'.($i->variant_id ?: 0))->map(fn ($g) => (float) $g->sum('quantity'));
        $asked = collect($lines)->groupBy(fn ($l) => $l['product_id'].':'.($l['variant_id'] ?: 0))->map(fn ($g) => (float) $g->sum('qty'));
        foreach ($asked as $key => $qty) {
            if ($qty + ($returned[$key] ?? 0) > ($sold[$key] ?? 0) + 0.0001) {
                throw ValidationException::withMessages(['items' => 'You cannot return more than was invoiced on '.$invoice->invoice_no.'.']);
            }
        }

        return $invoice;
    }

    private function documentDate(mixed $value): string
    {
        try {
            return $value ? Carbon::parse($value)->setTimezone(config('app.business_timezone'))->toDateString() : now(config('app.business_timezone'))->toDateString();
        } catch (\Throwable) {
            return now(config('app.business_timezone'))->toDateString();
        }
    }

    public function nextBillNo(Request $request)
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        $nextNo = DocumentNumberService::peek($storeId, 'DINV');

        return response()->json([
            'success' => true,
            'data' => $nextNo,
            'next_bill_no' => $nextNo,
        ]);
    }

    public function nextReturnNo(Request $request)
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        $nextNo = DocumentNumberService::peek($storeId, 'DRET');

        return response()->json([
            'success' => true,
            'data' => $nextNo,
            'next_return_no' => $nextNo,
        ]);
    }
}
