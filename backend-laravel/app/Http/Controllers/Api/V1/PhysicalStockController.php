<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PhysicalStock;
use App\Models\PhysicalStockItem;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PhysicalStockController extends Controller
{
    public function __construct(private readonly StockService $stockService)
    {
    }

    public function index(Request $request)
    {
        $query = PhysicalStock::with(['items.product', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('audit_no', 'like', "%{$search}%")->orWhere('notes', 'like', "%{$search}%");
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('audit_date', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('audit_date', 'desc')->paginate($limit);

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
            'audit_date' => 'nullable|date',
            'items'      => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);

        $audit = DB::transaction(function () use ($request, $storeId) {
            $auditNo = $request->input('audit_no') ?: 'AUD-' . date('Ymd') . '-' . rand(1000, 9999);

            $physicalStock = PhysicalStock::create([
                'store_id'   => $storeId,
                'audit_no'   => $auditNo,
                'audit_date' => $request->input('audit_date') ?: now()->toDateString(),
                'status'     => $request->input('status', 'COMPLETED'),
                'notes'      => $request->input('notes'),
                'created_by' => $request->user()?->id ?? 1,
            ]);

            foreach ($request->input('items', []) as $item) {
                $sysQty = (float) ($item['system_qty'] ?? 0);
                $countedQty = (float) ($item['counted_qty'] ?? 0);
                $diff = $countedQty - $sysQty;

                PhysicalStockItem::create([
                    'physical_stock_id' => $physicalStock->id,
                    'product_id'        => $item['product_id'],
                    'variant_id'        => $item['variant_id'] ?? null,
                    'system_qty'        => $sysQty,
                    'counted_qty'       => $countedQty,
                    'difference_qty'    => $diff,
                    'notes'             => $item['notes'] ?? null,
                ]);

                // Set stock to the counted quantity - a physical audit
                // records what's actually on the shelf, not a delta.
                if ($countedQty > 0 || $diff != 0) {
                    $this->stockService->setAbsolute(
                        storeId: (int) $storeId,
                        productId: (int) $item['product_id'],
                        variantId: isset($item['variant_id']) ? (int) $item['variant_id'] : null,
                        targetQuantity: $countedQty,
                        referenceType: 'PHYSICAL_STOCK',
                        referenceId: $physicalStock->id,
                        userId: $request->user()?->id,
                    );
                }
            }

            return $physicalStock;
        });

        return response()->json([
            'success' => true,
            'message' => 'Physical stock audit recorded successfully',
            'data'    => $audit->load('items.product'),
        ], 201);
    }

    public function show($id)
    {
        $audit = PhysicalStock::with(['items.product', 'creator'])->find($id);

        if (!$audit) {
            return response()->json([
                'success' => false,
                'message' => 'Physical stock record not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $audit,
        ]);
    }

    public function update(Request $request, $id)
    {
        $audit = PhysicalStock::find($id);

        if (!$audit) {
            return response()->json([
                'success' => false,
                'message' => 'Physical stock record not found',
            ], 404);
        }

        $audit->update($request->only(['status', 'notes']));

        return response()->json([
            'success' => true,
            'message' => 'Physical stock record updated successfully',
            'data'    => $audit->load('items.product'),
        ]);
    }

    public function destroy($id)
    {
        $audit = PhysicalStock::with('items')->find($id);

        if (!$audit) {
            return response()->json([
                'success' => false,
                'message' => 'Physical stock record not found',
            ], 404);
        }

        DB::transaction(function () use ($audit) {
            foreach ($audit->items as $item) {
                // Restore whatever the system quantity was right before
                // this audit overwrote it - the audit itself recorded that
                // value on the item, so no other reference point is needed.
                $this->stockService->setAbsolute(
                    storeId: (int) $audit->store_id,
                    productId: (int) $item->product_id,
                    variantId: $item->variant_id ? (int) $item->variant_id : null,
                    targetQuantity: (float) $item->system_qty,
                    referenceType: 'PHYSICAL_STOCK',
                    referenceId: $audit->id,
                );
            }

            $audit->items()->delete();
            $audit->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Physical stock record deleted successfully',
        ]);
    }
}
