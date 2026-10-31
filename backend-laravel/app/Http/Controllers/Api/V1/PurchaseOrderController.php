<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Services\DocumentNumberService;
use App\Services\ReorderService;
use App\Services\StoreQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Purchase orders: DRAFT (editable; the reorder engine drafts them) -> APPROVED (ordered from the
 * supplier) -> CLOSED, or CANCELLED. Records are per store, through the usual store scope.
 */
class PurchaseOrderController extends Controller
{
    private const RELATIONS = ['supplier:id,name,phone,email,gstin', 'creator:id,name', 'approver:id,name', 'items.product:id,name,code', 'items.variant.size:id,name'];

    public function index(Request $request)
    {
        $orders = PurchaseOrder::with(['supplier:id,name', 'creator:id,name', 'approver:id,name'])->withCount('items')
            ->when($request->filled('status'), fn ($q) => $q->where('status', strtoupper($request->input('status'))))
            ->orderByDesc('id')->limit(2000)->get();

        return response()->json(['success' => true, 'data' => $orders, 'total' => $orders->count()]);
    }

    public function show(int|string $id)
    {
        return response()->json(['success' => true, 'data' => $this->find($id)->load(self::RELATIONS)]);
    }

    public function store(Request $request)
    {
        $storeId = $this->selectedStore($request);
        $data = $this->validated($request);
        $order = DB::transaction(function () use ($request, $storeId, $data) {
            $order = PurchaseOrder::create([
                'store_id' => $storeId, 'po_no' => DocumentNumberService::resolve($request, $storeId, 'PO'), 'supplier_id' => $data['supplier_id'] ?? null,
                'po_date' => $data['po_date'] ?? now()->toDateString(), 'expected_date' => $data['expected_date'] ?? null, 'notes' => $data['notes'] ?? null,
                'status' => 'DRAFT', 'source' => 'MANUAL', 'created_by' => $request->user()?->id,
            ]);
            $this->replaceLines($order, $data['items']);

            return $order;
        });

        return response()->json(['success' => true, 'message' => 'Purchase order saved as draft.', 'data' => $order->load(self::RELATIONS)], 201);
    }

    public function update(Request $request, int|string $id)
    {
        $order = $this->find($id);
        $this->expect($order, ['DRAFT'], 'Only a draft purchase order can be edited.');
        $data = $this->validated($request);
        DB::transaction(function () use ($order, $data) {
            $order->update(array_intersect_key($data, array_flip(['supplier_id', 'po_date', 'expected_date', 'notes'])));
            $this->replaceLines($order, $data['items']);
        });

        return response()->json(['success' => true, 'message' => 'Purchase order updated.', 'data' => $order->fresh(self::RELATIONS)]);
    }

    /** The order is placed with the supplier; it can no longer be edited. */
    public function approve(Request $request, int|string $id)
    {
        $order = $this->find($id);
        $this->expect($order, ['DRAFT'], 'Only a draft purchase order can be approved.');
        if (! $order->supplier_id) {
            throw ValidationException::withMessages(['supplier_id' => 'Choose a supplier before approving.']);
        }
        if (! $order->items()->exists()) {
            throw ValidationException::withMessages(['items' => 'Add at least one item before approving.']);
        }
        $order->update(['status' => 'APPROVED', 'approved_by' => $request->user()?->id, 'approved_at' => now()]);

        return response()->json(['success' => true, 'message' => "{$order->po_no} approved.", 'data' => $order->fresh(self::RELATIONS)]);
    }

    public function cancel(int|string $id)
    {
        $order = $this->find($id);
        $this->expect($order, PurchaseOrder::OPEN, 'Only an open purchase order can be cancelled.');
        $order->update(['status' => 'CANCELLED', 'cancelled_at' => now()]);

        return response()->json(['success' => true, 'message' => "{$order->po_no} cancelled.", 'data' => $order->fresh(self::RELATIONS)]);
    }

    /** Goods received (or the order is otherwise finished); it stops counting as stock on order. */
    public function close(int|string $id)
    {
        $order = $this->find($id);
        $this->expect($order, ['APPROVED'], 'Only an approved purchase order can be closed.');
        $order->update(['status' => 'CLOSED', 'closed_at' => now()]);

        return response()->json(['success' => true, 'message' => "{$order->po_no} closed.", 'data' => $order->fresh(self::RELATIONS)]);
    }

    public function destroy(int|string $id)
    {
        $order = $this->find($id);
        $this->expect($order, ['DRAFT'], 'Only a draft purchase order can be deleted; cancel an approved one instead.');
        $order->delete();

        return response()->json(['success' => true, 'message' => 'Draft purchase order deleted.']);
    }

    /** Reorder Status: items at or below their reorder level in the selected store. */
    public function suggestions(Request $request, ReorderService $reorder)
    {
        return response()->json(['success' => true, 'data' => $reorder->suggestions($this->selectedStore($request))]);
    }

    /** "Generate now": the same drafting the nightly job does, for the selected store. */
    public function generate(Request $request, ReorderService $reorder)
    {
        $created = $reorder->generate($this->selectedStore($request), $request->user()?->id);

        return response()->json(['success' => true, 'message' => $created->isEmpty() ? 'Nothing needs reordering right now.' : $created->count().' draft purchase order(s) prepared.',
            'data' => $created->map->load(['supplier:id,name'])->values()]);
    }

    private function selectedStore(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id');
        if (! $storeId) {
            throw ValidationException::withMessages(['store' => 'Select a store first; reordering works one store at a time.']);
        }

        return $storeId;
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'supplier_id' => 'nullable|integer', 'po_date' => 'nullable|date', 'expected_date' => 'nullable|date', 'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer', 'items.*.variant_id' => 'nullable|integer',
            'items.*.quantity' => 'required|numeric|gt:0', 'items.*.unit_cost' => 'nullable|numeric|min:0', 'items.*.notes' => 'nullable|string|max:255',
        ]);
        // Every reference must belong to this store (other stores' masters are never visible).
        if (! empty($data['supplier_id']) && ! StoreQuery::table('suppliers')->where('id', $data['supplier_id'])->exists()) {
            throw ValidationException::withMessages(['supplier_id' => 'Select a supplier of this store.']);
        }
        $products = array_unique(array_column($data['items'], 'product_id'));
        if (StoreQuery::table('products')->whereIn('id', $products)->count() !== count($products)) {
            throw ValidationException::withMessages(['items' => 'Every item must be a product of this store.']);
        }

        return $data;
    }

    private function replaceLines(PurchaseOrder $order, array $lines): void
    {
        $order->items()->delete();
        foreach ($lines as $line) {
            $cost = (float) ($line['unit_cost'] ?? 0);
            PurchaseOrderItem::create([
                'purchase_order_id' => $order->id, 'product_id' => $line['product_id'], 'variant_id' => $line['variant_id'] ?? null,
                'quantity' => $line['quantity'], 'unit_cost' => $cost, 'amount' => round((float) $line['quantity'] * $cost, 2), 'notes' => $line['notes'] ?? null,
            ]);
        }
        $order->refreshTotals();
    }

    private function expect(PurchaseOrder $order, array $statuses, string $message): void
    {
        if (! in_array($order->status, $statuses, true)) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }

    /** By key (stable across a store's local server and the cloud) or by id, within the store scope. */
    private function find(int|string $id): PurchaseOrder
    {
        return PurchaseOrder::where(Str::isUuid((string) $id) ? 'uuid' : 'id', $id)->firstOrFail();
    }
}
