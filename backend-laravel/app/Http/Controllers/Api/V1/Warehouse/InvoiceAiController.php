<?php

namespace App\Http\Controllers\Api\V1\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\ProcessPurchaseFlowRequest;
use App\Models\Barcode;
use App\Models\Category;
use App\Models\InventoryEntry;
use App\Models\InventoryEntryItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseInvoiceItem;
use App\Models\Supplier;
use App\Models\SystemConfiguration;
use App\Models\Tax;
use App\Models\Transport;
use App\Models\TransportEntry;
use App\Services\Documents\DocumentNumberService;
use App\Services\Documents\InvoiceOcrService;
use App\Services\Inventory\StockService;
use App\Services\Inventory\VariantResolverService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Throwable;

class InvoiceAiController extends Controller
{
    private const ADMIN_ROLES = ['super_admin', 'admin'];

    public function __construct(
        private readonly StockService $stockService,
        private readonly VariantResolverService $variantResolver
    ) {}

    // getEngineConfig/saveEngineConfig read and rewrite the single shared production .env file for
    // the whole platform -- unlike the company-scoped settings routes elsewhere in this controller
    // group, this isn't scoped to a tenant at all, so the usual "any authenticated user" pattern
    // used nearby would let any store employee rewrite (or via a newline-smuggled value, corrupt)
    // every tenant's shared API keys. Restricted to admin roles specifically for that reason.
    private function ensureAdmin(Request $request): ?HttpResponse
    {
        $role = $request->user()?->role;
        if (! in_array($role, self::ADMIN_ROLES, true)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        return null;
    }

    public function extract(Request $request, InvoiceOcrService $ocr)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:15360', 'mimes:pdf,jpg,jpeg,png,webp'],
        ]);

        try {
            return response()->json($ocr->extract($request->file('file')));
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Invoice OCR failed.',
            ], 422);
        }
    }

    public static function resolveStoredApiKey(string $configKey, string $fallbackConfigPath, string $envName): string
    {
        if (Schema::hasTable('system_configurations')) {
            $record = SystemConfiguration::withoutGlobalScopes()
                ->where('group', 'invoice_ai')
                ->where('key', $configKey)
                ->first();
            if ($record && ! empty($record->value)) {
                try {
                    return (string) Crypt::decryptString($record->value);
                } catch (Throwable) {
                    return (string) $record->value;
                }
            }
        }

        return (string) config($fallbackConfigPath, '');
    }

    private static function maskApiKey(string $key): string
    {
        if ($key === '') {
            return '';
        }
        if (strlen($key) < 12) {
            return str_repeat('*', 20);
        }

        return substr($key, 0, 4).str_repeat('*', 16);
    }

    private static function isMaskedPlaceholder(string $value): bool
    {
        return $value !== '' && (str_contains($value, '****') || preg_match('/^[A-Za-z0-9_-]{2,6}\.{3}[A-Za-z0-9_-]{2,4}$/', $value) === 1);
    }

    public function getEngineConfig(Request $request)
    {
        if ($forbidden = $this->ensureAdmin($request)) {
            return $forbidden;
        }

        $geminiKey = self::resolveStoredApiKey('gemini_api_key', 'services.gemini.key', 'GEMINI_API_KEY');
        $spaceOcrKey = self::resolveStoredApiKey('space_ocr_api_key', 'services.space_ocr.key', 'SPACE_OCR_API_KEY');
        $openaiKey = self::resolveStoredApiKey('openai_api_key', 'services.openai.key', 'OPENAI_API_KEY');
        $ocrSpaceKey = self::resolveStoredApiKey('ocr_space_api_key', 'ocr_space.key', 'OCR_SPACE_API_KEY');

        $activeEngine = 'in_app_builtin_engine';
        if ($geminiKey !== '') {
            $activeEngine = 'google-gemini-vision';
        } elseif ($spaceOcrKey !== '') {
            $activeEngine = 'space-ocr-markdown';
        } elseif ($openaiKey !== '') {
            $activeEngine = 'openai-vision';
        } elseif ($ocrSpaceKey !== '') {
            $activeEngine = 'ocr.space-engine-3';
        }

        return response()->json([
            'success' => true,
            'active_engine' => $activeEngine,
            'gemini' => [
                'configured' => $geminiKey !== '',
                'model' => config('services.gemini.model', 'gemini-3.6-flash'),
                'masked_key' => self::maskApiKey($geminiKey),
            ],
            'space_ocr' => [
                'configured' => $spaceOcrKey !== '',
                'masked_key' => self::maskApiKey($spaceOcrKey),
            ],
            'openai' => [
                'configured' => $openaiKey !== '',
                'model' => config('services.openai.model', 'gpt-4o-mini'),
                'masked_key' => self::maskApiKey($openaiKey),
            ],
            'ocr_space' => [
                'configured' => $ocrSpaceKey !== '',
                'masked_key' => self::maskApiKey($ocrSpaceKey),
            ],
        ]);
    }

    public function saveEngineConfig(Request $request)
    {
        if ($forbidden = $this->ensureAdmin($request)) {
            return $forbidden;
        }

        $noNewlines = 'regex:/^[^\r\n]*$/';
        $request->validate([
            'gemini_api_key' => ['nullable', 'string', 'max:512', $noNewlines],
            'space_ocr_api_key' => ['nullable', 'string', 'max:512', $noNewlines],
            'openai_api_key' => ['nullable', 'string', 'max:512', $noNewlines],
            'ocr_space_api_key' => ['nullable', 'string', 'max:512', $noNewlines],
        ]);

        if (Schema::hasTable('system_configurations')) {
            foreach (['gemini_api_key', 'space_ocr_api_key', 'openai_api_key', 'ocr_space_api_key'] as $keyName) {
                if ($request->has($keyName)) {
                    $rawVal = trim((string) $request->input($keyName, ''));
                    if (self::isMaskedPlaceholder($rawVal)) {
                        continue;
                    }
                    SystemConfiguration::withoutGlobalScopes()->updateOrCreate(
                        ['group' => 'invoice_ai', 'key' => $keyName],
                        [
                            'config_key' => $keyName,
                            'group_name' => 'invoice_ai',
                            'value' => $rawVal !== '' ? Crypt::encryptString($rawVal) : null,
                            'config_value' => $rawVal !== '' ? 'encrypted' : null,
                        ]
                    );
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'AI Engine configuration updated successfully.',
        ]);
    }

    /** Default margins on the purchase rate for new prices (selling price and MRP), remembered per store. */
    public const DEFAULT_MARGINS = ['selling_percent' => 25.0, 'mrp_percent' => 35.0];

    private const MARGINS_KEY = 'price_margins';

    /** The sizes (variants) of an existing product, for the line's Size picker: stock is kept per size. */
    public function productVariants(int $productId)
    {
        Product::findOrFail($productId); // This store's product only (Product is store-scoped; variants are not).
        $variants = ProductVariant::with('size:id,name')->where('product_id', $productId)->orderBy('id')->get()
            ->map(fn (ProductVariant $v) => ['id' => $v->id, 'label' => collect([$v->size?->name, $v->design_no ? 'Design '.$v->design_no : null, $v->sku])
                ->filter()->unique()->implode(' · ') ?: 'Variant #'.$v->id])->values();

        return response()->json(['success' => true, 'data' => $variants]);
    }

    /** The store's saved margins (the page's starting values). */
    public function margins()
    {
        return response()->json(['success' => true, 'data' => $this->storedMargins()]);
    }

    private function storedMargins(): array
    {
        $saved = Schema::hasTable('system_configurations')
            ? json_decode((string) SystemConfiguration::where('group', 'invoice_ai')->where('key', self::MARGINS_KEY)->value('value'), true)
            : null;

        return array_map('floatval', array_merge(self::DEFAULT_MARGINS, array_intersect_key(is_array($saved) ? $saved : [], self::DEFAULT_MARGINS)));
    }

    /** The margins this invoice used become the store's default for the next one. SystemConfiguration is store-scoped. */
    private function saveMargins(mixed $input): array
    {
        $margins = $this->storedMargins();
        if (! is_array($input)) {
            return $margins;
        }
        foreach (array_keys(self::DEFAULT_MARGINS) as $key) {
            if (isset($input[$key]) && is_numeric($input[$key])) {
                $margins[$key] = round((float) $input[$key], 2);
            }
        }
        if (Schema::hasTable('system_configurations')) {
            SystemConfiguration::updateOrCreate(['group' => 'invoice_ai', 'key' => self::MARGINS_KEY],
                ['config_key' => self::MARGINS_KEY, 'group_name' => 'invoice_ai', 'value' => json_encode($margins)]);
        }

        return $margins;
    }

    private static function withMargin(float $rate, float $percent): float
    {
        return round($rate * (1 + $percent / 100), 2);
    }

    /** The selling price / MRP this invoice line sets on an existing product or variant, if they differ. */
    private function priceChange(Product|ProductVariant $record, array $item): array
    {
        $change = [];
        foreach (['selling_price', 'mrp'] as $field) {
            $value = round((float) ($item[$field] ?? 0), 2);
            if ($value > 0 && abs($value - (float) $record->{$field}) >= 0.01) {
                $change[$field] = $value;
            }
        }

        return $change;
    }

    public function processPurchaseFlow(ProcessPurchaseFlowRequest $request)
    {
        // Stock is kept per size: an existing product that has sizes needs the line's size, or the units would be
        // booked to a row no bill or barcode uses.
        foreach ($request->input('items', []) as $index => $item) {
            if (! empty($item['is_new_product']) || empty($item['product_id']) || ! empty($item['variant_id']) || ! empty($item['variantId'])) {
                continue;
            }
            if (ProductVariant::where('product_id', (int) $item['product_id'])->exists()) {
                return response()->json(['success' => false,
                    'message' => 'Line '.($index + 1).' ('.($item['description'] ?? 'item').'): choose its size - this product keeps stock per size.'], 422);
            }
        }

        $storeId = (int) $this->resolveStoreId($request, 1);

        try {
            $result = DB::transaction(function () use ($request, $storeId) {
                $supplierData = $request->input('supplier', []);
                $invoiceData = $request->input('invoice', []);
                $transportData = $request->input('transport', []);
                $itemsData = $request->input('items', []);
                $generateBarcodes = $request->boolean('generate_barcodes', true);
                $margins = $this->saveMargins($request->input('margins'));
                $newProductIds = [];
                $pricesUpdated = [];

                // 1. Resolve or create Supplier
                $supplier = null;
                if (! empty($supplierData['id'])) {
                    $supplier = Supplier::find($supplierData['id']);
                }
                if (! $supplier && ! empty($supplierData['gstin'])) {
                    $supplier = Supplier::where('gstin', $supplierData['gstin'])->first();
                }
                if (! $supplier && ! empty($supplierData['name'])) {
                    $supplier = Supplier::where('name', $supplierData['name'])->first();
                }
                if (! $supplier && ! empty($supplierData['name'])) {
                    $supplier = Supplier::create([
                        'name' => $supplierData['name'],
                        'gstin' => $supplierData['gstin'] ?? null,
                        'phone' => $supplierData['phone'] ?? null,
                        'address' => $supplierData['address'] ?? null,
                        'is_active' => 1,
                    ]);
                }
                if (! $supplier) {
                    $supplier = Supplier::first() ?: Supplier::create([
                        'name' => 'Default Supplier',
                        'code' => 'SUP_DEF',
                        'is_active' => 1,
                    ]);
                }

                // 2. Resolve or create Transport & Transport Entry
                $transport = null;
                if (! empty($transportData['transport_id'])) {
                    $transport = Transport::find($transportData['transport_id']);
                }
                if (! $transport && ! empty($transportData['transport_name'])) {
                    $transport = Transport::where('name', $transportData['transport_name'])->first();
                }
                if (! $transport && ! empty($transportData['transport_name'])) {
                    $transport = Transport::create([
                        'name' => $transportData['transport_name'],
                        'code' => Transport::pendingCode(), // Becomes TRP<id> (NumbersCodeFromId).
                    ]);
                }
                if (! $transport) {
                    $transport = Transport::first() ?: Transport::create([
                        'name' => 'Direct Transport',
                        'code' => 'TRP_DIR',
                    ]);
                }

                $lrNo = ! empty($transportData['lr_no'])
                    ? $transportData['lr_no']
                    : DocumentNumberService::resolve($request, $storeId, 'LR');

                $transportEntry = TransportEntry::create([
                    'transport_id' => $transport->id,
                    'lr_no' => $lrNo,
                    'lr_date' => $transportData['lr_date'] ?? now()->toDateString(),
                    'source' => $supplier->city ?? $supplier->name ?? 'Supplier Hub',
                    'destination' => 'Main Warehouse',
                    'packages_count' => max(1, (int) ($transportData['packages_count'] ?? 1)),
                    'weight_kg' => (float) ($transportData['weight_kg'] ?? 0),
                    'freight_charges' => (float) ($transportData['freight_charges'] ?? 0),
                    'status' => 'RECEIVED',
                ]);

                // 3. Create Purchase Invoice
                $invoiceNo = ! empty($invoiceData['invoice_no'])
                    ? $invoiceData['invoice_no']
                    : DocumentNumberService::resolve($request, $storeId, 'PINV');

                $subtotal = (float) ($invoiceData['subtotal'] ?? 0);
                $taxAmount = (float) ($invoiceData['tax_amount'] ?? 0);
                $grandTotal = (float) ($invoiceData['grand_total'] ?? ($subtotal + $taxAmount));

                $purchaseInvoice = PurchaseInvoice::create([
                    'store_id' => $storeId,
                    'supplier_id' => $supplier->id,
                    'transport_id' => $transport->id,
                    'invoice_no' => $invoiceNo,
                    'invoice_date' => $invoiceData['invoice_date'] ?? now()->toDateString(),
                    'supplier_invoice_no' => $invoiceData['supplier_invoice_no'] ?? $invoiceData['invoice_no'] ?? null,
                    'supplier_invoice_date' => $invoiceData['invoice_date'] ?? now()->toDateString(),
                    'subtotal' => $subtotal,
                    'tax_amount' => $taxAmount,
                    'discount_amount' => (float) ($invoiceData['discount_amount'] ?? 0),
                    'round_off' => (float) ($invoiceData['round_off'] ?? 0),
                    'grand_total' => $grandTotal,
                    'paid_amount' => 0,
                    'payment_status' => 'UNPAID',
                    'status' => 'APPROVED',
                    'notes' => $invoiceData['notes'] ?? 'Auto-inwarded via Invoice AI',
                    'created_by' => $request->user()->id ?? 1,
                ]);

                // 4. Create Inventory Entry Shell
                $inventoryEntry = InventoryEntry::create([
                    'store_id' => $storeId,
                    'entry_no' => DocumentNumberService::resolve($request, $storeId, 'IE'),
                    'entry_date' => $invoiceData['invoice_date'] ?? now()->toDateString(),
                    'type' => 'PURCHASE',
                    // Linked to its LR and supplier, so its barcodes are found for this transport entry (Barcode Search).
                    'transport_entry_id' => $transportEntry->id,
                    'supplier_id' => $supplier->id,
                    'total_amount' => $grandTotal,
                    'notes' => "Invoice AI inward for PINV #{$invoiceNo}, Transport Entry #{$transportEntry->id}",
                    'status' => 'COMPLETED',
                    'created_by' => $request->user()->id ?? 1,
                ]);

                // 5. Process Line Items (Resolve or Create Product, Create Invoice Item & Inventory Item, Adjust Stock)
                $resolvedItems = [];
                $newProductsCreated = [];

                foreach ($itemsData as $idx => $item) {
                    $product = null;
                    $isNew = ! empty($item['is_new_product']);

                    if (! $isNew && ! empty($item['product_id'])) {
                        $product = Product::find($item['product_id']);
                    }

                    if (! $product) {
                        $desc = trim($item['description'] ?? '');
                        if ($desc !== '') {
                            $product = Product::where('name', $desc)
                                ->orWhere('code', $desc)
                                ->orWhere('barcode', $desc)
                                ->first();
                        }
                    }

                    if (! $product) {
                        // Create New Product in Master
                        $newProd = $item['new_product_data'] ?? [];
                        $pName = trim($newProd['name'] ?? $item['description'] ?? 'Product '.($idx + 1));
                        // Without a code it is numbered PRD<id> (NumbersCodeFromId), the same on the cloud and on-prem.
                        $pCode = trim($newProd['code'] ?? '') ?: Product::pendingCode();
                        $pRate = (float) ($item['rate'] ?? $newProd['cost_price'] ?? 0);
                        $pSelling = (float) (($newProd['selling_price'] ?? null) ?: ($item['selling_price'] ?? null) ?: self::withMargin($pRate, $margins['selling_percent']));
                        $pMrp = (float) (($newProd['mrp'] ?? null) ?: ($item['mrp'] ?? null) ?: self::withMargin($pRate, $margins['mrp_percent']));

                        $product = Product::create([
                            'name' => $pName,
                            'code' => $pCode,
                            'sku' => $newProd['sku'] ?? $pCode,
                            'barcode' => $newProd['barcode'] ?? $pCode,
                            // Without a choice, this store's first category and tax (models are store-scoped).
                            'category_id' => ($newProd['category_id'] ?? null) ?: Category::orderBy('id')->value('id'),
                            'brand_id' => $newProd['brand_id'] ?? null,
                            'tax_id' => ($newProd['tax_id'] ?? null) ?: Tax::orderBy('id')->value('id'),
                            'unit' => $newProd['unit'] ?? $item['unit'] ?? 'Pcs',
                            'hsn_code' => $newProd['hsn_code'] ?? $item['hsn'] ?? null,
                            'cost_price' => $pRate,
                            'selling_price' => $pSelling,
                            'mrp' => $pMrp,
                            'is_active' => 1,
                        ]);

                        $newProductsCreated[] = $product;
                        $newProductIds[$product->id] = true;
                    }

                    $qty = max(0.01, (float) ($item['quantity'] ?? 1));
                    $rate = (float) ($item['rate'] ?? $product->cost_price ?? 0);
                    $taxAmt = (float) ($item['tax_amount'] ?? 0);
                    $disc = (float) ($item['discount'] ?? 0);
                    $total = ($qty * $rate) + $taxAmt - $disc;

                    $variantId = $this->variantResolver->resolveFromItemArray($item, (int) $product->id);

                    // Add PurchaseInvoiceItem
                    PurchaseInvoiceItem::create([
                        'purchase_invoice_id' => $purchaseInvoice->id,
                        'product_id' => $product->id,
                        'variant_id' => $variantId,
                        'quantity' => $qty,
                        'rate' => $rate,
                        'tax_id' => $item['tax_id'] ?? $product->tax_id ?? null,
                        'tax_amount' => $taxAmt,
                        'discount' => $disc,
                        'total' => $total,
                    ]);

                    // Add InventoryEntryItem
                    $invItem = InventoryEntryItem::create([
                        'inventory_entry_id' => $inventoryEntry->id,
                        'product_id' => $product->id,
                        'variant_id' => $variantId,
                        'quantity' => $qty,
                        'unit_price' => $rate,
                        'total_price' => $qty * $rate,
                    ]);

                    // Adjust Stock
                    $this->stockService->adjust(
                        storeId: $storeId,
                        productId: (int) $product->id,
                        variantId: $variantId,
                        delta: $qty,
                        referenceType: 'PURCHASE_INVOICE',
                        referenceId: $purchaseInvoice->id,
                        costPrice: $rate,
                        userId: $request->user()?->id
                    );

                    $resolvedItems[] = [
                        'product' => $product,
                        'inventory_item_id' => $invItem->id,
                        'quantity' => $qty,
                        'rate' => $rate,
                        'selling_price' => (float) (($item['selling_price'] ?? null) ?: ($product->selling_price ?: self::withMargin($rate, $margins['selling_percent']))),
                        'mrp' => (float) (($item['mrp'] ?? null) ?: ($product->mrp ?: self::withMargin($rate, $margins['mrp_percent']))),
                    ];

                    // An existing product takes this invoice's selling price and MRP (supplier prices go up).
                    if (! isset($newProductIds[$product->id])) {
                        if ($change = $this->priceChange($product, $item)) {
                            $product->update($change);
                            $pricesUpdated[] = ['product_id' => $product->id, 'name' => $product->name, ...$change];
                        }
                        $variant = $variantId ? ProductVariant::find($variantId) : null;
                        if ($variant && ((float) $variant->selling_price > 0 || (float) $variant->mrp > 0) && ($change = $this->priceChange($variant, $item))) {
                            $variant->update($change);
                        }
                    }
                }

                // 6. Generate Barcodes
                $createdBarcodes = [];
                if ($generateBarcodes) {
                    foreach ($resolvedItems as $ritem) {
                        $prod = $ritem['product'];
                        $barcodeVal = $prod->barcode ?: 'BC'.str_pad((string) $prod->id, 6, '0', STR_PAD_LEFT);
                        $barcode = Barcode::create([
                            'barcode' => $barcodeVal,
                            'batch_no' => 'BATCH-'.date('ymd').'-'.$inventoryEntry->id,
                            'product_id' => $prod->id,
                            'product_name' => $prod->name,
                            'inventory_entry_id' => $inventoryEntry->id,
                            'inventory_item_id' => $ritem['inventory_item_id'],
                            'mrp' => $ritem['mrp'],
                            'selling_price' => $ritem['selling_price'],
                            'qty' => (int) ceil($ritem['quantity']),
                            'code_type' => $request->input('code_type', 'barcode'),
                            'is_active' => 1,
                        ]);
                        $createdBarcodes[] = $barcode;
                    }
                }

                return [
                    'transport_entry' => $transportEntry->load('transport'),
                    'purchase_invoice' => $purchaseInvoice->load('supplier'),
                    'inventory_entry' => $inventoryEntry,
                    'new_products_created' => $newProductsCreated,
                    'total_items_processed' => count($resolvedItems),
                    'barcodes' => $createdBarcodes,
                    'barcodes_count' => count($createdBarcodes),
                    'prices_updated' => $pricesUpdated,
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Purchase entry inwarding flow created successfully.',
                'data' => $result,
            ], 201);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => config('app.debug') ? 'Failed to process purchase entry flow: '.$e->getMessage() : 'Failed to process purchase entry flow.',
            ], 422);
        }
    }
}
