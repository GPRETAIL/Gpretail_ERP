<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Barcode;
use App\Models\DirectPurchase;
use App\Models\DirectPurchaseItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Stock;
use App\Models\Store;
use App\Services\VariantResolverService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BarcodeController extends Controller
{
    public function __construct(private readonly VariantResolverService $variantResolver)
    {
    }

    /* ─────────────────────────────────────────────────────────────
     * GET /api/barcodes
     * Supports ?direct_purchase_id=X  or  ?transport_entry_id=X
     * Also supports ?search, ?all, ?limit
     * ───────────────────────────────────────────────────────────── */
    public function index(Request $request)
    {
        $query = Barcode::with(['product.brand', 'product.category', 'variant']);

        // --- Source filters (warehouse workflows) ---
        if ($request->filled('direct_purchase_id')) {
            $query->where('direct_purchase_id', $request->input('direct_purchase_id'));
        }

        if ($request->filled('transport_entry_id')) {
            // Barcodes linked via inventory_entry → inventory_items that belong to this transport entry
            $teId = $request->input('transport_entry_id');
            $query->whereHas('inventoryItem', function ($q) use ($teId) {
                $q->whereHas('inventoryEntry', function ($q2) use ($teId) {
                    $q2->where('transport_entry_id', $teId);
                });
            })->orWhere(function ($q) use ($teId) {
                // Also match by direct inventory_entry_id stored on the barcode row
                $q->whereIn('inventory_entry_id', function ($sub) use ($teId) {
                    $sub->select('id')
                        ->from('inventory_entries')
                        ->where('transport_entry_id', $teId);
                });
            });
        }

        // --- Text search ---
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('barcode', 'like', "%{$search}%")
                  ->orWhere('batch_no', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%")
                  ->orWhereHas('product', function ($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $items = $query->orderBy('created_at', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit     = $request->integer('limit', 15);
        $paginated = $query->orderBy('created_at', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => $paginated->items(),
            'total'   => $paginated->total(),
            'page'    => $paginated->currentPage(),
            'limit'   => $paginated->perPage(),
        ]);
    }

    /* ─────────────────────────────────────────────────────────────
     * POST /api/barcodes/generate
     * Body: { directPurchaseId, transportEntryId, companyId, codeType, items[] }
     * Each item: { sourceItemId, directPurchaseItemId, jumpDetailIndex,
     *              inventoryEntryId, inventoryItemId, productId,
     *              productName, size, designNo, colorId, brandId,
     *              mrp, discountPerc, finalPrice, sellingPrice, qty, ... }
     * Returns: { created[], skipped[] }  — each row has sourceItemId + barcode
     * ───────────────────────────────────────────────────────────── */
    public function generate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items'   => 'required|array|min:1',
            'items.*.productId' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $directPurchaseId = $request->input('directPurchaseId');
        $inventoryEntryId = $request->input('inventoryEntryId');
        $codeType         = in_array($request->input('codeType'), ['code', 'barcode'])
                            ? $request->input('codeType') : 'barcode';
        $prefix           = $this->resolvePrefix($request);

        $created = [];
        $skipped = [];

        $productCache = [];

        DB::transaction(function () use (
            $request, $directPurchaseId, $inventoryEntryId, $codeType, $prefix, &$created, &$skipped, &$productCache
        ) {

            foreach ($request->input('items', []) as $item) {
                $sourceItemId         = $item['sourceItemId'] ?? null;
                $dpItemId             = $item['directPurchaseItemId'] ?? null;
                $jumpDetailIndex      = isset($item['jumpDetailIndex']) ? (int) $item['jumpDetailIndex'] : null;
                $invEntryId           = $item['inventoryEntryId'] ?? $inventoryEntryId;
                $inventoryItemId      = $item['inventoryItemId'] ?? null;
                $productId            = $item['productId'] ?? null;
                $qty                  = max(1, (int) ($item['qty'] ?? 1));
                $mrp                  = (float) ($item['mrp'] ?? 0);
                $sellingPrice         = (float) ($item['sellingPrice'] ?? $mrp);
                $discountPerc         = (float) ($item['discountPerc'] ?? 0);
                $finalPrice           = (float) ($item['finalPrice'] ?? $sellingPrice);
                $productName          = $item['productName'] ?? null;
                $size                 = $item['size'] ?? null;
                $designNo             = $item['designNo'] ?? null;
                $colorId              = $item['colorId'] ?? $item['color_id'] ?? null;
                $colorName            = $item['colorName'] ?? $item['color_name'] ?? null;
                $brandId              = $item['brandId'] ?? $item['brand_id'] ?? null;

                // Check if barcodes already exist for this source item
                $existingQuery = Barcode::query();
                if ($directPurchaseId && $dpItemId !== null) {
                    $existingQuery->where('direct_purchase_id', $directPurchaseId)
                                  ->where('direct_purchase_item_id', $dpItemId);
                    if ($jumpDetailIndex !== null) {
                        $existingQuery->where('jump_detail_index', $jumpDetailIndex);
                    }
                } elseif ($inventoryItemId) {
                    $existingQuery->where('inventory_item_id', $inventoryItemId);
                } else {
                    // Fallback — generate fresh
                    $existingQuery->whereRaw('1=0');
                }

                $existing = $existingQuery->get();
                if ($existing->count() > 0) {
                    foreach ($existing as $row) {
                        $row->sourceItemId = $sourceItemId;
                        $skipped[]         = $row;
                    }
                    continue;
                }

                $variantId = null;
                $sellingMode = null;
                if ($productId) {
                    if (!array_key_exists($productId, $productCache)) {
                        $productCache[$productId] = Product::find($productId);
                    }
                    $product = $productCache[$productId];
                    $sellingMode = $product ? strtoupper((string) $product->selling_mode) : null;

                    $variant = $this->variantResolver->resolve(
                        productId: (int) $productId,
                        brandId: $brandId ? (int) $brandId : null,
                        sizeName: $size,
                        colorId: $colorId ? (int) $colorId : null,
                        designNo: $designNo,
                    );
                    $variantId = $variant->id;
                }

                // PACK/CUT: the barcode is a shelf label for the variant, not
                // the unit - reuse whatever's already active for it instead
                // of reissuing a new label (and a new stock_batches row still
                // gets created by StockService for sell-through tracking,
                // independent of whether a new barcode was printed here).
                if ($variantId && in_array($sellingMode, ['PACK', 'CUT'], true)) {
                    $reusable = Barcode::where('variant_id', $variantId)->where('is_active', true)->first();
                    if ($reusable) {
                        $reusable->sourceItemId = $sourceItemId;
                        $skipped[] = $reusable;
                        continue;
                    }
                    $qty = 1;
                }

                // Generate $qty unique barcode strings
                $newRows = [];
                for ($i = 0; $i < $qty; $i++) {
                    $barcodeStr = $this->generateUniqueBarcodeString($prefix);


                    $row = Barcode::create([
                        'product_id'              => $productId,
                        'variant_id'              => $variantId,
                        'direct_purchase_id'      => $directPurchaseId,
                        'direct_purchase_item_id' => $dpItemId,
                        'inventory_entry_id'      => $invEntryId,
                        'inventory_item_id'       => $inventoryItemId,
                        'jump_detail_index'       => $jumpDetailIndex,
                        'barcode'                 => $barcodeStr,
                        'batch_no'                => 'B' . date('Ymd') . '-' . rand(100, 999),
                        'mrp'                     => $mrp,
                        'selling_price'           => $sellingPrice,
                        'discount_perc'           => $discountPerc,
                        'final_price'             => $finalPrice,
                        'code_type'               => $codeType,
                        'product_name'            => $productName,
                        'size'                    => $size,
                        'design_no'               => $designNo,
                        'color_name'              => $colorName,
                        'is_active'               => true,
                    ]);

                    $row->sourceItemId   = $sourceItemId;
                    $row->inventory_item_id = $inventoryItemId;
                    $newRows[]           = $row;
                }
                $created = array_merge($created, $newRows);
            }
        });

        $totalCreated = count($created);
        $totalSkipped = count($skipped);

        return response()->json([
            'success' => true,
            'message' => $totalCreated > 0
                ? "Generated {$totalCreated} barcodes successfully" . ($totalSkipped > 0 ? " ({$totalSkipped} already existed)" : "")
                : "All {$totalSkipped} barcodes already existed",
            'data'    => [
                'created' => $created,
                'skipped' => $skipped,
            ],
        ]);
    }

    /* ─────────────────────────────────────────────────────────────
     * PUT /api/barcodes/source-item
     * Updates the direct_purchase_item or inventory_entry_item with
     * revised attributes (product, brand, size, mrp, etc.) before
     * barcode generation or after editing in the grid.
     * ───────────────────────────────────────────────────────────── */
    public function updateSourceItem(Request $request)
    {
        $dpItemId        = $request->input('directPurchaseItemId');
        $jumpDetailIndex = $request->input('jumpDetailIndex');
        $inventoryItemId = $request->input('inventoryItemId');

        $productId    = $request->input('productId');
        $brandId      = $request->input('brandId');
        $size         = $request->input('size');
        $styleId      = $request->input('styleId');
        $designNo     = $request->input('designNo');
        $materialId   = $request->input('materialId');
        $patternId    = $request->input('patternId');
        $sleeveId     = $request->input('sleeveId');
        $fitId        = $request->input('fitId');
        $typeId       = $request->input('typeId');
        $colorId      = $request->input('colorId');
        $mrp          = $request->input('mrp');
        $discountPerc = $request->input('discountPerc', 0);

        DB::transaction(function () use (
            $dpItemId, $jumpDetailIndex, $inventoryItemId,
            $productId, $brandId, $size, $styleId, $designNo,
            $materialId, $patternId, $sleeveId, $fitId, $typeId, $colorId,
            $mrp, $discountPerc
        ) {
            // Update direct purchase item
            if ($dpItemId) {
                $dpItem = DirectPurchaseItem::find($dpItemId);
                if ($dpItem) {
                    $updates = array_filter([
                        'product_id' => $productId ?: null,
                        'brand_id'   => $brandId ?: null,
                        'color_id'   => $colorId ?: null,
                        'size'       => $size ?: null,
                        'design_no'  => $designNo ?: null,
                        'cost'       => $mrp ?: null,
                    ], fn($v) => $v !== null);

                    if ($jumpDetailIndex !== null) {
                        // Update jump_details[jumpDetailIndex]
                        $jumpDetails = $dpItem->jump_details ?? [];
                        if (isset($jumpDetails[$jumpDetailIndex])) {
                            $jumpDetails[$jumpDetailIndex] = array_merge($jumpDetails[$jumpDetailIndex], array_filter([
                                'productId'       => $productId,
                                'brandId'         => $brandId,
                                'colorId'         => $colorId,
                                'size'            => $size,
                                'designNo'        => $designNo,
                                'styleId'         => $styleId,
                                'materialId'      => $materialId,
                                'patternId'       => $patternId,
                                'sleeveId'        => $sleeveId,
                                'fitId'           => $fitId,
                                'typeId'          => $typeId,
                                'mrp'             => $mrp,
                                'saleDiscountPerc' => $discountPerc,
                            ], fn($v) => $v !== null && $v !== ''));
                            $dpItem->jump_details = $jumpDetails;
                            $dpItem->save();
                        }
                    } else {
                        $dpItem->fill($updates)->save();
                    }
                }
            }

            // Update any existing barcodes for this item
            if ($dpItemId) {
                Barcode::where('direct_purchase_item_id', $dpItemId)
                    ->when($jumpDetailIndex !== null, fn($q) => $q->where('jump_detail_index', $jumpDetailIndex))
                    ->update(array_filter([
                        'product_id'   => $productId ?: null,
                        'size'         => $size ?: null,
                        'design_no'    => $designNo ?: null,
                        'mrp'          => $mrp ?: null,
                        'discount_perc' => $discountPerc,
                    ], fn($v) => $v !== null));
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Item updated successfully',
        ]);
    }

    /* ─────────────────────────────────────────────────────────────
     * POST /api/barcodes/generate (legacy single-generate path)
     * Kept for backwards compat with any other consumers
     * ───────────────────────────────────────────────────────────── */
    public function generateSingle(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'quantity'   => 'nullable|integer|min:1|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $product   = Product::find($request->input('product_id'));
        $count     = $request->input('quantity', 1);
        $generated = [];
        $prefix    = $this->resolvePrefix($request);

        for ($i = 0; $i < $count; $i++) {
            $barcodeStr = $this->generateUniqueBarcodeString($prefix);
            $barcode    = Barcode::create([
                'product_id'    => $product->id,
                'variant_id'    => $request->input('variant_id'),
                'barcode'       => $barcodeStr,
                'batch_no'      => 'B' . date('Ymd') . '-' . rand(100, 999),
                'mrp'           => $product->mrp,
                'selling_price' => $product->selling_price,
                'is_active'     => true,
            ]);
            $generated[] = $barcode;
        }

        return response()->json([
            'success' => true,
            'message' => "Generated {$count} barcodes successfully",
            'data'    => $generated,
        ]);
    }

    /* ─────────────────────────────────────────────────────────────
     * GET /api/barcodes/source-item?barcode=xxx
     * Lookup a barcode string → return product info
     * ───────────────────────────────────────────────────────────── */
    public function sourceItem(Request $request)
    {
        $barcodeStr = $request->input('barcode');
        $barcode    = Barcode::with(['product', 'variant'])->where('barcode', $barcodeStr)->first();

        if (!$barcode) {
            $product = Product::where('barcode', $barcodeStr)->orWhere('code', $barcodeStr)->first();
            if ($product) {
                return response()->json([
                    'success' => true,
                    'data'    => [
                        'product_id'    => $product->id,
                        'product_name'  => $product->name,
                        'code'          => $product->code,
                        'barcode'       => $product->barcode,
                        'mrp'           => $product->mrp,
                        'selling_price' => $product->selling_price,
                    ],
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Barcode not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'barcode_id'    => $barcode->id,
                'product_id'    => $barcode->product_id,
                'product_name'  => $barcode->product?->name,
                'barcode'       => $barcode->barcode,
                'mrp'           => $barcode->mrp,
                'selling_price' => $barcode->selling_price,
            ],
        ]);
    }

    /**
     * GET /api/barcodes/physical-stock - used by Sales Reports' stock
     * tabs. Previously just aliased index(), returning bare Barcode rows -
     * quantity and cost aren't columns on Barcode at all (a barcode row is
     * a per-unit/per-variant label, not a stock count), so every stock
     * report always showed qty=0/cost=0. Enriches each row with the real
     * current quantity (from Stock, keyed by product+variant) and cost
     * (Product.cost_price - the only cost basis available at this
     * granularity; Barcode itself never recorded a per-unit cost).
     */
    public function physicalStock(Request $request)
    {
        $response = $this->index($request);
        $payload = json_decode($response->getContent(), true);
        $rows = $payload['data'] ?? [];

        $productIds = collect($rows)->pluck('product_id')->filter()->unique()->values();
        $products = Product::whereIn('id', $productIds)->get(['id', 'cost_price'])->keyBy('id');

        $storeId = $request->header('X-Company-Scope-Id', 1);
        $stockByKey = Stock::where('store_id', $storeId)
            ->whereIn('product_id', $productIds)
            ->get(['product_id', 'variant_id', 'quantity'])
            ->keyBy(fn ($s) => $s->product_id . ':' . ($s->variant_id ?? 'null'));

        $enriched = collect($rows)->map(function ($row) use ($products, $stockByKey) {
            $stockKey = ($row['product_id'] ?? null) . ':' . ($row['variant_id'] ?? 'null');
            $row['qty'] = (float) ($stockByKey->get($stockKey)->quantity ?? 0);
            $row['cost'] = (float) ($products->get($row['product_id'] ?? null)->cost_price ?? 0);

            return $row;
        });

        return response()->json([
            'success' => true,
            'data'    => $enriched->values(),
            'total'   => $enriched->count(),
        ]);
    }

    /* ─────────────────────────────────────────────────────────────
     * Helpers
     * ───────────────────────────────────────────────────────────── */
    /**
     * Resolve the 2-letter barcode prefix from the authenticated user's store.
     * Format: [StoreName[0]][City[0]]  e.g. "SRI BALAJI TEXTILE" + "Chennai" → "SC"
     * Falls back to 'X' for any missing letter.
     */
    private function resolvePrefix(Request $request): string
    {
        $store = null;

        // Try to get store from authenticated user
        $user = Auth::user();
        if ($user && $user->store_id) {
            $store = Store::find($user->store_id);
        }

        // Fallback: use the first active store
        if (!$store) {
            $store = Store::where('is_active', true)->first();
        }

        $nameLetter = $store ? strtoupper(substr(trim($store->name), 0, 1)) : 'X';
        $cityLetter = $store ? strtoupper(substr(trim($store->city ?? $store->state ?? ''), 0, 1)) : 'X';

        $nameLetter = preg_match('/[A-Z]/', $nameLetter) ? $nameLetter : 'X';
        $cityLetter = preg_match('/[A-Z]/', $cityLetter) ? $cityLetter : 'X';

        return $nameLetter . $cityLetter;
    }

    /**
     * Generate a unique barcode string.
     * Format: {prefix}{5-digit sequential number}
     * Example: SC00001, SC00002 … SC99999
     */
    private function generateUniqueBarcodeString(string $prefix = 'XX'): string
    {
        // Find the highest existing number for this prefix
        $latest = Barcode::where('barcode', 'like', $prefix . '%')
            ->where('barcode', 'regexp', '^' . preg_quote($prefix, '/') . '[0-9]{5}$')
            ->orderByRaw('CAST(SUBSTRING(barcode, ' . (strlen($prefix) + 1) . ') AS UNSIGNED) DESC')
            ->value('barcode');

        if ($latest) {
            $lastNum = (int) substr($latest, strlen($prefix));
            $nextNum = $lastNum + 1;
        } else {
            $nextNum = 1;
        }

        // Safety: if over 99999 wrap or throw
        if ($nextNum > 99999) {
            $nextNum = rand(1, 99999);
        }

        $candidate = $prefix . str_pad((string) $nextNum, 5, '0', STR_PAD_LEFT);

        // Ensure uniqueness (handles race conditions)
        while (Barcode::where('barcode', $candidate)->exists()) {
            $nextNum++;
            if ($nextNum > 99999) $nextNum = 1;
            $candidate = $prefix . str_pad((string) $nextNum, 5, '0', STR_PAD_LEFT);
        }

        return $candidate;
    }
}
