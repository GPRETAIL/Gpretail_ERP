<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\StockOutward;
use App\Models\StockOutwardItem;
use App\Models\Store;
use App\Services\DocumentNumberService;
use App\Services\PaginationService;
use App\Services\StockService;
use App\Services\StoreContext;
use App\Services\StoreTransferMapper;
use App\Services\VariantResolverService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Store-to-store transfers: dispatch takes stock out of the source and leaves it in transit;
 * the target store receives what actually arrived (shortage and damage are recorded, only good
 * stock is added). A transfer in transit can be cancelled, which returns the stock to the source.
 */
class StockOutwardController extends Controller
{
    private const RELATIONS = ['sourceStore:id,name,code', 'targetStore:id,name,code', 'items.product:id,name,code', 'items.variant', 'creator:id,name', 'receiver:id,name'];

    public function __construct(
        private readonly StockService $stockService,
        private readonly VariantResolverService $variantResolver,
        private readonly PaginationService $paginationService,
    ) {}

    public function index(Request $request)
    {
        $stores = $this->accessibleStoreIds($request);
        $storeId = $request->header('X-Company-Scope-Id');
        $scope = $storeId && $storeId !== 'all' && in_array((int) $storeId, $stores, true) ? [(int) $storeId] : $stores;
        $direction = $request->input('direction');
        $query = StockOutward::with(self::RELATIONS)->where(fn ($q) => match ($direction) {
            'incoming' => $q->whereIn('target_store_id', $scope),
            'outgoing' => $q->whereIn('source_store_id', $scope),
            default => $q->whereIn('source_store_id', $scope)->orWhereIn('target_store_id', $scope),
        });

        if ($request->filled('status')) {
            $query->where('status', strtoupper($request->input('status')));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q->where('outward_no', 'like', "%{$search}%")->orWhere('notes', 'like', "%{$search}%"));
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('outward_date', 'desc')->orderByDesc('id')->limit(2000)->get();

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $items->count(),
            ]);
        }

        $paginated = $this->paginationService->paginate($query, 'stock_outwards', $request, [
            'default_sort' => 'id',
            'default_order' => 'desc',
            'allowed_sorts' => ['id', 'outward_date', 'outward_no', 'status', 'created_at'],
        ]);

        return response()->json($paginated);
    }

    /** Stores of the same company this store can send to (names only; their data stays private). */
    public function destinations(Request $request)
    {
        $source = Store::find($this->resolveStoreId($request, 1));

        return response()->json(['success' => true, 'data' => $this->siblings($source)->get(['id', 'name', 'code'])]);
    }

    public function store(Request $request)
    {
        $sourceStoreId = $this->resolveStoreId($request, 1);
        $siblings = $this->siblings(Store::find($sourceStoreId))->pluck('id')->map(fn ($id) => (int) $id)->all();

        $validator = Validator::make($request->all(), [
            'target_store_id' => [
                'required',
                'exists:stores,id',
                function ($attribute, $value, $fail) use ($sourceStoreId, $siblings) {
                    if ((string) $value === (string) $sourceStoreId) {
                        $fail('Source and target store cannot be the same.');
                    } elseif (! in_array((int) $value, $siblings, true)) {
                        $fail('Transfers can only go to another active store of the same company.');
                    }
                },
            ],
            'transfer_key' => 'nullable|uuid',
            'outward_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // A retried, double-clicked or replayed dispatch carries the same key: return that transfer.
        $key = $request->input('transfer_key');
        if ($key && ($existing = StockOutward::where('uuid', $key)->where('source_store_id', $sourceStoreId)->first())) {
            return response()->json(['success' => true, 'message' => 'Transfer already dispatched.', 'data' => $existing->load(self::RELATIONS)]);
        }

        try {
            $outward = DB::transaction(function () use ($request, $sourceStoreId, $key) {
                $stockOutward = StockOutward::create([
                    'uuid' => $key,
                    'source_store_id' => $sourceStoreId,
                    'target_store_id' => (int) $request->input('target_store_id'),
                    'outward_no' => $request->input('outward_no') ?: DocumentNumberService::resolve($request, (int) $sourceStoreId, 'TRF'),
                    'outward_date' => $request->input('outward_date') ?: now()->toDateString(),
                    'status' => StockOutward::IN_TRANSIT,
                    'dispatched_at' => now(),
                    'notes' => $request->input('notes'),
                    'created_by' => $request->user()->id ?? 1,
                ]);

                foreach ($request->input('items', []) as $item) {
                    $qty = (float) ($item['quantity'] ?? 1);
                    $price = (float) ($item['unit_price'] ?? 0);
                    $variantId = $this->variantResolver->resolveFromItemArray($item, (int) $item['product_id']);

                    // The receiving store cannot see this store's masters, so the line carries a snapshot.
                    StockOutwardItem::create([
                        'stock_outward_id' => $stockOutward->id,
                        'product_id' => $item['product_id'],
                        'variant_id' => $variantId,
                        'quantity' => $qty,
                        'unit_price' => $price,
                        ...app(StoreTransferMapper::class)->snapshot((int) $item['product_id'], $variantId),
                    ]);

                    // Leaves the source now; the target only gains what it confirms on receipt.
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
                }

                return $stockOutward;
            });
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot dispatch this transfer: '.$e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Transfer dispatched. It stays in transit until the receiving store confirms it.',
            'data' => $outward->load(self::RELATIONS),
        ], 201);
    }

    public function show(Request $request, int|string $id)
    {
        return response()->json([
            'success' => true,
            'data' => $this->find($request, $id)->load(self::RELATIONS),
        ]);
    }

    /** The receiving store confirms what arrived; only good stock is added to it. */
    public function receive(Request $request, int|string $id)
    {
        $outward = $this->find($request, $id, 'target');
        // Received goods are booked to the receiving store's own products, created in its context.
        if ((int) $this->resolveStoreId($request) !== (int) $outward->target_store_id) {
            throw ValidationException::withMessages(['store' => 'Switch to the receiving store to receive this transfer.']);
        }
        $data = $request->validate([
            'notes' => 'nullable|string|max:1000',
            'items' => 'nullable|array',
            'items.*.id' => 'required|integer',
            'items.*.received_qty' => 'required|numeric|min:0',
            'items.*.damaged_qty' => 'nullable|numeric|min:0',
            'items.*.note' => 'nullable|string|max:255',
        ]);
        $reported = collect($data['items'] ?? [])->keyBy('id');

        DB::transaction(function () use ($request, $outward, $data, $reported) {
            $outward = StockOutward::whereKey($outward->id)->lockForUpdate()->first();
            if ($outward->status !== StockOutward::IN_TRANSIT) {
                throw ValidationException::withMessages(['status' => 'This transfer is no longer in transit.']);
            }
            $mapper = app(StoreTransferMapper::class);
            $mapper->assertMastersExist($outward->items->filter(fn ($item) => (float) ($reported->get($item->id)['received_qty'] ?? $item->quantity) > 0));
            foreach ($outward->items as $item) {
                $line = $reported->get($item->id);
                $received = (float) ($line['received_qty'] ?? $item->quantity); // Unlisted lines arrived in full.
                $damaged = (float) ($line['damaged_qty'] ?? 0);
                if ($received + $damaged > (float) $item->quantity + 0.0005) {
                    throw ValidationException::withMessages(["items.{$item->id}" => 'Received plus damaged cannot exceed the quantity sent.']);
                }
                [$productId, $variantId] = $received > 0 ? $mapper->receivingVariant($item) : [null, null];
                // A query, not $item->update(): the line still points at the sender's product, which the
                // receiving store's ownership checks would (rightly) refuse to save against.
                DB::table('stock_outward_items')->where('id', $item->id)->update([
                    'received_qty' => $received, 'damaged_qty' => $damaged, 'receive_note' => $line['note'] ?? null,
                    'received_product_id' => $productId, 'received_variant_id' => $variantId, 'updated_at' => now(),
                ]);
                if ($received > 0) {
                    $this->stockService->adjust((int) $outward->target_store_id, $productId, $variantId,
                        $received, 'STOCK_OUTWARD', $outward->id, (float) $item->unit_price, $request->user()?->id);
                }
            }
            $outward->update(['status' => 'RECEIVED', 'received_at' => now(), 'received_by' => $request->user()?->id, 'receive_notes' => $data['notes'] ?? null]);
        });

        return response()->json(['success' => true, 'message' => 'Transfer received.', 'data' => $outward->fresh(self::RELATIONS)]);
    }

    /** Calls back a transfer still in transit; the stock returns to the source store. */
    public function cancel(Request $request, int|string $id)
    {
        $outward = $this->find($request, $id, 'source');
        DB::transaction(function () use ($request, $outward) {
            $outward = StockOutward::whereKey($outward->id)->lockForUpdate()->first();
            if ($outward->status !== StockOutward::IN_TRANSIT) {
                throw ValidationException::withMessages(['status' => 'Only a transfer still in transit can be cancelled.']);
            }
            $this->returnToSource($outward, $request->user()?->id);
            $outward->update(['status' => 'CANCELLED', 'cancelled_at' => now()]);
        });

        return response()->json(['success' => true, 'message' => 'Transfer cancelled; the stock is back in the sending store.', 'data' => $outward->fresh(self::RELATIONS)]);
    }

    public function destroy(Request $request, int|string $id)
    {
        $outward = $this->find($request, $id, 'source');

        try {
            DB::transaction(function () use ($request, $outward) {
                // Undo only what actually happened: in transit -> back to source; received -> also take
                // back what the target gained (this can fail if that stock was already sold or moved on).
                if ($outward->status === StockOutward::IN_TRANSIT) {
                    $this->returnToSource($outward, $request->user()?->id);
                } elseif ($outward->status === 'RECEIVED') {
                    $this->returnToSource($outward, $request->user()?->id);
                    foreach ($outward->items as $item) {
                        if ((float) $item->received_qty > 0) {
                            $this->stockService->adjust((int) $outward->target_store_id, (int) ($item->received_product_id ?? $item->product_id),
                                ($item->received_variant_id ?? $item->variant_id) ? (int) ($item->received_variant_id ?? $item->variant_id) : null,
                                -(float) $item->received_qty, 'STOCK_OUTWARD', $outward->id, (float) $item->unit_price, $request->user()?->id);
                        }
                    }
                }

                $outward->items()->delete();
                $outward->delete();
            });
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this transfer: the target store no longer has enough of this stock to reverse it (it has likely already been sold or moved). '.$e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Stock outward record deleted successfully',
        ]);
    }

    private function siblings(?Store $source)
    {
        return Store::query()->where('is_active', true)->whereKeyNot($source?->id ?? 0)
            ->where(fn ($q) => $source?->platform_company_code
                ? $q->where('platform_company_code', $source->platform_company_code)
                : $q->whereNull('platform_company_code'))
            ->orderBy('name');
    }

    private function returnToSource(StockOutward $outward, ?int $userId): void
    {
        foreach ($outward->items as $item) {
            $this->stockService->adjust((int) $outward->source_store_id, (int) $item->product_id, $item->variant_id ? (int) $item->variant_id : null,
                (float) $item->quantity, 'STOCK_OUTWARD', $outward->id, (float) $item->unit_price, $userId);
        }
    }

    /** @return list<int> */
    private function accessibleStoreIds(Request $request): array
    {
        return app(StoreContext::class)->available($request->user())->pluck('id')->map(fn ($id) => (int) $id)->all();
    }

    /** A transfer the user can see; $side limits who may act on it (the sending or receiving store). */
    private function find(Request $request, int|string $id, ?string $side = null): StockOutward
    {
        $stores = $this->accessibleStoreIds($request);
        // Addressed by transfer key (stable across a store's local server and the cloud) or by id.
        $outward = StockOutward::with('items')->where(Str::isUuid((string) $id) ? 'uuid' : 'id', $id)->firstOrFail();
        $allowed = match ($side) {
            'source' => in_array((int) $outward->source_store_id, $stores, true),
            'target' => in_array((int) $outward->target_store_id, $stores, true),
            default => in_array((int) $outward->source_store_id, $stores, true) || in_array((int) $outward->target_store_id, $stores, true),
        };
        abort_unless($allowed, $side ? 403 : 404, $side === 'target' ? 'Only the receiving store can receive this transfer.' : ($side ? 'Only the sending store can change this transfer.' : 'Transfer not found.'));

        return $outward;
    }
}
