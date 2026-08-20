<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\InventoryEntry;
use App\Models\InventoryEntryItem;
use App\Services\StockService;
use App\Services\VariantResolverService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InventoryEntryController extends Controller
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly VariantResolverService $variantResolver,
    ) {
    }

    public function index(Request $request)
    {
        $query = InventoryEntry::with(['items.product', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('entry_no', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('entry_date', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('entry_date', 'desc')->paginate($limit);

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
            'entry_date' => 'nullable|date',
            'type'       => 'nullable|string',
            'items'      => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);

        $entry = DB::transaction(function () use ($request, $storeId) {
            $entryNo = $request->input('entry_no') ?: 'INV-ENT-' . date('Ymd') . '-' . rand(1000, 9999);
            $itemsData = $request->input('items', []);
            $totalAmount = 0;

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['unit_price'] ?? $item['price'] ?? 0);
                $totalAmount += ($qty * $price);
            }

            $inventoryEntry = InventoryEntry::create([
                'store_id'     => $storeId,
                'entry_no'     => $entryNo,
                'entry_date'   => $request->input('entry_date') ?: now()->toDateString(),
                'type'         => $request->input('type', 'OPENING'),
                'total_amount' => $totalAmount,
                'notes'        => $request->input('notes'),
                'status'       => $request->input('status', 'COMPLETED'),
                'created_by'   => $request->user()?->id ?? 1,
            ]);

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['unit_price'] ?? $item['price'] ?? 0);
                $total = $qty * $price;
                $variantId = $this->variantResolver->resolveFromItemArray($item, (int) $item['product_id']);

                InventoryEntryItem::create([
                    'inventory_entry_id' => $inventoryEntry->id,
                    'product_id'         => $item['product_id'],
                    'variant_id'         => $variantId,
                    'quantity'           => $qty,
                    'unit_price'         => $price,
                    'total_price'        => $total,
                ]);

                $this->stockService->adjust(
                    storeId: (int) $storeId,
                    productId: (int) $item['product_id'],
                    variantId: $variantId,
                    delta: $qty,
                    referenceType: 'INVENTORY_ENTRY',
                    referenceId: $inventoryEntry->id,
                    costPrice: $price,
                    userId: $request->user()?->id,
                );
            }

            return $inventoryEntry;
        });

        return response()->json([
            'success' => true,
            'message' => 'Inventory entry created successfully',
            'data'    => $entry->load('items.product'),
        ], 201);
    }

    public function show($id)
    {
        $entry = InventoryEntry::with(['items.product', 'creator'])->find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Inventory entry not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $entry,
        ]);
    }

    public function update(Request $request, $id)
    {
        $entry = InventoryEntry::find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Inventory entry not found',
            ], 404);
        }

        $entry->update($request->only(['status', 'notes', 'entry_date']));

        return response()->json([
            'success' => true,
            'message' => 'Inventory entry updated successfully',
            'data'    => $entry->load('items.product'),
        ]);
    }

    public function destroy($id)
    {
        $entry = InventoryEntry::with('items')->find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Inventory entry not found',
            ], 404);
        }

        try {
            DB::transaction(function () use ($entry) {
                foreach ($entry->items as $item) {
                    $this->stockService->adjust(
                        storeId: (int) $entry->store_id,
                        productId: (int) $item->product_id,
                        variantId: $item->variant_id ? (int) $item->variant_id : null,
                        delta: -(float) $item->quantity,
                        referenceType: 'INVENTORY_ENTRY',
                        referenceId: $entry->id,
                        costPrice: (float) $item->unit_price,
                    );
                }

                $entry->items()->delete();
                $entry->delete();
            });
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this entry: reversing it would take stock negative (some of it has likely already been sold or moved). ' . $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Inventory entry deleted successfully',
        ]);
    }
}
