<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientStockException;
use App\Exceptions\PosReturnCreditUnavailableException;
use App\Http\Controllers\Controller;
use App\Models\Barcode;
use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\PosPayment;
use App\Models\PosReturn;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Customer;
use App\Models\CreditLedger;
use App\Models\LoyaltyTransaction;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PosSaleController extends Controller
{
    public function __construct(private readonly StockService $stockService)
    {
    }

    public function nextBillNo(Request $request)
    {
        $dateStr = now()->format('Ymd');
        $lastSale = PosSale::whereDate('created_at', now()->toDateString())->latest('id')->first();
        $seq = $lastSale ? ($lastSale->id + 1) : 1;
        $billNo = 'INV-' . $dateStr . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'data'    => [
                'bill_no'    => $billNo,
                'invoice_no' => $billNo,
                'date'       => now()->toIso8601String(),
            ],
        ]);
    }

    public function barcodes(Request $request)
    {
        $barcode = $request->input('barcode') ?? $request->input('q') ?? $request->input('search');
        if (!$barcode) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);

        // Per-unit/per-variant barcode first - this is what Direct Purchase
        // + Barcode Generation actually produce (PIECE: one row per unit,
        // PACK/CUT: one shared row per variant). Falls back to the older
        // single barcode-per-product match below for anything that never
        // went through that flow (e.g. bulk-imported products).
        $barcodeRow = Barcode::where('barcode', $barcode)
            ->where('is_active', true)
            ->with(['product.category', 'product.brand', 'product.tax', 'variant'])
            ->first();

        if ($barcodeRow && $barcodeRow->product) {
            $product = $barcodeRow->product;
            $sellingMode = strtoupper((string) ($product->selling_mode ?: 'PIECE'));
            $variantId = $barcodeRow->variant_id;

            $stockQty = $variantId
                ? (float) (Stock::where('store_id', $storeId)->where('variant_id', $variantId)->value('quantity') ?? 0)
                : (float) (Stock::where('store_id', $storeId)->where('product_id', $product->id)->whereNull('variant_id')->value('quantity') ?? 0);

            return response()->json([
                'success' => true,
                'data'    => [
                    'id'                     => $product->id,
                    'name'                   => $product->name,
                    'code'                   => $product->code,
                    'barcode'                => $barcodeRow->barcode,
                    'barcodeId'              => $barcodeRow->id,
                    'variantId'              => $variantId,
                    'sellingMode'            => $sellingMode,
                    'requiresQuantityPrompt' => in_array($sellingMode, ['PACK', 'CUT'], true),
                    'sku'                    => $product->sku,
                    'selling_price'          => (float) $barcodeRow->selling_price,
                    'mrp'                    => (float) $barcodeRow->mrp,
                    'discount_perc'          => (float) $barcodeRow->discount_perc,
                    'final_price'            => (float) $barcodeRow->final_price,
                    'tax_rate'               => $product->tax ? (float) $product->tax->rate : 0.00,
                    'stock_qty'              => $stockQty,
                    'product'                => $product,
                ],
            ]);
        }

        $product = Product::with(['category', 'brand', 'tax', 'stocks'])
            ->where('barcode', $barcode)
            ->orWhere('code', $barcode)
            ->orWhere('sku', $barcode)
            ->first();

        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Barcode not found', 'data' => null], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'                     => $product->id,
                'name'                   => $product->name,
                'code'                   => $product->code,
                'barcode'                => $product->barcode,
                'barcodeId'              => null,
                'variantId'              => null,
                'sellingMode'            => strtoupper((string) ($product->selling_mode ?: 'PIECE')),
                'requiresQuantityPrompt' => false,
                'sku'                    => $product->sku,
                'selling_price'          => (float) $product->selling_price,
                'mrp'                    => (float) $product->mrp,
                'tax_rate'               => $product->tax ? (float) $product->tax->rate : 0.00,
                'stock_qty'              => (float) ($product->stocks->sum('quantity') ?? 0),
                'product'                => $product,
            ],
        ]);
    }

    public function stockProducts(Request $request)
    {
        $search = $request->input('search') ?? $request->input('q') ?? '';
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $query = Stock::with(['product.brand', 'product.category', 'product.tax'])
            ->where('store_id', $storeId)
            ->where('quantity', '>', 0)
            ->whereHas('product', function ($q) use ($search) {
                if ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('barcode', 'like', "%{$search}%");
                }
            });

        // POSSales.jsx does live search-as-you-type (small, frequent
        // requests - the 50 cap keeps those fast); POSOld.jsx instead
        // pre-loads the whole in-stock catalog once for client-side
        // filtering, so it needs the same all=true escape hatch every
        // other list endpoint in this app already supports.
        $stocks = $request->boolean('all') ? $query->limit(2000)->get() : $query->limit(50)->get();

        $data = $stocks->map(function ($s) {
            $sellingMode = strtoupper((string) ($s->product?->selling_mode ?: 'PIECE'));

            return [
                'id'                     => $s->product_id,
                'productId'              => $s->product_id,
                'variantId'              => $s->variant_id,
                'sellingMode'            => $sellingMode,
                'requiresQuantityPrompt' => in_array($sellingMode, ['PACK', 'CUT'], true),
                'barcode'     => $s->product?->barcode,
                'code'        => $s->product?->code,
                'productName' => $s->product?->name,
                'qty'         => (float) $s->quantity,
                'mrp'         => (float) ($s->product?->mrp ?? 0),
                'price'       => (float) ($s->product?->selling_price ?? 0),
                'cost'        => (float) ($s->product?->cost_price ?? 0),
                'tax'         => (float) ($s->product?->tax?->rate ?? 0),
                'taxName'     => $s->product?->tax?->name,
                'taxType'     => $s->product?->tax?->type,
                'brandId'     => $s->product?->brand_id,
                'brandName'   => $s->product?->brand?->name,
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }

    public function posReturns(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [],
            'pagination' => ['total' => 0, 'current_page' => 1, 'last_page' => 1, 'per_page' => 50],
        ]);
    }

    public function touchSales(Request $request)
    {
        $products = Product::where('is_active', true)->with(['category', 'tax'])->limit(30)->get();
        return response()->json([
            'success' => true,
            'data'    => $products,
        ]);
    }

    public function posOldSales(Request $request)
    {
        $limit = max(1, (int) $request->input('limit', 50));
        $sales = PosSale::with(['customer', 'items.product'])->orderByDesc('id')->paginate($limit);
        return response()->json([
            'success' => true,
            'data'    => $sales->items(),
            'pagination' => [
                'total'        => $sales->total(),
                'current_page' => $sales->currentPage(),
                'last_page'    => $sales->lastPage(),
            ],
        ]);
    }

    public function index(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id');

        $query = PosSale::with(['customer', 'user', 'items.product', 'items.barcode', 'payments'])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('store_id', $storeId))
            ->orderBy('id', 'desc');

        // SalesReports.jsx's getAllRows() helper always asks for all=true so
        // it can aggregate every sale client-side - unlike every sibling
        // list endpoint in this app, this one never honored that, so every
        // report on that page was silently capped at the 50 most recent
        // sales regardless of the report's actual date range.
        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000], true)) {
            $sales = $query->limit(2000)->get();

            return response()->json([
                'success' => true,
                'data'    => $sales,
                'total'   => $sales->count(),
            ]);
        }

        $limit = max(1, (int) $request->input('limit', 50));
        $sales = $query->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => $sales->items(),
            'pagination' => [
                'total'        => $sales->total(),
                'current_page' => $sales->currentPage(),
                'last_page'    => $sales->lastPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $sale = PosSale::with(['customer', 'user', 'items.product', 'payments'])->findOrFail($id);
        return response()->json([
            'success' => true,
            'data'    => $this->withBillNo($sale),
        ]);
    }

    /**
     * POST /pos-old-sales - POSOld.jsx's payload shape predates and
     * differs from store()'s (barcodeId instead of productId,
     * discountAmt instead of discount, paidCash instead of cashAmount,
     * no card/UPI split) - this translates it and delegates to the same
     * store() logic rather than duplicating the sale-creation/stock/
     * batch/loyalty flow a second time.
     *
     * Exchange checkout (isExchange: true) is explicitly rejected for
     * now - the frontend only sends a net returnAmount figure, not which
     * specific items were returned, so there's nothing here yet that can
     * correctly reverse the returned items' stock or record a proper
     * PosReturn - deferred as its own piece of work rather than silently
     * completing a sale that drops the return side.
     */
    public function storeLegacy(Request $request)
    {
        if ($request->boolean('isExchange')) {
            return response()->json([
                'success' => false,
                'message' => 'Exchange checkout is not supported yet - please record the return and the new sale separately.',
            ], 422);
        }

        $items = collect($request->input('items', []))->map(fn ($item) => [
            'productId' => $item['barcodeId'] ?? null,
            'variantId' => $item['variantId'] ?? null,
            'qty'       => $item['qty'] ?? null,
            'price'     => $item['price'] ?? null,
            'mrp'       => $item['mrp'] ?? null,
            'discount'  => $item['discountAmt'] ?? 0,
        ])->all();

        $request->merge([
            'items'      => $items,
            'customerId' => $request->input('customerId'),
            'customer'   => $request->input('customer'),
            'cashAmount' => $request->input('paidCash', 0),
        ]);

        return $this->store($request);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items'                => 'required|array|min:1',
            'items.*.productId'   => 'required|exists:products,id',
            'items.*.qty'         => 'required|numeric|min:0.01',
            'items.*.price'       => 'required|numeric|min:0',
            'customerId'          => 'nullable|exists:customers,id',
            'cashAmount'          => 'nullable|numeric|min:0',
            'cardAmount'          => 'nullable|numeric|min:0',
            'upiAmount'           => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            return DB::transaction(function () use ($request) {
                $user = $request->user();
                $storeId = $request->header('X-Company-Scope-Id') ?: ($user->store_id ?? $request->input('store_id', 1));

                // Resolve customer: an existing id, or a lightweight walk-in
                // record from the ad-hoc {name, mobileNo} the UI collects for
                // a "temporary" customer - mirrors
                // CustomerOrderController::customerQuickCreate().
                $customerId = $request->input('customerId');
                $customerPayload = $request->input('customer');
                if (!$customerId && is_array($customerPayload) && !empty($customerPayload['name'])) {
                    $customerId = Customer::create([
                        'name'      => $customerPayload['name'],
                        'code'      => 'CUST_' . strtoupper(substr(uniqid(), -6)),
                        'phone'     => $customerPayload['mobileNo'] ?? null,
                        'is_active' => true,
                    ])->id;
                }

                // Applied-return-credit: re-fetch and lock server-side -
                // never trust the client's refundAmount/receivedAmount math
                // for this, same principle as Settlement's reconciliation.
                $appliedReturn = null;
                $creditAmount = 0;
                $appliedPosReturnId = $request->input('appliedPosReturnId');
                if ($appliedPosReturnId) {
                    $appliedReturn = PosReturn::where('id', $appliedPosReturnId)
                        ->where('store_id', $storeId)
                        ->lockForUpdate()
                        ->first();

                    if (!$appliedReturn || $appliedReturn->credit_applied_to_sale_id) {
                        throw new PosReturnCreditUnavailableException();
                    }
                    $creditAmount = (float) $appliedReturn->total_refund;
                }

                $itemsData = $request->input('items');

                $subtotal = 0;
                $taxTotal = 0;
                $discountTotal = 0;
                $totalQty = 0;
                foreach ($itemsData as $item) {
                    $qty = (float) $item['qty'];
                    $price = (float) $item['price'];
                    $disc = (float) ($item['discount'] ?? 0);
                    $taxRate = (float) ($item['tax'] ?? 0);

                    $lineSub = ($qty * $price) - $disc;
                    $lineTax = ($lineSub * $taxRate) / 100;

                    $subtotal += $lineSub;
                    $taxTotal += $lineTax;
                    $discountTotal += $disc;
                    $totalQty += $qty;
                }

                $grandTotal = $subtotal + $taxTotal;
                $netPayable = max(0, $grandTotal - $creditAmount);

                $cashAmount = (float) $request->input('cashAmount', 0);
                $cardAmount = (float) $request->input('cardAmount', 0);
                $upiAmount  = (float) $request->input('upiAmount', 0);
                $isCredit   = $request->boolean('isCredit');
                $paid       = $cashAmount + $cardAmount + $upiAmount;
                $change     = max(0, $paid - $netPayable);

                $paymentMode = $isCredit || $paid <= 0
                    ? 'CREDIT'
                    : ($cashAmount > 0 ? 'CASH' : ($cardAmount > 0 ? 'CARD' : 'UPI'));

                $invoiceNo = 'INV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));

                $sale = PosSale::create([
                    'store_id'                 => $storeId,
                    'customer_id'              => $customerId,
                    'user_id'                  => $user->id ?? 1,
                    'invoice_no'               => $invoiceNo,
                    'sale_date'                => now(),
                    'total_items'              => count($itemsData),
                    'total_qty'                => $totalQty,
                    'subtotal'                 => $subtotal,
                    'discount_amount'          => $discountTotal,
                    'tax_amount'               => $taxTotal,
                    'round_off'                => 0,
                    'grand_total'              => $grandTotal,
                    'paid_amount'              => $paid,
                    'change_amount'            => $change,
                    'payment_mode'             => $paymentMode,
                    'status'                   => 'COMPLETED',
                    'is_credit'                => $isCredit,
                    'igst'                     => $request->boolean('igst'),
                    'place_of_supply_state_id' => $request->input('placeOfSupplyStateId'),
                    'applied_pos_return_id'    => $appliedReturn?->id,
                ]);

                foreach ($itemsData as $item) {
                    $qty = (float) $item['qty'];
                    $price = (float) $item['price'];
                    $disc = (float) ($item['discount'] ?? 0);
                    $taxRate = (float) ($item['tax'] ?? 0);
                    $lineSub = ($qty * $price) - $disc;
                    $lineTax = ($lineSub * $taxRate) / 100;
                    $barcodeId = isset($item['barcodeId']) ? (int) $item['barcodeId'] : null;

                    PosSaleItem::create([
                        'pos_sale_id'    => $sale->id,
                        'product_id'     => $item['productId'],
                        'variant_id'     => $item['variantId'] ?? null,
                        'barcode_id'     => $barcodeId,
                        'quantity'       => $qty,
                        'unit_mrp'       => $item['mrp'] ?? $price,
                        'selling_price'  => $price,
                        'discount'       => $disc,
                        'tax_rate'       => $taxRate,
                        'tax_amount'     => $lineTax,
                        'subtotal'       => $lineSub + $lineTax,
                        'tax_name'       => $item['taxName'] ?? null,
                        'tax_type'       => $item['taxType'] ?? null,
                        'cost_price'     => $item['cost'] ?? null,
                        'sales_man_id'   => $item['salesManId'] ?? null,
                        'sales_man_name' => $item['salesManName'] ?? null,
                    ]);

                    // Locked, audited decrement - rejects the whole sale
                    // (via InsufficientStockException, caught below) rather
                    // than letting stock go negative as it silently did before.
                    $this->stockService->adjust(
                        storeId: (int) $storeId,
                        productId: (int) $item['productId'],
                        variantId: isset($item['variantId']) ? (int) $item['variantId'] : null,
                        delta: -$qty,
                        referenceType: 'POS_SALE',
                        referenceId: $sale->id,
                        costPrice: $price,
                        userId: $user->id ?? null,
                    );

                    // PIECE barcodes are one physical unit each - selling it
                    // takes that specific label out of circulation so it
                    // can't be scanned again. PACK/CUT's shared barcode
                    // stays active (more stock of the same variant may still
                    // be on the shelf under the same label).
                    if ($barcodeId) {
                        $scannedBarcode = Barcode::with('product')->find($barcodeId);
                        $mode = strtoupper((string) ($scannedBarcode?->product?->selling_mode ?: 'PIECE'));
                        if ($mode === 'PIECE') {
                            $scannedBarcode->update(['is_active' => false]);
                        }
                    }
                }

                foreach ([
                    ['mode' => 'CASH', 'amount' => $cashAmount, 'extra' => []],
                    ['mode' => 'CARD', 'amount' => $cardAmount, 'extra' => ['card_type_id' => $request->input('cardTypeId')]],
                    ['mode' => 'UPI',  'amount' => $upiAmount,  'extra' => ['upi_provider_id' => $request->input('upiProviderId')]],
                ] as $tender) {
                    if ($tender['amount'] > 0) {
                        PosPayment::create(array_merge([
                            'pos_sale_id'  => $sale->id,
                            'payment_mode' => $tender['mode'],
                            'amount'       => $tender['amount'],
                            'reference_no' => $request->input('paymentReference'),
                        ], $tender['extra']));
                    }
                }

                if ($appliedReturn) {
                    $appliedReturn->update([
                        'credit_applied_to_sale_id' => $sale->id,
                        'credit_applied_at'         => now(),
                    ]);
                }

                // CRM: earn loyalty points and record a credit-ledger debit
                // for credit sales - mirrors CI4's AddNewSaleTrait/_setup.php,
                // which did this inline in the same POS checkout flow.
                if ($customerId) {
                    $customer = Customer::where('id', $customerId)->lockForUpdate()->first();
                    if ($customer && !$customer->disable_loyalty) {
                        $pointValue = (float) (\App\Models\Store::where('id', $storeId)->value('loyalty_point_value') ?? 100);
                        $pointsEarned = $pointValue > 0 ? (int) floor($grandTotal / $pointValue) : 0;

                        if ($pointsEarned > 0) {
                            $newPointBalance = $customer->loyalty_points + $pointsEarned;
                            LoyaltyTransaction::create([
                                'customer_id'   => $customerId,
                                'pos_sale_id'   => $sale->id,
                                'type'          => 'EARN',
                                'points'        => $pointsEarned,
                                'amount'        => $grandTotal,
                                'balance_after' => $newPointBalance,
                                'created_by'    => $user->id ?? null,
                            ]);
                            $customer->update(['loyalty_points' => $newPointBalance]);
                        }
                    }

                    if ($customer && $isCredit) {
                        $newCreditBalance = (float) $customer->current_balance + $grandTotal;
                        CreditLedger::create([
                            'customer_id'    => $customerId,
                            'reference_type' => 'POS_SALE',
                            'reference_id'   => $sale->id,
                            'debit'          => $grandTotal,
                            'credit'         => 0,
                            'balance'        => $newCreditBalance,
                            'description'    => "POS sale {$invoiceNo}",
                            'created_by'     => $user->id ?? null,
                        ]);
                        $customer->update(['current_balance' => $newCreditBalance]);
                    }
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Sale completed successfully',
                    'data'    => $this->withBillNo($sale->load(['items.product', 'payments'])),
                ], 201);
            });
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Not enough stock to complete this sale: ' . $e->getMessage(),
            ], 422);
        } catch (PosReturnCreditUnavailableException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    private function withBillNo(PosSale $sale): array
    {
        $data = $sale->toArray();
        $data['bill_no'] = $sale->id;
        $data['applied_return_no'] = $sale->applied_pos_return_id ? ('RR/' . $sale->applied_pos_return_id) : null;

        return $data;
    }

    public function destroy($id)
    {
        $sale = PosSale::with('items')->find($id);

        if (!$sale) {
            return response()->json([
                'success' => false,
                'message' => 'Sale record not found',
            ], 404);
        }

        DB::transaction(function () use ($sale) {
            foreach ($sale->items as $item) {
                // A sale reversal only ever increments stock back, so this
                // can't itself throw InsufficientStockException.
                $this->stockService->adjust(
                    storeId: (int) $sale->store_id,
                    productId: (int) $item->product_id,
                    variantId: $item->variant_id ? (int) $item->variant_id : null,
                    delta: (float) $item->quantity,
                    referenceType: 'POS_SALE',
                    referenceId: $sale->id,
                    costPrice: (float) $item->selling_price,
                );

                // Undo whatever the sale did to the scanned barcode - a
                // no-op for PACK/CUT (their shared barcode was never
                // deactivated), reactivates the specific unit for PIECE.
                if ($item->barcode_id) {
                    Barcode::where('id', $item->barcode_id)->update(['is_active' => true]);
                }
            }

            if ($sale->applied_pos_return_id) {
                PosReturn::where('id', $sale->applied_pos_return_id)->update([
                    'credit_applied_to_sale_id' => null,
                    'credit_applied_at'         => null,
                ]);
            }

            // Reverse whatever loyalty/credit-ledger effects this sale
            // caused, symmetric with the stock reversal above.
            if ($sale->customer_id) {
                $customer = Customer::where('id', $sale->customer_id)->lockForUpdate()->first();

                $loyaltyTx = LoyaltyTransaction::where('pos_sale_id', $sale->id)->where('type', 'EARN')->first();
                if ($customer && $loyaltyTx) {
                    $customer->update(['loyalty_points' => max(0, $customer->loyalty_points - $loyaltyTx->points)]);
                    $loyaltyTx->delete();
                }

                $creditEntry = CreditLedger::where('reference_type', 'POS_SALE')->where('reference_id', $sale->id)->first();
                if ($customer && $creditEntry) {
                    $customer->update(['current_balance' => (float) $customer->current_balance - (float) $creditEntry->debit]);
                    $creditEntry->delete();
                }
            }

            $sale->payments()->delete();
            $sale->items()->delete();
            $sale->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Sale deleted successfully',
        ]);
    }

    public function salesmanLookup(Request $request)
    {
        $code = $request->input('employeeCode') ?? $request->input('code') ?? $request->input('query');

        if (!$code) {
            return response()->json([
                'success' => false,
                'message' => 'Salesman not found',
            ], 404);
        }

        $user = \App\Models\User::where('username', $code)
            ->orWhere('name', 'like', "%{$code}%")
            ->orWhere('phone', $code)
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Salesman not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'       => $user->id,
                'name'     => $user->name,
                'username' => $user->username,
                'code'     => $user->username,
            ],
        ]);
    }

    public function summaryReport(Request $request)
    {
        $storeId = $request->input('company_id') ?: $request->header('X-Company-Scope-Id', 1);
        $mode = $request->input('mode');

        // Fallback for simple dashboard summary if mode is omitted
        if (!$mode) {
            $today = now()->toDateString();
            $totalSales = PosSale::where('store_id', $storeId)->whereDate('sale_date', $today)->sum('grand_total');
            $totalBills = PosSale::where('store_id', $storeId)->whereDate('sale_date', $today)->count();

            $tenderTotals = PosPayment::whereHas('posSale', function ($q) use ($storeId, $today) {
                    $q->where('store_id', $storeId)->whereDate('sale_date', $today);
                })
                ->selectRaw('payment_mode, SUM(amount) as total')
                ->groupBy('payment_mode')
                ->pluck('total', 'payment_mode');

            $cashSales = (float) ($tenderTotals['CASH'] ?? 0);
            $cardSales = (float) ($tenderTotals['CARD'] ?? 0);
            $upiSales = (float) ($tenderTotals['UPI'] ?? 0);

            return response()->json([
                'success' => true,
                'data'    => [
                    'date'        => $today,
                    'total_sales' => (float) $totalSales,
                    'total_bills' => (int) $totalBills,
                    'cash_sales'  => (float) $cashSales,
                    'card_sales'  => (float) $cardSales,
                    'upi_sales'   => (float) $upiSales,
                ],
            ]);
        }

        // Full Multi-Mode Aggregate Summary
        $from = $request->input('from') ?: now()->subDays(30)->toDateString();
        $to = $request->input('to') ?: now()->toDateString();

        $query = PosSale::with(['customer', 'store', 'items.product', 'payments'])
            ->whereDate('sale_date', '>=', $from)
            ->whereDate('sale_date', '<=', $to);

        if ($request->filled('company_id')) {
            $query->where('store_id', $request->input('company_id'));
        }

        $sales = $query->orderBy('sale_date')->orderBy('id')->get();

        $rows = [];

        switch ($mode) {
            case 'location_summary':
                $grouped = $sales->groupBy(fn($s) => $s->store?->name ?: ('Location ' . ($s->store_id ?: 1)));
                $sNo = 1;
                $totQty = 0; $totDisc = 0; $totTaxable = 0; $totTax = 0; $totRound = 0; $totNet = 0;
                foreach ($grouped as $locName => $groupSales) {
                    $qty = $groupSales->sum(fn($s) => $s->items->sum('quantity'));
                    $disc = $groupSales->sum('total_discount');
                    $tax = $groupSales->sum('total_tax');
                    $round = $groupSales->sum('round_off');
                    $net = $groupSales->sum('grand_total');
                    $taxable = max(0, $net - $tax);

                    $totQty += $qty; $totDisc += $disc; $totTaxable += $taxable; $totTax += $tax; $totRound += $round; $totNet += $net;

                    $rows[] = [
                        'id'             => 'loc_' . $sNo,
                        's_no'           => $sNo++,
                        'location_name'  => $locName,
                        'sale_qty'       => (float) $qty,
                        'discount'       => (float) $disc,
                        'addnl_discount' => 0.0,
                        'taxable_amount' => (float) round($taxable, 2),
                        'sale_tax'       => (float) round($tax, 2),
                        'rounding'       => (float) round($round, 2),
                        'net_amount'     => (float) round($net, 2),
                    ];
                }
                if (count($rows) > 0) {
                    $rows[] = [
                        'id'             => '__total__',
                        's_no'           => 'Total',
                        'location_name'  => 'Total',
                        'sale_qty'       => (float) $totQty,
                        'discount'       => (float) round($totDisc, 2),
                        'addnl_discount' => 0.0,
                        'taxable_amount' => (float) round($totTaxable, 2),
                        'sale_tax'       => (float) round($totTax, 2),
                        'rounding'       => (float) round($totRound, 2),
                        'net_amount'     => (float) round($totNet, 2),
                    ];
                }
                break;

            case 'company_summary':
                $grouped = $sales->groupBy(fn($s) => $s->store?->name ?: 'Main Store');
                $sNo = 1;
                $totQty = 0; $totDisc = 0; $totTaxable = 0; $totTax = 0; $totRound = 0; $totNet = 0;
                foreach ($grouped as $compName => $groupSales) {
                    $qty = $groupSales->sum(fn($s) => $s->items->sum('quantity'));
                    $disc = $groupSales->sum('total_discount');
                    $tax = $groupSales->sum('total_tax');
                    $round = $groupSales->sum('round_off');
                    $net = $groupSales->sum('grand_total');
                    $taxable = max(0, $net - $tax);

                    $totQty += $qty; $totDisc += $disc; $totTaxable += $taxable; $totTax += $tax; $totRound += $round; $totNet += $net;

                    $rows[] = [
                        'id'             => 'comp_' . $sNo,
                        's_no'           => $sNo++,
                        'company'        => $compName,
                        'sale_qty'       => (float) $qty,
                        'discount'       => (float) $disc,
                        'addnl_discount' => 0.0,
                        'taxable_amount' => (float) round($taxable, 2),
                        'sale_tax'       => (float) round($tax, 2),
                        'rounding'       => (float) round($round, 2),
                        'net_amount'     => (float) round($net, 2),
                    ];
                }
                if (count($rows) > 0) {
                    $rows[] = [
                        'id'             => '__total__',
                        's_no'           => 'Total',
                        'company'        => 'Total',
                        'sale_qty'       => (float) $totQty,
                        'discount'       => (float) round($totDisc, 2),
                        'addnl_discount' => 0.0,
                        'taxable_amount' => (float) round($totTaxable, 2),
                        'sale_tax'       => (float) round($totTax, 2),
                        'rounding'       => (float) round($totRound, 2),
                        'net_amount'     => (float) round($totNet, 2),
                    ];
                }
                break;

            case 'date_summary':
                $grouped = $sales->groupBy(fn($s) => substr($s->sale_date ?? $s->created_at, 0, 10));
                $sNo = 1;
                $totQty = 0; $totDisc = 0; $totTaxable = 0; $totTax = 0; $totRound = 0; $totNet = 0;
                foreach ($grouped as $dateStr => $groupSales) {
                    $qty = $groupSales->sum(fn($s) => $s->items->sum('quantity'));
                    $disc = $groupSales->sum('total_discount');
                    $tax = $groupSales->sum('total_tax');
                    $round = $groupSales->sum('round_off');
                    $net = $groupSales->sum('grand_total');
                    $taxable = max(0, $net - $tax);

                    $totQty += $qty; $totDisc += $disc; $totTaxable += $taxable; $totTax += $tax; $totRound += $round; $totNet += $net;

                    $rows[] = [
                        'id'             => 'date_' . $sNo,
                        's_no'           => $sNo++,
                        'sale_date'      => $dateStr,
                        'sale_qty'       => (float) $qty,
                        'discount'       => (float) $disc,
                        'addnl_discount' => 0.0,
                        'taxable_amount' => (float) round($taxable, 2),
                        'sale_tax'       => (float) round($tax, 2),
                        'rounding'       => (float) round($round, 2),
                        'net_amount'     => (float) round($net, 2),
                    ];
                }
                if (count($rows) > 0) {
                    $rows[] = [
                        'id'             => '__total__',
                        's_no'           => 'Total',
                        'sale_date'      => 'Total',
                        'sale_qty'       => (float) $totQty,
                        'discount'       => (float) round($totDisc, 2),
                        'addnl_discount' => 0.0,
                        'taxable_amount' => (float) round($totTaxable, 2),
                        'sale_tax'       => (float) round($totTax, 2),
                        'rounding'       => (float) round($totRound, 2),
                        'net_amount'     => (float) round($totNet, 2),
                    ];
                }
                break;

            case 'bill_summary':
            case 'gst_bill_summary':
            case 'bill_tax_summary':
                $sNo = 1;
                $totQty = 0; $totDisc = 0; $totTaxable = 0; $totTax = 0; $totRound = 0; $totNet = 0;
                foreach ($sales as $sale) {
                    $qty = $sale->items->sum('quantity');
                    $disc = (float) $sale->total_discount;
                    $tax = (float) $sale->total_tax;
                    $round = (float) $sale->round_off;
                    $net = (float) $sale->grand_total;
                    $taxable = max(0, $net - $tax);
                    $gstId = $sale->customer?->gst_number ?: $sale->customer?->gstin ?: null;

                    if ($mode === 'gst_bill_summary' && !$gstId) {
                        continue;
                    }

                    $pmt = $sale->payments->pluck('payment_mode')->unique()->implode(', ') ?: ($sale->payment_mode ?: 'CASH');

                    $totQty += $qty; $totDisc += $disc; $totTaxable += $taxable; $totTax += $tax; $totRound += $round; $totNet += $net;

                    $rows[] = [
                        'id'             => 'bill_' . $sale->id,
                        's_no'           => $sNo++,
                        'bill_no'        => $sale->invoice_no ?: $sale->id,
                        'sale_at'        => $sale->sale_date ?? $sale->created_at,
                        'customer_name'  => $sale->customer?->name ?: ($sale->customer_name ?: 'Walk-in Customer'),
                        'gst_id'         => $gstId,
                        'sale_qty'       => (float) $qty,
                        'discount'       => (float) $disc,
                        'addnl_discount' => 0.0,
                        'taxable_amount' => (float) round($taxable, 2),
                        'sale_tax'       => (float) round($tax, 2),
                        'rounding'       => (float) round($round, 2),
                        'net_amount'     => (float) round($net, 2),
                        'payment'        => $pmt,
                    ];
                }
                break;

            case 'discount_bills':
                $sNo = 1;
                foreach ($sales as $sale) {
                    $disc = (float) $sale->total_discount;
                    if ($disc <= 0) continue;
                    $net = (float) $sale->grand_total;

                    $rows[] = [
                        'id'             => 'disc_' . $sale->id,
                        's_no'           => $sNo++,
                        'bill_no'        => $sale->invoice_no ?: $sale->id,
                        'sale_at'        => $sale->sale_date ?? $sale->created_at,
                        'customer_name'  => $sale->customer?->name ?: ($sale->customer_name ?: 'Walk-in Customer'),
                        'total_discount' => (float) $disc,
                        'addnl_discount' => 0.0,
                        'net_amount'     => (float) round($net, 2),
                    ];
                }
                break;

            case 'bill_detail':
                $billNo = $request->input('billNo');
                $targetSale = $sales->first(function ($s) use ($billNo) {
                    $inv = str_replace('SB/', '', $billNo);
                    return $s->invoice_no == $billNo || $s->invoice_no == $inv || $s->id == $inv;
                });
                if ($targetSale) {
                    foreach ($targetSale->items as $idx => $item) {
                        $rows[] = [
                            'id'           => 'item_' . ($item->id ?? $idx),
                            'bill_no'      => $targetSale->invoice_no ?: $targetSale->id,
                            'sale_at'      => $targetSale->sale_date ?? $targetSale->created_at,
                            'barcode'      => $item->barcode ?: ($item->product?->barcode ?: '-'),
                            'product_name' => $item->product?->name ?: ($item->product_name ?: '-'),
                            'qty'          => (float) ($item->quantity ?? 1),
                            'price'        => (float) ($item->unit_price ?? 0),
                            'tax_perc'     => (float) ($item->tax_rate ?? 0),
                            'discount'     => (float) ($item->discount_amount ?? 0),
                            'total'        => (float) ($item->total_amount ?? 0),
                            'bill_status'  => $targetSale->status ?: 'completed',
                        ];
                    }
                }
                break;

            case 'day_metrics':
                $day = $request->input('day') ?: $from;
                $daySales = $sales->filter(fn($s) => substr($s->sale_date ?? $s->created_at, 0, 10) === $day);
                $billsCount = $daySales->count();
                $qtySum = $daySales->sum(fn($s) => $s->items->sum('quantity'));
                $grossSum = $daySales->sum('sub_total');
                $discSum = $daySales->sum('total_discount');
                $taxSum = $daySales->sum('total_tax');
                $netSum = $daySales->sum('grand_total');

                $cashColl = $daySales->sum(fn($s) => $s->payments->where('payment_mode', 'CASH')->sum('amount'));
                $cardColl = $daySales->sum(fn($s) => $s->payments->where('payment_mode', 'CARD')->sum('amount'));
                $upiColl = $daySales->sum(fn($s) => $s->payments->where('payment_mode', 'UPI')->sum('amount'));

                $rows = [
                    ['detail' => 'Total Bills Count', 'value' => $billsCount],
                    ['detail' => 'Total Quantity Sold', 'value' => (float) $qtySum],
                    ['detail' => 'Gross Value (INR)', 'value' => (float) round($grossSum, 2)],
                    ['detail' => 'Total Discount (INR)', 'value' => (float) round($discSum, 2)],
                    ['detail' => 'Total Tax Amount (INR)', 'value' => (float) round($taxSum, 2)],
                    ['detail' => 'Net Sales Total (INR)', 'value' => (float) round($netSum, 2)],
                    ['detail' => 'Cash Collections (INR)', 'value' => (float) round($cashColl, 2)],
                    ['detail' => 'Card Collections (INR)', 'value' => (float) round($cardColl, 2)],
                    ['detail' => 'UPI Collections (INR)', 'value' => (float) round($upiColl, 2)],
                    ['detail' => 'Average Bill Value (INR)', 'value' => (float) round($billsCount > 0 ? ($netSum / $billsCount) : 0, 2)],
                ];
                break;
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'mode'  => $mode,
                'from'  => $from,
                'to'    => $to,
                'total' => count($rows),
                'rows'  => $rows,
            ],
        ]);
    }

    public function lastReceipt(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $sale = PosSale::with(['customer', 'items.product', 'payments'])
            ->where('store_id', $storeId)
            ->latest('id')
            ->first();

        return response()->json([
            'success' => true,
            'data'    => $sale ? $this->withBillNo($sale) : null,
        ]);
    }

    public function lookupSale(Request $request)
    {
        $billNo = $request->input('bill_no') ?? $request->input('invoice_no');
        $sale = PosSale::with(['customer', 'items.product', 'payments'])
            ->where('invoice_no', $billNo)
            ->first();

        if (!$sale) {
            return response()->json([
                'success' => false,
                'message' => 'Sale record not found for bill: ' . $billNo,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $sale,
        ]);
    }

    public function sessionSummary(Request $request)
    {
        return $this->summaryReport($request);
    }

    public function touchSalesNextBillNo(Request $request)
    {
        return $this->nextBillNo($request);
    }
}
