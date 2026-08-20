<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Barcode;
use App\Models\PosReturn;
use App\Models\PosReturnItem;
use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PosReturnController extends Controller
{
    public function __construct(private readonly StockService $stockService)
    {
    }

    public function index(Request $request)
    {
        $query = PosReturn::with(['posSale', 'customer', 'items.product', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('return_no', 'like', "%{$search}%")
                  ->orWhereHas('posSale', function ($sq) use ($search) {
                      $sq->where('invoice_no', 'like', "%{$search}%");
                  });
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('return_date', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items->map(fn ($r) => $this->withDisplayReturnNo($r))->values(),
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('return_date', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => collect($paginated->items())->map(fn ($r) => $this->withDisplayReturnNo($r))->values(),
            'total'   => $paginated->total(),
            'page'    => $paginated->currentPage(),
            'limit'   => $paginated->perPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items'              => 'required|array|min:1',
            'items.*.productId' => 'required|exists:products,id',
            'items.*.qty'       => 'required|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);
        $standalone = $request->boolean('standalone');
        $sourcePosSaleId = $request->input('sourcePosSaleId');
        $itemsData = $request->input('items', []);

        // Recompute each item's returnable ceiling server-side - never
        // trust the client's maxQty for a return against a real sale.
        if (!$standalone && $sourcePosSaleId) {
            $saleItems = PosSaleItem::where('pos_sale_id', $sourcePosSaleId)->get()->keyBy('product_id');

            foreach ($itemsData as $item) {
                $qty = (float) ($item['qty'] ?? 1);
                $saleItem = $saleItems->get($item['productId']);
                $originalQty = $saleItem ? (float) $saleItem->quantity : 0;
                $alreadyReturned = (float) PosReturnItem::where('product_id', $item['productId'])
                    ->whereHas('posReturn', fn ($q) => $q->where('pos_sale_id', $sourcePosSaleId))
                    ->sum('quantity');
                $remaining = max(0, $originalQty - $alreadyReturned);

                if ($qty > $remaining + 0.0001) {
                    return response()->json([
                        'success' => false,
                        'message' => "Cannot return {$qty} of this item: only {$remaining} remains returnable from this bill.",
                    ], 422);
                }
            }
        }

        $return = DB::transaction(function () use ($request, $storeId, $standalone, $sourcePosSaleId, $itemsData) {
            $returnNo = 'RET-' . date('Ymd') . '-' . rand(1000, 9999);
            $totalRefund = 0;

            foreach ($itemsData as $item) {
                $qty = (float) ($item['qty'] ?? 1);
                $price = (float) ($item['price'] ?? 0);
                $totalRefund += ($qty * $price);
            }

            $posReturn = PosReturn::create([
                'store_id'           => $storeId,
                'pos_sale_id'        => $standalone ? null : $sourcePosSaleId,
                'customer_id'        => $request->input('customerId'),
                'return_no'          => $returnNo,
                'return_date'        => now(),
                'total_refund'       => $totalRefund,
                'refund_mode'        => $request->input('refundMode', 'CASH'),
                'status'             => 'COMPLETED',
                'created_by'         => $request->user()?->id ?? 1,
                'return_reason_id'   => $request->input('returnReasonId'),
                'return_reason_name' => $request->input('returnReasonName'),
                'standalone'         => $standalone,
            ]);

            foreach ($itemsData as $item) {
                $qty = (float) ($item['qty'] ?? 1);
                $price = (float) ($item['price'] ?? 0);
                $taxRate = (float) ($item['tax'] ?? 0);
                $subtotal = $qty * $price;

                $barcodeId = isset($item['barcodeId']) ? (int) $item['barcodeId'] : null;

                PosReturnItem::create([
                    'pos_return_id' => $posReturn->id,
                    'product_id'    => $item['productId'],
                    'variant_id'    => $item['variantId'] ?? null,
                    'barcode_id'    => $barcodeId,
                    'quantity'      => $qty,
                    'refund_price'  => $price,
                    'subtotal'      => $subtotal,
                    'tax_rate'      => $taxRate,
                    'tax_amount'    => ($subtotal * $taxRate) / 100,
                    'cost_price'    => $item['cost'] ?? null,
                    'discount'      => $item['discount'] ?? null,
                ]);

                // Locked, audited increment - also keeps available_quantity
                // in sync, which the old raw ->quantity += ... write never did.
                $this->stockService->adjust(
                    storeId: (int) $storeId,
                    productId: (int) $item['productId'],
                    variantId: isset($item['variantId']) ? (int) $item['variantId'] : null,
                    delta: $qty,
                    referenceType: 'POS_RETURN',
                    referenceId: $posReturn->id,
                    costPrice: $price,
                    userId: $request->user()?->id,
                );

                // The unit's physical label is back on the shelf and
                // sellable again - reactivate it (no-op for PACK/CUT, whose
                // shared barcode was never deactivated on sale).
                if ($barcodeId) {
                    Barcode::where('id', $barcodeId)->update(['is_active' => true]);
                }
            }

            return $posReturn;
        });

        return response()->json([
            'success' => true,
            'message' => 'POS Return processed successfully',
            'data'    => $this->withDisplayReturnNo($return->load(['posSale', 'items.product'])),
        ], 201);
    }

    private function withDisplayReturnNo(PosReturn $return): array
    {
        $data = $return->toArray();
        $data['display_return_no'] = 'RR/' . $return->id;
        $data['source_bill_no'] = $return->pos_sale_id;

        return $data;
    }

    public function show($id)
    {
        $return = PosReturn::with(['posSale', 'customer', 'items.product', 'creator'])->find($id);

        if (!$return) {
            return response()->json([
                'success' => false,
                'message' => 'POS Return not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->withDisplayReturnNo($return),
        ]);
    }

    public function nextReturnNo()
    {
        $latest = PosReturn::max('id') + 1;
        $nextNo = 'RET-' . date('Ymd') . '-' . str_pad($latest, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'data'    => $nextNo,
            'next_return_no' => $nextNo,
        ]);
    }

    public function sourceBill(Request $request)
    {
        $billNo = $request->input('billNo') ?? $request->input('bill_no') ?? $request->input('invoice_no');
        $id = (int) preg_replace('/^sb\//i', '', trim((string) $billNo));

        $sale = PosSale::with(['items.product', 'customer'])->find($id);

        if (!$sale) {
            return response()->json([
                'success' => false,
                'message' => 'Bill not found: ' . $billNo,
            ], 404);
        }

        $items = $sale->items->map(function ($item) use ($sale) {
            $returnedQty = (float) PosReturnItem::where('product_id', $item->product_id)
                ->whereHas('posReturn', fn ($q) => $q->where('pos_sale_id', $sale->id))
                ->sum('quantity');

            $originalQty = (float) $item->quantity;
            $remaining = max(0, $originalQty - $returnedQty);

            return [
                'productId'   => $item->product_id,
                'variantId'   => $item->variant_id,
                'barcodeId'   => $item->barcode_id,
                'barcode'     => $item->product?->barcode,
                'productName' => $item->product?->name,
                'qty'         => $remaining,
                'maxQty'      => $remaining,
                'originalQty' => $originalQty,
                'returnedQty' => $returnedQty,
                'price'       => (float) $item->selling_price,
                'tax'         => (float) $item->tax_rate,
                'cost'        => (float) ($item->cost_price ?? 0),
                'discount'    => (float) $item->discount,
            ];
        })->filter(fn ($i) => $i['maxQty'] > 0)->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'id'             => $sale->id,
                'billNo'         => $sale->id,
                'invoiceNo'      => $sale->invoice_no,
                'customerId'     => $sale->customer_id,
                'customerName'   => $sale->customer?->name,
                'customerMobile' => $sale->customer?->phone,
                'items'          => $items,
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
                'data'    => [
                    'standalone' => true,
                    'items'      => [[
                        'productId'   => $product->id,
                        'variantId'   => $barcodeRow->variant_id,
                        'barcodeId'   => $barcodeRow->id,
                        'barcode'     => $barcodeRow->barcode,
                        'productName' => $product->name,
                        'qty'         => 1,
                        'maxQty'      => null,
                        'price'       => (float) $barcodeRow->selling_price,
                        'tax'         => $product->tax ? (float) $product->tax->rate : 0,
                        'cost'        => (float) $product->cost_price,
                        'discount'    => 0,
                    ]],
                ],
            ]);
        }

        $product = Product::with('tax')
            ->where('barcode', $barcode)
            ->orWhere('code', $barcode)
            ->orWhere('sku', $barcode)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found for barcode ' . $barcode,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'standalone' => true,
                'items'      => [[
                    'productId'   => $product->id,
                    'variantId'   => null,
                    'barcodeId'   => null,
                    'barcode'     => $product->barcode,
                    'productName' => $product->name,
                    'qty'         => 1,
                    'maxQty'      => null,
                    'price'       => (float) $product->selling_price,
                    'tax'         => $product->tax ? (float) $product->tax->rate : 0,
                    'cost'        => (float) $product->cost_price,
                    'discount'    => 0,
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
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $raw = trim((string) $request->input('returnNo', ''));
        $id = (int) preg_replace('/^r[ro]\//i', '', $raw);

        $return = PosReturn::with('customer')
            ->where('id', $id)
            ->where('store_id', $storeId)
            ->whereNull('credit_applied_to_sale_id')
            ->first();

        if (!$return) {
            return response()->json([
                'success' => false,
                'message' => 'POS return not found or already applied',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'              => $return->id,
                'returnNo'        => $return->return_no,
                'displayReturnNo' => 'RR/' . $return->id,
                'amount'          => (float) $return->total_refund,
                'customerId'      => $return->customer_id,
                'customerName'    => $return->customer?->name,
                'customerMobile'  => $return->customer?->phone,
                'billId'          => $return->pos_sale_id,
                'items'           => $return->items()->with('product')->get()->map(fn ($i) => [
                    'productId'   => $i->product_id,
                    'productName' => $i->product?->name,
                    'qty'         => (float) $i->quantity,
                    'price'       => (float) $i->refund_price,
                ]),
            ],
        ]);
    }
}
