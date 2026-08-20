<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\DirectPurchase;
use App\Models\DirectPurchaseItem;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Store;
use App\Models\StockBatch;
use App\Models\Transport;
use App\Services\StockService;
use App\Services\VariantResolverService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class DirectPurchaseController extends Controller
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly VariantResolverService $variantResolver,
    ) {
    }

    /** Brand + Size + Colour + Design → the real ProductVariant this line belongs to. */
    private function resolveVariantId(array $itemData): ?int
    {
        if (!$itemData['product_id']) {
            return null;
        }

        $variant = $this->variantResolver->resolve(
            productId: (int) $itemData['product_id'],
            brandId: $itemData['brand_id'] ? (int) $itemData['brand_id'] : null,
            sizeName: $itemData['size'] ?? null,
            colorId: $itemData['color_id'] ? (int) $itemData['color_id'] : null,
            designNo: $itemData['design_no'] ?? null,
        );

        return $variant->id;
    }

    public function index(Request $request)
    {
        $query = DirectPurchase::with([
            'company',
            'store',
            'supplier',
            'transport',
            'items.product',
            'items.brand',
            'items.color'
        ])->withCount('barcodes');

        $storeId = $request->header('X-Company-Scope-Id');
        if ($storeId && $storeId !== 'all') {
            $query->where(function ($q) use ($storeId) {
                $q->where('store_id', $storeId)
                  ->orWhere('company_id', $storeId);
            });
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                  ->orWhere('purchase_no', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('lr_no', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $purchases = $query->orderBy('id', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $purchases,
                'total'   => $purchases->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('id', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => $paginated->items(),
            'total'   => $paginated->total(),
            'page'    => $paginated->currentPage(),
            'limit'   => $paginated->perPage(),
            'pagination' => [
                'total'        => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $purchase = DirectPurchase::with([
            'company',
            'store',
            'supplier',
            'transport',
            'items.product',
            'items.brand',
            'items.color'
        ])->withCount('barcodes')->find($id);

        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Direct purchase not found',
            ], 404);
        }

        $this->attachSellThrough($purchase);

        return response()->json([
            'success' => true,
            'data'    => $purchase,
        ]);
    }

    /**
     * Answers "how much of this invoice has sold vs. remains" per line -
     * the batch(es) this purchase's variant(s) created via StockService,
     * summed. Only meaningful once the purchase has reached Completed and
     * actually applied stock; before that no batch exists yet.
     */
    private function attachSellThrough(DirectPurchase $purchase): void
    {
        $variantIds = $purchase->items->pluck('variant_id')->filter()->unique()->values();
        if ($variantIds->isEmpty()) {
            return;
        }

        $batches = StockBatch::where('reference_type', 'DIRECT_PURCHASE')
            ->where('reference_id', $purchase->id)
            ->whereIn('variant_id', $variantIds)
            ->get()
            ->groupBy('variant_id');

        $purchase->items->each(function ($item) use ($batches) {
            $group = $item->variant_id ? $batches->get((int) $item->variant_id) : null;
            if (!$group || $group->isEmpty()) {
                $item->sell_through = null;
                return;
            }

            $received = (float) $group->sum('received_qty');
            $remaining = (float) $group->sum('remaining_qty');
            $item->sell_through = [
                'received_qty' => $received,
                'remaining_qty' => $remaining,
                'sold_qty' => $received - $remaining,
            ];
        });
    }

    public function store(Request $request)
    {
        $data = $this->normalizeInput($request);

        $validator = Validator::make($data, [
            'supplier_id'         => 'required',
            'items'               => 'required|array|min:1',
            'items.*.product_id'  => 'required|exists:products,id',
            'items.*.qty'         => 'required|numeric|min:0.001',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $directPurchase = DB::transaction(function () use ($data, $request) {
            $user = $request->user();
            $storeId = $data['company_id'] ?: ($user?->store_id ?? 1);

            $purchaseNo = 'PUR-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));

            $purchase = DirectPurchase::create([
                'store_id'                => $storeId,
                'company_id'              => $data['company_id'] ?: $storeId,
                'company_name'            => $data['company_name'],
                'supplier_id'             => $data['supplier_id'],
                'supplier_name'           => $data['supplier_name'],
                'purchase_no'             => $purchaseNo,
                'purchase_type'           => $data['purchase_type'],
                'po_no'                   => $data['po_no'],
                'transport_id'            => $data['transport_id'],
                'transport_name'          => $data['transport_name'],
                'lr_no'                   => $data['lr_no'],
                'lr_date'                 => $data['lr_date'],
                'bundles'                 => $data['bundles'],
                'retail_location'         => $data['retail_location'],
                'purchase_date'           => $data['invoice_date'] ?: now()->toDateString(),
                'invoice_no'              => $data['invoice_no'] ?: ('INV-' . rand(10000, 99999)),
                'invoice_date'            => $data['invoice_date'] ?: now()->toDateString(),
                'igst'                    => $data['igst'],
                'i_discount'              => $data['i_discount'],
                'tax_type_id'             => $data['tax_type_id'],
                'tax_type_name'           => $data['tax_type_name'],
                'tax_value'               => $data['tax_value'],
                'tax_discount'            => $data['tax_discount'],
                'tax_lines'               => $data['tax_lines'],
                'bill_value'              => $data['bill_value'],
                'other_charges'           => $data['other_charges'],
                'bill_tax'                => $data['bill_tax'],
                'pur_discount_perc'       => $data['pur_discount_perc'],
                'pur_discount'            => $data['pur_discount'],
                'total'                   => $data['total'],
                'total_qty'               => $data['total_qty'],
                'subtotal'                => $data['bill_value'],
                'tax_amount'              => $data['tax_amount'],
                'discount_amount'         => $data['pur_discount'],
                'total_amount'            => $data['total'],
                'paid_amount'             => 0,
                'payment_status'          => 'UNPAID',
                'status'                  => 'COMPLETED',
                'invoice_workflow_status' => $data['invoice_workflow_status'],
                'created_by'              => $user?->id ?? 1,
            ]);

            foreach ($data['items'] as $index => $itemData) {
                DirectPurchaseItem::create([
                    'direct_purchase_id' => $purchase->id,
                    's_no'               => $itemData['s_no'] ?: ($index + 1),
                    'product_id'         => $itemData['product_id'],
                    'product_name'       => $itemData['product_name'],
                    'brand_id'           => $itemData['brand_id'],
                    'brand_name'         => $itemData['brand_name'],
                    'size'               => $itemData['size'],
                    'color_id'           => $itemData['color_id'],
                    'color_name'         => $itemData['color_name'],
                    'design_no'          => $itemData['design_no'],
                    'hsn_code'           => $itemData['hsn_code'],
                    'variant_id'         => $this->resolveVariantId($itemData),
                    'quantity'           => $itemData['qty'],
                    'qty'                => $itemData['qty'],
                    'cost_price'         => $itemData['cost'],
                    'cost'               => $itemData['cost'],
                    'tax_amount'         => $itemData['tax_amount'] ?? 0,
                    'discount'           => $itemData['discount'] ?? 0,
                    'margin_perc'        => $itemData['margin_perc'] ?? 0,
                    'price'              => $itemData['price'] ?? 0,
                    'amount'             => $itemData['amount'] ?? 0,
                    'total_price'        => $itemData['amount'] ?? 0,
                    'jump_change_price'  => $itemData['jump_change_price'] ?? false,
                    'jump_details'       => $itemData['jump_details'] ?? null,
                ]);

                // Stock is deliberately NOT applied here - a purchase starts
                // as pure paperwork (LR/invoice/items). It only becomes real,
                // sellable inventory once the purchase reaches "Completed"
                // (see update()) - goods that haven't been barcoded/verified
                // yet shouldn't show up as available stock anywhere.
                $this->propagatePricingToProduct(
                    (int) $itemData['product_id'],
                    (float) $itemData['cost'],
                    (float) $itemData['price'],
                );
            }

            return $purchase;
        });

        return response()->json([
            'success' => true,
            'message' => 'Direct purchase saved successfully',
            'data'    => $directPurchase->load(['company', 'supplier', 'transport', 'items.product', 'items.brand', 'items.color']),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $purchase = DirectPurchase::find($id);

        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Direct purchase not found',
            ], 404);
        }

        $data = $this->normalizeInput($request);
        $raw  = $request->all();

        // A partial PATCH (e.g. the Warehouse Dashboard's Complete action or
        // Barcode Generation's Save, both of which send only
        // {invoiceWorkflowStatus: ...}) must not blank out every other field
        // - normalizeInput() fills unsent fields with defaults (null/0/[])
        // for store()'s benefit, which previously got written here verbatim
        // on every update() call regardless of whether the caller sent them.
        $hasAny = fn (array $keys) => collect($keys)->contains(fn ($k) => array_key_exists($k, $raw));

        $updates = [];
        $fieldKeys = [
            'company_name'      => ['companyName', 'company_name'],
            'supplier_id'       => ['supplierId', 'supplier_id'],
            'supplier_name'     => ['supplierName', 'supplier_name'],
            'purchase_type'     => ['purchaseType', 'purchase_type'],
            'po_no'             => ['poNo', 'po_no'],
            'transport_id'      => ['transportId', 'transport_id'],
            'transport_name'    => ['transportName', 'transport_name'],
            'lr_no'             => ['lrNo', 'lr_no'],
            'lr_date'           => ['lrDate', 'lr_date'],
            'bundles'           => ['bundles'],
            'retail_location'   => ['retailLocation', 'retail_location'],
            'igst'              => ['igst'],
            'i_discount'        => ['iDiscount', 'i_discount'],
            'tax_type_id'       => ['taxTypeId', 'tax_type_id'],
            'tax_type_name'     => ['taxTypeName', 'tax_type_name'],
            'tax_value'         => ['taxValue', 'tax_value'],
            'tax_discount'      => ['taxDiscount', 'tax_discount'],
            'tax_lines'         => ['taxLines', 'tax_lines'],
            'bill_value'        => ['billValue', 'bill_value'],
            'other_charges'     => ['otherCharges', 'other_charges'],
            'bill_tax'          => ['billTax', 'bill_tax'],
            'pur_discount_perc' => ['purDiscountPerc', 'pur_discount_perc'],
            'pur_discount'      => ['purDiscount', 'pur_discount'],
            'total'             => ['total'],
            'invoice_workflow_status' => ['invoiceWorkflowStatus', 'invoice_workflow_status'],
        ];
        foreach ($fieldKeys as $column => $keys) {
            if ($hasAny($keys)) {
                $updates[$column] = $data[$column];
            }
        }
        if ($hasAny(['companyId', 'company_id'])) {
            $updates['company_id'] = $data['company_id'] ?: $purchase->company_id;
        }
        if ($hasAny(['invoiceNo', 'invoice_no'])) {
            $updates['invoice_no'] = $data['invoice_no'] ?: $purchase->invoice_no;
        }
        if ($hasAny(['invoiceDate', 'invoice_date'])) {
            $updates['invoice_date']  = $data['invoice_date'] ?: $purchase->invoice_date;
            $updates['purchase_date'] = $data['invoice_date'] ?: $purchase->purchase_date;
        }
        // These financial totals mirror the header inputs above (bill_value/
        // pur_discount/total), not something computed independently - update
        // them together whenever any of those were actually sent.
        if ($hasAny(['billValue', 'bill_value', 'purDiscount', 'pur_discount', 'total', 'taxAmount', 'tax_amount'])) {
            $updates['subtotal']        = $data['bill_value'];
            $updates['tax_amount']      = $data['tax_amount'];
            $updates['discount_amount'] = $data['pur_discount'];
            $updates['total_amount']    = $data['total'];
        }

        $itemsProvided = $request->has('items');
        if ($itemsProvided) {
            $updates['total_qty'] = $data['total_qty'];
        }

        $willComplete = false;
        $hadBarcodes = false;

        DB::transaction(function () use ($purchase, $data, $updates, $itemsProvided, &$willComplete, &$hadBarcodes, $request) {
            if ($itemsProvided) {
                // Reverse whatever stock this purchase's OLD items already
                // contributed (only real if stock_applied - i.e. this is a
                // post-completion edit), before replacing the items.
                if ($purchase->stock_applied) {
                    foreach ($purchase->items as $oldItem) {
                        $this->stockService->adjust(
                            storeId: $purchase->store_id,
                            productId: (int) $oldItem->product_id,
                            variantId: $oldItem->variant_id ? (int) $oldItem->variant_id : null,
                            delta: -(float) $oldItem->qty,
                            referenceType: 'DIRECT_PURCHASE',
                            referenceId: $purchase->id,
                            costPrice: (float) $oldItem->cost,
                        );
                    }
                }

                $purchase->items()->delete();

                foreach ($data['items'] as $index => $itemData) {
                    $variantId = $this->resolveVariantId($itemData);

                    DirectPurchaseItem::create([
                        'direct_purchase_id' => $purchase->id,
                        's_no'               => $itemData['s_no'] ?: ($index + 1),
                        'product_id'         => $itemData['product_id'],
                        'product_name'       => $itemData['product_name'],
                        'brand_id'           => $itemData['brand_id'],
                        'brand_name'         => $itemData['brand_name'],
                        'size'               => $itemData['size'],
                        'color_id'           => $itemData['color_id'],
                        'color_name'         => $itemData['color_name'],
                        'design_no'          => $itemData['design_no'],
                        'hsn_code'           => $itemData['hsn_code'],
                        'variant_id'         => $variantId,
                        'quantity'           => $itemData['qty'],
                        'qty'                => $itemData['qty'],
                        'cost_price'         => $itemData['cost'],
                        'cost'               => $itemData['cost'],
                        'tax_amount'         => $itemData['tax_amount'] ?? 0,
                        'discount'           => $itemData['discount'] ?? 0,
                        'margin_perc'        => $itemData['margin_perc'] ?? 0,
                        'price'              => $itemData['price'] ?? 0,
                        'amount'             => $itemData['amount'] ?? 0,
                        'total_price'        => $itemData['amount'] ?? 0,
                        'jump_change_price'  => $itemData['jump_change_price'] ?? false,
                        'jump_details'       => $itemData['jump_details'] ?? null,
                    ]);

                    $this->propagatePricingToProduct(
                        (int) $itemData['product_id'],
                        (float) $itemData['cost'],
                        (float) $itemData['price'],
                    );

                    if ($purchase->stock_applied) {
                        $this->stockService->adjust(
                            storeId: $purchase->store_id,
                            productId: (int) $itemData['product_id'],
                            variantId: $variantId,
                            delta: (float) $itemData['qty'],
                            referenceType: 'DIRECT_PURCHASE',
                            referenceId: $purchase->id,
                            costPrice: (float) $itemData['cost'],
                            userId: $request->user()?->id,
                        );
                    }
                }
            }

            $purchase->update($updates);

            // Transition into "Completed": workflow status says complete,
            // real barcodes exist, and stock hasn't been applied yet. Covers
            // the Dashboard's Complete action, which sends only the status
            // field - $purchase->items (untouched above) is exactly right.
            $hadBarcodes = $purchase->barcodes()->exists();
            $willComplete = !$purchase->stock_applied
                && ($updates['invoice_workflow_status'] ?? $purchase->invoice_workflow_status) === 'invoice_completed'
                && $hadBarcodes;

            if ($willComplete) {
                // Query fresh rather than $purchase->items - if items were
                // just replaced above, the relation would otherwise still be
                // holding whichever set (old or none) it first lazy-loaded.
                foreach ($purchase->items()->get() as $item) {
                    $this->stockService->adjust(
                        storeId: $purchase->store_id,
                        productId: (int) $item->product_id,
                        variantId: $item->variant_id ? (int) $item->variant_id : null,
                        delta: (float) $item->qty,
                        referenceType: 'DIRECT_PURCHASE',
                        referenceId: $purchase->id,
                        costPrice: (float) $item->cost,
                    );
                }
                $purchase->update(['stock_applied' => true]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Direct purchase updated successfully',
            'data'    => $purchase->fresh(['company', 'supplier', 'transport', 'items.product', 'items.brand', 'items.color'])->loadCount('barcodes'),
        ]);
    }

    public function destroy($id)
    {
        $purchase = DirectPurchase::with('items')->find($id);

        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Direct purchase not found',
            ], 404);
        }

        try {
            DB::transaction(function () use ($purchase) {
                // Only reverse stock if it was actually applied (i.e. this
                // purchase reached "Completed") - otherwise nothing was ever
                // added to inventory for it.
                if ($purchase->stock_applied) {
                    foreach ($purchase->items as $item) {
                        $this->stockService->adjust(
                            storeId: $purchase->store_id,
                            productId: (int) $item->product_id,
                            variantId: $item->variant_id ? (int) $item->variant_id : null,
                            delta: -(float) $item->qty,
                            referenceType: 'DIRECT_PURCHASE',
                            referenceId: $purchase->id,
                            costPrice: (float) $item->cost,
                        );
                    }
                }

                $purchase->items()->delete();
                $purchase->delete();
            });
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this purchase: reversing it would take stock negative (some of it has likely already been sold or moved). ' . $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Direct purchase deleted successfully',
        ]);
    }

    /**
     * A purchase line's cost/price previously only ever landed on
     * direct_purchase_items - a brand-new product (created via the Quick
     * Attribute "+" modal, which only sends code/name) kept
     * products.selling_price at its column default of 0 forever, which is
     * exactly what the POS picker reads. cost_price always reflects the
     * latest purchase; selling_price is only set from a purchase when it's
     * still unset, so a deliberately-chosen merchandising price is never
     * silently overwritten by a later purchase's price.
     */
    private function propagatePricingToProduct(int $productId, float $cost, float $price): void
    {
        $product = Product::find($productId);
        if (!$product) {
            return;
        }

        $updates = [];
        if ($cost > 0) {
            $updates['cost_price'] = $cost;
        }
        if ($price > 0 && (float) $product->selling_price <= 0) {
            $updates['selling_price'] = $price;
        }

        if (!empty($updates)) {
            $product->update($updates);
        }
    }

    public function bulk(Request $request)
    {
        $rows = $request->input('rows', []);

        // Fetch every supplier this batch needs in one query instead of one
        // query (plus a possible create()) per row, and reuse a single
        // "Imported Supplier" record for blank names rather than creating a
        // fresh duplicate for every such row.
        $names = collect($rows)
            ->map(fn ($row) => $row['supplier_name'] ?? $row['supplier'] ?? null)
            ->filter()
            ->unique()
            ->values();
        $suppliersByName = Supplier::whereIn('name', $names)->get()->keyBy('name');

        $created = DB::transaction(function () use ($rows, $request, $suppliersByName) {
            $count = 0;
            foreach ($rows as $row) {
                $supplierName = $row['supplier_name'] ?? $row['supplier'] ?? null;
                $supplier = $supplierName ? $suppliersByName->get($supplierName) : null;
                if (!$supplier) {
                    $supplier = Supplier::create([
                        'code'   => 'SUP_' . strtoupper(substr(uniqid(), -5)),
                        'name'   => $supplierName ?: 'Imported Supplier',
                        'active' => true,
                    ]);
                    if ($supplierName) {
                        $suppliersByName->put($supplierName, $supplier);
                    }
                }

                DirectPurchase::create([
                    'store_id'                => $request->header('X-Company-Scope-Id', 1),
                    'company_id'              => $row['company_id'] ?? 1,
                    'company_name'            => $row['company'] ?? 'SBT Store',
                    'supplier_id'             => $supplier->id,
                    'supplier_name'           => $supplier->name,
                    'purchase_no'             => 'PUR-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5)),
                    'purchase_type'           => $row['purchase_type'] ?? 'textile',
                    'po_no'                   => $row['po_no'] ?? null,
                    'transport_name'          => $row['transport_name'] ?? null,
                    'lr_no'                   => $row['lr_no'] ?? null,
                    'lr_date'                 => $row['lr_date'] ?? null,
                    'bundles'                 => (int) ($row['bundles'] ?? 0),
                    'retail_location'         => $row['retail_location'] ?? null,
                    'invoice_no'              => $row['invoice_no'] ?? ('INV-' . rand(10000, 99999)),
                    'invoice_date'            => $row['invoice_date'] ?? now()->toDateString(),
                    'purchase_date'           => $row['invoice_date'] ?? now()->toDateString(),
                    'bill_value'              => (float) ($row['bill_value'] ?? 0),
                    'other_charges'           => (float) ($row['other_charges'] ?? 0),
                    'bill_tax'                => (float) ($row['bill_tax'] ?? 0),
                    'pur_discount_perc'       => (float) ($row['pur_discount_perc'] ?? 0),
                    'pur_discount'            => (float) ($row['pur_discount'] ?? 0),
                    'total'                   => (float) ($row['total'] ?? 0),
                    'total_amount'            => (float) ($row['total'] ?? 0),
                    'invoice_workflow_status' => 'invoice_completed',
                    'created_by'              => $request->user()?->id ?? 1,
                ]);

                $count++;
            }

            return $count;
        });

        return response()->json([
            'success' => true,
            'message' => "{$created} direct purchase records imported successfully",
        ]);
    }

    private function normalizeInput(Request $request): array
    {
        $raw = $request->all();

        $companyId = $raw['companyId'] ?? $raw['company_id'] ?? null;
        $supplierId = $raw['supplierId'] ?? $raw['supplier_id'] ?? null;
        $transportId = $raw['transportId'] ?? $raw['transport_id'] ?? null;

        $items = [];
        $totalQty = 0;
        $rawItems = $raw['items'] ?? [];

        foreach ($rawItems as $item) {
            $productId = $item['productId'] ?? $item['product_id'] ?? null;
            $qty = (float) ($item['qty'] ?? $item['quantity'] ?? 1);
            $cost = (float) ($item['cost'] ?? $item['cost_price'] ?? 0);
            $marginPerc = (float) ($item['marginPerc'] ?? $item['margin_perc'] ?? 0);
            $price = (float) ($item['price'] ?? 0);
            $amount = (float) ($item['amount'] ?? ($qty * $cost));

            $totalQty += $qty;

            $items[] = [
                's_no'              => $item['sNo'] ?? $item['s_no'] ?? 1,
                'product_id'        => $productId,
                'product_name'      => $item['productName'] ?? $item['product_name'] ?? null,
                'brand_id'          => $item['brandId'] ?? $item['brand_id'] ?? null,
                'brand_name'        => $item['brandName'] ?? $item['brand_name'] ?? null,
                'size'              => $item['size'] ?? null,
                'color_id'          => $item['colorId'] ?? $item['color_id'] ?? null,
                'color_name'        => $item['colorName'] ?? $item['color_name'] ?? null,
                'design_no'         => $item['designNo'] ?? $item['design_no'] ?? null,
                'hsn_code'          => $item['hsnCode'] ?? $item['hsn_code'] ?? null,
                'qty'               => $qty,
                'cost'              => $cost,
                'discount'          => (float) ($item['discount'] ?? 0),
                'margin_perc'       => $marginPerc,
                'price'             => $price,
                'amount'            => $amount,
                'tax_amount'        => (float) ($item['taxAmount'] ?? $item['tax_amount'] ?? 0),
                'jump_change_price' => (bool) ($item['jumpChangePrice'] ?? $item['jump_change_price'] ?? false),
                'jump_details'      => $item['jumpDetails'] ?? $item['jump_details'] ?? null,
            ];
        }

        return [
            'company_id'              => $companyId,
            'company_name'            => $raw['companyName'] ?? $raw['company_name'] ?? null,
            'supplier_id'             => $supplierId,
            'supplier_name'           => $raw['supplierName'] ?? $raw['supplier_name'] ?? null,
            'purchase_type'           => $raw['purchaseType'] ?? $raw['purchase_type'] ?? 'textile',
            'po_no'                   => $raw['poNo'] ?? $raw['po_no'] ?? null,
            'transport_id'            => $transportId,
            'transport_name'          => $raw['transportName'] ?? $raw['transport_name'] ?? null,
            'lr_no'                   => $raw['lrNo'] ?? $raw['lr_no'] ?? null,
            'lr_date'                 => $raw['lrDate'] ?? $raw['lr_date'] ?? null,
            'bundles'                 => (int) ($raw['bundles'] ?? 0),
            'retail_location'         => $raw['retailLocation'] ?? $raw['retail_location'] ?? null,
            'invoice_no'              => $raw['invoiceNo'] ?? $raw['invoice_no'] ?? null,
            'invoice_date'            => $raw['invoiceDate'] ?? $raw['invoice_date'] ?? null,
            'igst'                    => (bool) ($raw['igst'] ?? false),
            'i_discount'              => (bool) ($raw['iDiscount'] ?? $raw['i_discount'] ?? false),
            'tax_type_id'             => $raw['taxTypeId'] ?? $raw['tax_type_id'] ?? null,
            'tax_type_name'           => $raw['taxTypeName'] ?? $raw['tax_type_name'] ?? null,
            'tax_value'               => (float) ($raw['taxValue'] ?? $raw['tax_value'] ?? 0),
            'tax_discount'            => (float) ($raw['taxDiscount'] ?? $raw['tax_discount'] ?? 0),
            'tax_amount'              => (float) ($raw['taxAmount'] ?? $raw['tax_amount'] ?? 0),
            'tax_lines'               => $raw['taxLines'] ?? $raw['tax_lines'] ?? [],
            'bill_value'              => (float) ($raw['billValue'] ?? $raw['bill_value'] ?? 0),
            'other_charges'           => (float) ($raw['otherCharges'] ?? $raw['other_charges'] ?? 0),
            'bill_tax'                => (float) ($raw['billTax'] ?? $raw['bill_tax'] ?? 0),
            'pur_discount_perc'       => (float) ($raw['purDiscountPerc'] ?? $raw['pur_discount_perc'] ?? 0),
            'pur_discount'            => (float) ($raw['purDiscount'] ?? $raw['pur_discount'] ?? 0),
            'total'                   => (float) ($raw['total'] ?? 0),
            'invoice_workflow_status' => $raw['invoiceWorkflowStatus'] ?? $raw['invoice_workflow_status'] ?? 'invoice_completed',
            'total_qty'               => $totalQty,
            'items'                   => $items,
        ];
    }
}
