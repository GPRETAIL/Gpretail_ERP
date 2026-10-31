<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\Barcode;
use App\Models\InventoryEntry;
use App\Models\InventoryEntryItem;
use App\Services\GroupAggregationService;
use App\Services\PaginationService;
use App\Services\StockService;
use App\Services\VariantResolverService;
use App\Services\WarehouseInventoryForm;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InventoryEntryController extends Controller
{
    /** What the warehouse form and barcode generation read back for an entry. */
    private const DETAIL_RELATIONS = ['items.product', 'creator', 'product', 'brand', 'supplier', 'pattern', 'style', 'fit', 'sleeve', 'type', 'material', 'color'];

    public function __construct(
        private readonly StockService $stockService,
        private readonly VariantResolverService $variantResolver,
        private readonly PaginationService $paginationService,
        private readonly GroupAggregationService $groupAggregationService,
    ) {}

    private function filteredQuery(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id');
        $query = InventoryEntry::with(['items.product', 'creator'])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('store_id', $storeId));

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q->where('entry_no', 'like', "%{$search}%")->orWhere('notes', 'like', "%{$search}%"));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        // The LR workflow asks for its own entries; a requested filter must never return them all.
        if ($request->filled('transport_entry_id')) {
            $query->where('transport_entry_id', (int) $request->input('transport_entry_id'));
        }
        if ($request->filled('invoice_id')) {
            $query->where('invoice_id', (int) $request->input('invoice_id'));
        }

        return $query;
    }

    public function groupedSummary(Request $request)
    {
        $result = $this->groupAggregationService->summarize($this->filteredQuery($request), 'inventory_entries', $request);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('entry_date', 'desc')->limit(2000)->get();

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $items->count(),
            ]);
        }

        $result = $this->paginationService->paginate($query, 'inventory_entries', $request, [
            'default_sort' => 'id',
            'default_order' => 'desc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'entry_date', 'entry_no', 'status', 'created_at'],
        ]);

        return response()->json($result);
    }

    public function store(Request $request)
    {
        if (WarehouseInventoryForm::handles($request)) {
            $entry = app(WarehouseInventoryForm::class)->save($request, (int) $this->resolveStoreId($request, 1));

            return response()->json(['success' => true, 'message' => 'Inventory entry saved successfully', 'data' => $entry->load(self::DETAIL_RELATIONS)], 201);
        }
        $validator = Validator::make($request->all(), [
            'entry_date' => 'nullable|date',
            'type' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $storeId = $this->resolveStoreId($request, 1);

        $entry = DB::transaction(function () use ($request, $storeId) {
            $entryNo = $request->input('entry_no') ?: 'INV-ENT-'.date('Ymd').'-'.rand(1000, 9999);
            $itemsData = $request->input('items', []);
            $totalAmount = 0;

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['unit_price'] ?? $item['price'] ?? 0);
                $totalAmount += ($qty * $price);
            }

            $inventoryEntry = InventoryEntry::create([
                'store_id' => $storeId,
                'entry_no' => $entryNo,
                'entry_date' => $request->input('entry_date') ?: now()->toDateString(),
                'type' => $request->input('type', 'OPENING'),
                'total_amount' => $totalAmount,
                'notes' => $request->input('notes'),
                'status' => $request->input('status', 'COMPLETED'),
                'created_by' => $request->user()->id ?? 1,
            ]);

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['unit_price'] ?? $item['price'] ?? 0);
                $total = $qty * $price;
                $variantId = $this->variantResolver->resolveFromItemArray($item, (int) $item['product_id']);

                InventoryEntryItem::create([
                    'inventory_entry_id' => $inventoryEntry->id,
                    'product_id' => $item['product_id'],
                    'variant_id' => $variantId,
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'total_price' => $total,
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
            'data' => $entry->load('items.product'),
        ], 201);
    }

    public function show(int|string $id)
    {
        $entry = InventoryEntry::with(self::DETAIL_RELATIONS)->find($id);

        if (! $entry) {
            return response()->json([
                'success' => false,
                'message' => 'Inventory entry not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $entry,
        ]);
    }

    public function update(Request $request, int|string $id)
    {
        $entry = InventoryEntry::find($id);

        if (! $entry) {
            return response()->json([
                'success' => false,
                'message' => 'Inventory entry not found',
            ], 404);
        }

        if (WarehouseInventoryForm::handles($request)) {
            try {
                app(WarehouseInventoryForm::class)->save($request, (int) $entry->store_id, $entry);
            } catch (InsufficientStockException $e) {
                // Lowering a row below what has already been sold would push stock negative.
                return response()->json(['success' => false, 'message' => 'Some of this stock is already sold, so these rows cannot be reduced. '.$e->getMessage()], 422);
            }

            return response()->json(['success' => true, 'message' => 'Inventory entry updated successfully', 'data' => $entry->fresh(self::DETAIL_RELATIONS)]);
        }
        $entry->update($request->only(['status', 'notes', 'entry_date']));

        return response()->json([
            'success' => true,
            'message' => 'Inventory entry updated successfully',
            'data' => $entry->load('items.product'),
        ]);
    }

    public function destroy(int|string $id)
    {
        $entry = InventoryEntry::with('items')->find($id);

        if (! $entry) {
            return response()->json([
                'success' => false,
                'message' => 'Inventory entry not found',
            ], 404);
        }

        if (Barcode::where('inventory_entry_id', $entry->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Barcodes are already generated for this entry, so it cannot be deleted.'], 422);
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
                'message' => 'Cannot delete this entry: reversing it would take stock negative (some of it has likely already been sold or moved). '.$e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Inventory entry deleted successfully',
        ]);
    }
}
