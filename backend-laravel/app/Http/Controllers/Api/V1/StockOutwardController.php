<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\StockOutward;
use App\Models\StockOutwardItem;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class StockOutwardController extends Controller
{
    public function __construct(private readonly StockService $stockService)
    {
    }

    public function index(Request $request)
    {
        $query = StockOutward::with(['sourceStore', 'targetStore', 'items.product', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('outward_no', 'like', "%{$search}%")->orWhere('notes', 'like', "%{$search}%");
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('outward_date', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('outward_date', 'desc')->paginate($limit);

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
        $sourceStoreId = $request->header('X-Company-Scope-Id', 1);

        $validator = Validator::make($request->all(), [
            'target_store_id' => [
                'required',
                'exists:stores,id',
                function ($attribute, $value, $fail) use ($sourceStoreId) {
                    if ((string) $value === (string) $sourceStoreId) {
                        $fail('Source and target store cannot be the same.');
                    }
                },
            ],
            'outward_date'    => 'nullable|date',
            'items'           => 'required|array|min:1',
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

        try {
            $outward = DB::transaction(function () use ($request, $sourceStoreId) {
                $outwardNo = $request->input('outward_no') ?: 'OUT-' . date('Ymd') . '-' . rand(1000, 9999);

                $targetStoreId = (int) $request->input('target_store_id');

                $stockOutward = StockOutward::create([
                    'source_store_id' => $sourceStoreId,
                    'target_store_id' => $targetStoreId,
                    'outward_no'      => $outwardNo,
                    'outward_date'    => $request->input('outward_date') ?: now()->toDateString(),
                    'status'          => $request->input('status', 'DISPATCHED'),
                    'notes'           => $request->input('notes'),
                    'created_by'      => $request->user()?->id ?? 1,
                ]);

                foreach ($request->input('items', []) as $item) {
                    $qty = (float) ($item['quantity'] ?? 1);
                    $price = (float) ($item['unit_price'] ?? 0);
                    $variantId = isset($item['variant_id']) ? (int) $item['variant_id'] : null;

                    StockOutwardItem::create([
                        'stock_outward_id' => $stockOutward->id,
                        'product_id'       => $item['product_id'],
                        'variant_id'       => $item['variant_id'] ?? null,
                        'quantity'         => $qty,
                        'unit_price'       => $price,
                    ]);

                    // Decrement from source - now correctly rejects (via
                    // InsufficientStockException) instead of the previous
                    // silent max(0, ...) clamp, or silently skipping the
                    // decrement entirely (while still crediting the target)
                    // when no source stock row existed yet at all.
                    $this->stockService->adjust(
                        storeId: (int) $sourceStoreId,
                        productId: (int) $item['product_id'],
                        variantId: $variantId,
                        delta: -$qty,
                        referenceType: 'STOCK_OUTWARD',
                        referenceId: $stockOutward->id,
                        costPrice: $price,
                        userId: $request->user()?->id,
                    );

                    // Increment at target - if the source decrement above
                    // threw, this never runs (still inside the same outer
                    // transaction).
                    $this->stockService->adjust(
                        storeId: $targetStoreId,
                        productId: (int) $item['product_id'],
                        variantId: $variantId,
                        delta: $qty,
                        referenceType: 'STOCK_OUTWARD',
                        referenceId: $stockOutward->id,
                        costPrice: $price,
                        userId: $request->user()?->id,
                    );
                }

                return $stockOutward;
            });
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot dispatch this transfer: ' . $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Stock outward dispatched successfully',
            'data'    => $outward->load(['sourceStore', 'targetStore', 'items.product']),
        ], 201);
    }

    public function show($id)
    {
        $outward = StockOutward::with(['sourceStore', 'targetStore', 'items.product', 'creator'])->find($id);

        if (!$outward) {
            return response()->json([
                'success' => false,
                'message' => 'Stock outward record not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $outward,
        ]);
    }

    public function destroy($id)
    {
        $outward = StockOutward::with('items')->find($id);

        if (!$outward) {
            return response()->json([
                'success' => false,
                'message' => 'Stock outward record not found',
            ], 404);
        }

        try {
            DB::transaction(function () use ($outward) {
                foreach ($outward->items as $item) {
                    // Reverse both legs: give the source back what left it,
                    // take back what the target received. The target-side
                    // reversal is the one that can legitimately fail (the
                    // transferred stock may have already been sold or moved
                    // on from the target store).
                    $this->stockService->adjust(
                        storeId: (int) $outward->source_store_id,
                        productId: (int) $item->product_id,
                        variantId: $item->variant_id ? (int) $item->variant_id : null,
                        delta: (float) $item->quantity,
                        referenceType: 'STOCK_OUTWARD',
                        referenceId: $outward->id,
                        costPrice: (float) $item->unit_price,
                    );
                    $this->stockService->adjust(
                        storeId: (int) $outward->target_store_id,
                        productId: (int) $item->product_id,
                        variantId: $item->variant_id ? (int) $item->variant_id : null,
                        delta: -(float) $item->quantity,
                        referenceType: 'STOCK_OUTWARD',
                        referenceId: $outward->id,
                        costPrice: (float) $item->unit_price,
                    );
                }

                $outward->items()->delete();
                $outward->delete();
            });
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this transfer: the target store no longer has enough of this stock to reverse it (it has likely already been sold or moved). ' . $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Stock outward record deleted successfully',
        ]);
    }
}
