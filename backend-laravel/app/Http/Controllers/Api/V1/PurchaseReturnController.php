<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Models\Stock;
use App\Models\Supplier;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PurchaseReturnController extends Controller
{
    public function __construct(private readonly StockService $stockService)
    {
    }

    public function index(Request $request)
    {
        $query = PurchaseReturn::with(['supplier', 'items.product', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('return_no', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('return_date', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('return_date', 'desc')->paginate($limit);

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
            'supplier_id' => 'nullable|exists:suppliers,id',
            'return_date' => 'nullable|date',
            'items'       => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);

        try {
            $return = DB::transaction(function () use ($request, $storeId) {
                $supplierId = $request->input('supplier_id');
                if (!$supplierId) {
                    $defaultSupplier = Supplier::first();
                    $supplierId = $defaultSupplier ? $defaultSupplier->id : 1;
                }

                $returnNo = $request->input('return_no') ?: 'PRET-' . date('Ymd') . '-' . rand(1000, 9999);
                $itemsData = $request->input('items', []);
                $totalAmount = 0;

                foreach ($itemsData as $item) {
                    $qty = (float) ($item['quantity'] ?? 1);
                    $rate = (float) ($item['rate'] ?? $item['cost_price'] ?? 0);
                    $totalAmount += ($qty * $rate);
                }

                $purchaseReturn = PurchaseReturn::create([
                    'store_id'     => $storeId,
                    'supplier_id'  => $supplierId,
                    'return_no'    => $returnNo,
                    'return_date'  => $request->input('return_date') ?: now()->toDateString(),
                    'total_amount' => $totalAmount,
                    'reason'       => $request->input('reason'),
                    'status'       => 'COMPLETED',
                    'created_by'   => $request->user()?->id ?? 1,
                ]);

                foreach ($itemsData as $item) {
                    $qty = (float) ($item['quantity'] ?? 1);
                    $rate = (float) ($item['rate'] ?? $item['cost_price'] ?? 0);
                    $total = $qty * $rate;

                    PurchaseReturnItem::create([
                        'purchase_return_id' => $purchaseReturn->id,
                        'product_id'         => $item['product_id'],
                        'variant_id'         => $item['variant_id'] ?? null,
                        'quantity'           => $qty,
                        'rate'               => $rate,
                        'tax_amount'         => $item['tax_amount'] ?? 0,
                        'total'              => $total,
                    ]);

                    // A return sends stock back to the supplier - decrement,
                    // and reject (via InsufficientStockException) rather
                    // than the previous silent max(0, ...) clamp if there
                    // isn't actually that much on hand (or, previously,
                    // silently skip entirely with no stock change AND no
                    // audit row if no stock row existed yet at all).
                    $this->stockService->adjust(
                        storeId: (int) $storeId,
                        productId: (int) $item['product_id'],
                        variantId: isset($item['variant_id']) ? (int) $item['variant_id'] : null,
                        delta: -$qty,
                        referenceType: 'PURCHASE_RETURN',
                        referenceId: $purchaseReturn->id,
                        costPrice: $rate,
                        userId: $request->user()?->id,
                    );
                }

                return $purchaseReturn;
            });
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot record this return: ' . $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Purchase return recorded successfully',
            'data'    => $return->load(['supplier', 'items.product']),
        ], 201);
    }

    public function show($id)
    {
        $return = PurchaseReturn::with(['supplier', 'items.product', 'creator'])->find($id);

        if (!$return) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase return not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $return,
        ]);
    }

    public function destroy($id)
    {
        $return = PurchaseReturn::with('items')->find($id);

        if (!$return) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase return not found',
            ], 404);
        }

        DB::transaction(function () use ($return) {
            foreach ($return->items as $item) {
                // Reversing a return gives stock back - always a safe
                // increment, can't throw InsufficientStockException.
                $this->stockService->adjust(
                    storeId: (int) $return->store_id,
                    productId: (int) $item->product_id,
                    variantId: $item->variant_id ? (int) $item->variant_id : null,
                    delta: (float) $item->quantity,
                    referenceType: 'PURCHASE_RETURN',
                    referenceId: $return->id,
                    costPrice: (float) $item->rate,
                );
            }

            $return->items()->delete();
            $return->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Purchase return deleted successfully',
        ]);
    }

    public function stockSearch(Request $request)
    {
        $search = $request->input('search') ?? $request->input('q') ?? '';
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $stocks = Stock::with(['product.brand', 'product.category', 'product.tax'])
            ->where('store_id', $storeId)
            ->whereHas('product', function ($q) use ($search) {
                if ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('barcode', 'like', "%{$search}%");
                }
            })
            ->limit(20)
            ->get();

        $data = $stocks->map(function ($s) {
            return [
                'product_id'    => $s->product_id,
                'name'          => $s->product?->name,
                'code'          => $s->product?->code,
                'barcode'       => $s->product?->barcode,
                'unit'          => $s->product?->unit,
                'cost_price'    => $s->product?->cost_price,
                'selling_price' => $s->product?->selling_price,
                'mrp'           => $s->product?->mrp,
                'quantity'      => $s->quantity,
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }
}
