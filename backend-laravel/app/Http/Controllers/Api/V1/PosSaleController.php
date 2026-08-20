<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientStockException;
use App\Exceptions\PosReturnCreditUnavailableException;
use App\Http\Controllers\Controller;
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
                'id'            => $product->id,
                'name'          => $product->name,
                'code'          => $product->code,
                'barcode'       => $product->barcode,
                'sku'           => $product->sku,
                'selling_price' => (float) $product->selling_price,
                'mrp'           => (float) $product->mrp,
                'tax_rate'      => $product->tax ? (float) $product->tax->rate : 0.00,
                'stock_qty'     => (float) ($product->stocks->sum('quantity') ?? 0),
                'product'       => $product,
            ],
        ]);
    }

    public function stockProducts(Request $request)
    {
        $search = $request->input('search') ?? $request->input('q') ?? '';
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $stocks = Stock::with(['product.brand', 'product.category', 'product.tax'])
            ->where('store_id', $storeId)
            ->where('quantity', '>', 0)
            ->whereHas('product', function ($q) use ($search) {
                if ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('barcode', 'like', "%{$search}%");
                }
            })
            ->limit(50)
            ->get();

        $data = $stocks->map(function ($s) {
            return [
                'id'          => $s->product_id,
                'productId'   => $s->product_id,
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

        $query = PosSale::with(['customer', 'user', 'items.product', 'payments'])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('store_id', $storeId))
            ->orderBy('id', 'desc');

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

                    PosSaleItem::create([
                        'pos_sale_id'    => $sale->id,
                        'product_id'     => $item['productId'],
                        'variant_id'     => $item['variantId'] ?? null,
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
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $today = now()->toDateString();

        $totalSales = PosSale::where('store_id', $storeId)->whereDate('sale_date', $today)->sum('grand_total');
        $totalBills = PosSale::where('store_id', $storeId)->whereDate('sale_date', $today)->count();

        // Real per-tender breakdown from pos_payments - a split sale (part
        // cash, part card) now has a row per tender, so summing by the
        // sale's single payment_mode/paid_amount would double count.
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
