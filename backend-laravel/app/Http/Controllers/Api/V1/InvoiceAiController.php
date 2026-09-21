<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Barcode;
use App\Models\InventoryEntry;
use App\Models\InventoryEntryItem;
use App\Models\Product;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseInvoiceItem;
use App\Models\Supplier;
use App\Models\Transport;
use App\Models\TransportEntry;
use App\Services\DocumentNumberService;
use App\Services\InvoiceOcrService;
use App\Services\StockService;
use App\Services\VariantResolverService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
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

    public function getEngineConfig(Request $request)
    {
        if ($forbidden = $this->ensureAdmin($request)) {
            return $forbidden;
        }

        $geminiKey = (string) (config('services.gemini.key') ?: env('GEMINI_API_KEY'));
        $spaceOcrKey = (string) (config('services.space_ocr.key') ?: env('SPACE_OCR_API_KEY'));
        $openaiKey = (string) (config('services.openai.key') ?: env('OPENAI_API_KEY'));
        $ocrSpaceKey = (string) (config('ocr_space.key') ?: env('OCR_SPACE_API_KEY'));

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
                'masked_key' => $geminiKey ? substr($geminiKey, 0, 4) . '...' . substr($geminiKey, -4) : '',
            ],
            'space_ocr' => [
                'configured' => $spaceOcrKey !== '',
                'masked_key' => $spaceOcrKey ? substr($spaceOcrKey, 0, 6) . '...' . substr($spaceOcrKey, -4) : '',
            ],
            'openai' => [
                'configured' => $openaiKey !== '',
                'model' => config('services.openai.model', 'gpt-4o-mini'),
                'masked_key' => $openaiKey ? substr($openaiKey, 0, 4) . '...' . substr($openaiKey, -4) : '',
            ],
            'ocr_space' => [
                'configured' => $ocrSpaceKey !== '',
                'masked_key' => $ocrSpaceKey ? substr($ocrSpaceKey, 0, 4) . '...' . substr($ocrSpaceKey, -4) : '',
            ],
        ]);
    }

    public function saveEngineConfig(Request $request)
    {
        if ($forbidden = $this->ensureAdmin($request)) {
            return $forbidden;
        }

        // regex excludes newlines/carriage returns -- without this, a value like
        // "x\nDB_PASSWORD=whatever" gets spliced straight into .env below via preg_replace/
        // file_put_contents and silently adds (or overwrites) an unrelated env var, since a
        // "nullable|string" rule alone doesn't reject control characters.
        $noNewlines = 'regex:/^[^\r\n]*$/';
        $request->validate([
            'gemini_api_key' => ['nullable', 'string', $noNewlines],
            'space_ocr_api_key' => ['nullable', 'string', $noNewlines],
            'ocr_space_api_key' => ['nullable', 'string', $noNewlines],
        ]);

        $envFile = base_path('.env');
        if (!file_exists($envFile)) {
            return response()->json(['success' => false, 'message' => '.env file not found.'], 500);
        }

        $envContent = file_get_contents($envFile);

        if ($request->has('gemini_api_key')) {
            $val = trim($request->input('gemini_api_key', ''));
            if (preg_match('/^GEMINI_API_KEY=.*$/m', $envContent)) {
                $envContent = preg_replace('/^GEMINI_API_KEY=.*$/m', "GEMINI_API_KEY={$val}", $envContent);
            } else {
                $envContent .= "\nGEMINI_API_KEY={$val}";
            }
        }

        if ($request->has('space_ocr_api_key')) {
            $val = trim($request->input('space_ocr_api_key', ''));
            if (preg_match('/^SPACE_OCR_API_KEY=.*$/m', $envContent)) {
                $envContent = preg_replace('/^SPACE_OCR_API_KEY=.*$/m', "SPACE_OCR_API_KEY={$val}", $envContent);
            } else {
                $envContent .= "\nSPACE_OCR_API_KEY={$val}";
            }
        }

        if ($request->has('ocr_space_api_key')) {
            $val = trim($request->input('ocr_space_api_key', ''));
            if (preg_match('/^OCR_SPACE_API_KEY=.*$/m', $envContent)) {
                $envContent = preg_replace('/^OCR_SPACE_API_KEY=.*$/m', "OCR_SPACE_API_KEY={$val}", $envContent);
            } else {
                $envContent .= "\nOCR_SPACE_API_KEY={$val}";
            }
        }

        file_put_contents($envFile, $envContent);

        return response()->json([
            'success' => true,
            'message' => 'AI Engine configuration updated successfully.',
        ]);
    }

    public function processPurchaseFlow(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'supplier' => 'required|array',
            'invoice' => 'required|array',
            'items' => 'required|array|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $storeId = (int) $request->header('X-Company-Scope-Id', 1);

        try {
            $result = DB::transaction(function () use ($request, $storeId) {
                $supplierData = $request->input('supplier', []);
                $invoiceData = $request->input('invoice', []);
                $transportData = $request->input('transport', []);
                $itemsData = $request->input('items', []);
                $generateBarcodes = $request->boolean('generate_barcodes', true);

                // 1. Resolve or create Supplier
                $supplier = null;
                if (!empty($supplierData['id'])) {
                    $supplier = Supplier::find($supplierData['id']);
                }
                if (!$supplier && !empty($supplierData['gstin'])) {
                    $supplier = Supplier::where('gstin', $supplierData['gstin'])->first();
                }
                if (!$supplier && !empty($supplierData['name'])) {
                    $supplier = Supplier::where('name', $supplierData['name'])->first();
                }
                if (!$supplier && !empty($supplierData['name'])) {
                    $supplier = Supplier::create([
                        'name' => $supplierData['name'],
                        'gstin' => $supplierData['gstin'] ?? null,
                        'phone' => $supplierData['phone'] ?? null,
                        'address' => $supplierData['address'] ?? null,
                        'is_active' => 1,
                    ]);
                }
                if (!$supplier) {
                    $supplier = Supplier::first() ?: Supplier::create([
                        'name' => 'Default Supplier',
                        'code' => 'SUP_DEF',
                        'is_active' => 1,
                    ]);
                }

                // 2. Resolve or create Transport & Transport Entry
                $transport = null;
                if (!empty($transportData['transport_id'])) {
                    $transport = Transport::find($transportData['transport_id']);
                }
                if (!$transport && !empty($transportData['transport_name'])) {
                    $transport = Transport::where('name', $transportData['transport_name'])->first();
                }
                if (!$transport && !empty($transportData['transport_name'])) {
                    $transport = Transport::create([
                        'name' => $transportData['transport_name'],
                        'code' => 'TRP_' . strtoupper(substr(uniqid(), -6)),
                    ]);
                }
                if (!$transport) {
                    $transport = Transport::first() ?: Transport::create([
                        'name' => 'Direct Transport',
                        'code' => 'TRP_DIR',
                    ]);
                }

                $lrNo = !empty($transportData['lr_no'])
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
                $invoiceNo = !empty($invoiceData['invoice_no'])
                    ? $invoiceData['invoice_no']
                    : 'PINV-' . date('Ymd') . '-' . rand(1000, 9999);

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
                    'created_by' => $request->user()?->id ?? 1,
                ]);

                // 4. Create Inventory Entry Shell
                $inventoryEntry = InventoryEntry::create([
                    'store_id' => $storeId,
                    'entry_no' => 'INV-ENT-' . date('Ymd') . '-' . rand(1000, 9999),
                    'entry_date' => $invoiceData['invoice_date'] ?? now()->toDateString(),
                    'type' => 'PURCHASE',
                    'total_amount' => $grandTotal,
                    'notes' => "Invoice AI inward for PINV #{$invoiceNo}, Transport Entry #{$transportEntry->id}",
                    'status' => 'COMPLETED',
                    'created_by' => $request->user()?->id ?? 1,
                ]);

                // 5. Process Line Items (Resolve or Create Product, Create Invoice Item & Inventory Item, Adjust Stock)
                $resolvedItems = [];
                $newProductsCreated = [];

                foreach ($itemsData as $idx => $item) {
                    $product = null;
                    $isNew = !empty($item['is_new_product']);

                    if (!$isNew && !empty($item['product_id'])) {
                        $product = Product::find($item['product_id']);
                    }

                    if (!$product) {
                        $desc = trim($item['description'] ?? '');
                        if ($desc !== '') {
                            $product = Product::where('name', $desc)
                                ->orWhere('code', $desc)
                                ->orWhere('barcode', $desc)
                                ->first();
                        }
                    }

                    if (!$product) {
                        // Create New Product in Master
                        $newProd = $item['new_product_data'] ?? [];
                        $pName = trim($newProd['name'] ?? $item['description'] ?? "Product " . ($idx + 1));
                        $pCode = trim($newProd['code'] ?? '') ?: ('PRD_' . strtoupper(substr(uniqid(), -6)));
                        $pRate = (float) ($item['rate'] ?? $newProd['cost_price'] ?? 0);
                        $pSelling = (float) ($newProd['selling_price'] ?? $item['selling_price'] ?? ($pRate * 1.25));
                        $pMrp = (float) ($newProd['mrp'] ?? $item['mrp'] ?? ($pRate * 1.35));

                        $product = Product::create([
                            'name' => $pName,
                            'code' => $pCode,
                            'sku' => $newProd['sku'] ?? $pCode,
                            'barcode' => $newProd['barcode'] ?? $pCode,
                            'category_id' => $newProd['category_id'] ?? 1,
                            'brand_id' => $newProd['brand_id'] ?? null,
                            'tax_id' => $newProd['tax_id'] ?? 1,
                            'unit' => $newProd['unit'] ?? $item['unit'] ?? 'Pcs',
                            'hsn_code' => $newProd['hsn_code'] ?? $item['hsn'] ?? null,
                            'cost_price' => $pRate,
                            'selling_price' => $pSelling,
                            'mrp' => $pMrp,
                            'is_active' => 1,
                        ]);

                        $newProductsCreated[] = $product;
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
                        'selling_price' => (float) ($item['selling_price'] ?? $product->selling_price ?? ($rate * 1.25)),
                        'mrp' => (float) ($item['mrp'] ?? $product->mrp ?? ($rate * 1.35)),
                    ];
                }

                // 6. Generate Barcodes
                $createdBarcodes = [];
                if ($generateBarcodes) {
                    foreach ($resolvedItems as $ritem) {
                        $prod = $ritem['product'];
                        $barcodeVal = $prod->barcode ?: ('BC' . date('ymd') . str_pad((string) rand(1, 99999), 5, '0', STR_PAD_LEFT));
                        $barcode = Barcode::create([
                            'barcode' => $barcodeVal,
                            'batch_no' => 'BATCH-' . date('ymd') . '-' . $inventoryEntry->id,
                            'product_id' => $prod->id,
                            'product_name' => $prod->name,
                            'inventory_entry_id' => $inventoryEntry->id,
                            'inventory_item_id' => $ritem['inventory_item_id'],
                            'mrp' => $ritem['mrp'],
                            'selling_price' => $ritem['selling_price'],
                            'qty' => (int) ceil($ritem['quantity']),
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
                'message' => 'Failed to process purchase entry flow: ' . $e->getMessage(),
            ], 422);
        }
    }
}
