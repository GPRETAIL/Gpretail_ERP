<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Support\BusinessDay;
use App\Exceptions\PosReturnNotReturnableException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StorePosReturnRequest;
use App\Models\Barcode;
use App\Models\PosReturn;
use App\Models\PosReturnItem;
use App\Models\PosSale;
use App\Models\Product;
use App\Services\Documents\DocumentNumberService;
use App\Services\Pos\PosReturnWriter;
use App\Support\GroupAggregationService;
use App\Support\PaginationService;
use Illuminate\Http\Request;

class PosReturnController extends Controller
{
    public function __construct(
        private readonly PaginationService $paginationService,
        private readonly GroupAggregationService $groupAggregationService,
    ) {}

    private function filteredQuery(Request $request)
    {
        $query = PosReturn::with(['posSale', 'customer', 'items.product', 'creator']);

        // Same gap PurchaseInvoiceController had: never scoped by store, so every
        // store's returns were returned regardless of X-Company-Scope-Id.
        $storeId = $request->header('X-Company-Scope-Id');
        if ($storeId && $storeId !== 'all') {
            $query->where('store_id', $storeId);
        }

        if ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween('return_date', BusinessDay::range($request->input('from'), $request->input('to')));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('return_no', 'like', "%{$search}%")
                    ->orWhereHas('posSale', function ($sq) use ($search) {
                        $sq->where('invoice_no', 'like', "%{$search}%");
                    });
            });
        }

        return $query;
    }

    public function groupedSummary(Request $request)
    {
        $result = $this->groupAggregationService->summarize($this->filteredQuery($request), 'pos_returns', $request);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('return_date', 'desc')->limit(2000)->get();

            return response()->json([
                'success' => true,
                'data' => $items->map(fn ($r) => $this->withDisplayReturnNo($r))->values(),
                'total' => $items->count(),
            ]);
        }

        $result = $this->paginationService->paginate($query, 'pos_returns', $request, [
            'default_sort' => 'id',
            'default_order' => 'desc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'return_date', 'return_no', 'grand_total', 'created_at'],
        ]);

        $result['data'] = collect($result['data'])->map(fn ($r) => $this->withDisplayReturnNo($r))->values();

        return response()->json($result);
    }

    public function store(StorePosReturnRequest $request)
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        try {
            $return = app(PosReturnWriter::class)->write($request, $storeId, [
                'standalone' => $request->boolean('standalone'),
                'sourcePosSaleId' => $request->input('sourcePosSaleId'),
                'items' => $request->input('items', []),
                'customerId' => $request->input('customerId'),
                'refundMode' => $request->input('refundMode', 'CASH'),
                'returnReasonId' => $request->input('returnReasonId'),
                'returnReasonName' => $request->input('returnReasonName'),
                'approvalToken' => $request->input('approvalToken'),
            ]);
        } catch (PosReturnNotReturnableException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'POS Return processed successfully',
            'data' => $this->withDisplayReturnNo($return->load(['posSale', 'items.product'])),
        ], 201);
    }

    private function withDisplayReturnNo(PosReturn $return): array
    {
        $data = $return->toArray();
        $data['display_return_no'] = 'RR/'.$return->id;
        $data['source_bill_no'] = $return->pos_sale_id;

        return $data;
    }

    public function show($id)
    {
        $return = PosReturn::with(['posSale', 'customer', 'items.product', 'creator'])->find($id);

        if (! $return) {
            return response()->json([
                'success' => false,
                'message' => 'POS Return not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->withDisplayReturnNo($return),
        ]);
    }

    public function nextReturnNo(Request $request)
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        $nextNo = DocumentNumberService::peek($storeId, 'RET');

        return response()->json([
            'success' => true,
            'data' => $nextNo,
            'next_return_no' => $nextNo,
        ]);
    }

    public function sourceBill(Request $request)
    {
        $billNo = $request->input('billNo') ?? $request->input('bill_no') ?? $request->input('invoice_no');
        $matches = PosSale::with(['items.product', 'customer'])->billNumber((string) $billNo)->get();
        abort_if($matches->count() > 1, 422, 'Select a store before looking up this bill number.');
        $sale = $matches->first();

        if (! $sale) {
            return response()->json([
                'success' => false,
                'message' => 'Bill not found: '.$billNo,
            ], 404);
        }

        $items = $sale->items->map(function ($item) use ($sale) {
            $returnedQty = (float) PosReturnItem::where('product_id', $item->product_id)
                ->whereHas('posReturn', fn ($q) => $q->where('pos_sale_id', $sale->id))
                ->sum('quantity');

            $originalQty = (float) $item->quantity;
            $remaining = max(0, $originalQty - $returnedQty);

            return [
                'productId' => $item->product_id,
                'variantId' => $item->variant_id,
                'barcodeId' => $item->barcode_id,
                'barcode' => $item->product?->barcode,
                'productName' => $item->product?->name,
                'qty' => $remaining,
                'maxQty' => $remaining,
                'originalQty' => $originalQty,
                'returnedQty' => $returnedQty,
                'price' => (float) $item->selling_price,
                'tax' => (float) $item->tax_rate,
                'cost' => (float) ($item->cost_price ?? 0),
                'discount' => (float) $item->discount,
            ];
        })->filter(fn ($i) => $i['maxQty'] > 0)->values();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $sale->id,
                'billNo' => $sale->bill_no,
                'invoiceNo' => $sale->invoice_no,
                'customerId' => $sale->customer_id,
                'customerName' => $sale->customer?->name,
                'customerMobile' => $sale->customer?->phone,
                'items' => $items,
            ],
        ]);
    }

    public function sourceByBarcode(Request $request)
    {
        $barcode = $request->input('barcode');

        // Not filtered by is_active - a standalone return is precisely the
        // case where a PIECE unit's barcode was deactivated when it sold;
        // scanning it here to return it is expected to find it regardless.
        $barcodeRow = Barcode::where('barcode', $barcode)->with(['product.tax', 'variant'])->first();

        if ($barcodeRow && $barcodeRow->product) {
            $product = $barcodeRow->product;

            return response()->json([
                'success' => true,
                'data' => [
                    'standalone' => true,
                    'items' => [[
                        'productId' => $product->id,
                        'variantId' => $barcodeRow->variant_id,
                        'barcodeId' => $barcodeRow->id,
                        'barcode' => $barcodeRow->barcode,
                        'productName' => $product->name,
                        'qty' => 1,
                        'maxQty' => null,
                        'price' => (float) $barcodeRow->selling_price,
                        'tax' => $product->tax ? (float) $product->tax->rate : 0,
                        'cost' => (float) $product->cost_price,
                        'discount' => 0,
                    ]],
                ],
            ]);
        }

        $product = Product::with('tax')
            ->where(fn ($q) => $q->where('barcode', $barcode)->orWhere('code', $barcode)->orWhere('sku', $barcode))
            ->first();

        if (! $product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found for barcode '.$barcode,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'standalone' => true,
                'items' => [[
                    'productId' => $product->id,
                    'variantId' => null,
                    'barcodeId' => null,
                    'barcode' => $product->barcode,
                    'productName' => $product->name,
                    'qty' => 1,
                    'maxQty' => null,
                    'price' => (float) $product->selling_price,
                    'tax' => $product->tax ? (float) $product->tax->rate : 0,
                    'cost' => (float) $product->cost_price,
                    'discount' => 0,
                ]],
            ],
        ]);
    }

    public function returnProductBarcode(Request $request)
    {
        return $this->sourceByBarcode($request);
    }

    public function lookupCredit(Request $request)
    {
        $storeId = $this->resolveStoreId($request, 1);
        $raw = trim((string) $request->input('returnNo', ''));
        $id = (int) preg_replace('/^r[ro]\//i', '', $raw);

        $return = PosReturn::with('customer')
            ->where('id', $id)
            ->where('store_id', $storeId)
            ->whereNull('credit_applied_to_sale_id')
            ->first();

        if (! $return) {
            return response()->json([
                'success' => false,
                'message' => 'POS return not found or already applied',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $return->id,
                'returnNo' => $return->return_no,
                'displayReturnNo' => 'RR/'.$return->id,
                'amount' => (float) $return->total_refund,
                'customerId' => $return->customer_id,
                'customerName' => $return->customer?->name,
                'customerMobile' => $return->customer?->phone,
                'billId' => $return->pos_sale_id,
                'items' => $return->items()->with('product')->get()->map(fn ($i) => [
                    'productId' => $i->product_id,
                    'productName' => $i->product?->name,
                    'qty' => (float) $i->quantity,
                    'price' => (float) $i->refund_price,
                ]),
            ],
        ]);
    }
}
