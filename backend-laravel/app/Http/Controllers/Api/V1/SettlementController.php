<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CreditLedger;
use App\Models\Customer;
use App\Models\PosPayment;
use App\Models\PosSale;
use App\Models\Settlement;
use App\Services\DocumentNumberService;
use App\Services\PaginationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SettlementController extends Controller
{
    public function __construct(private readonly PaginationService $paginationService) {}

    public function index(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id');
        $query = Settlement::with('settler')
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('store_id', $storeId));

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('batch_no', 'like', "%{$search}%");
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('settlement_date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $items->count(),
            ]);
        }

        $result = $this->paginationService->paginate($query, 'settlements', $request, [
            'default_sort' => 'id',
            'default_order' => 'desc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'settlement_date', 'batch_no', 'created_at'],
        ]);

        return response()->json($result);
    }

    public function store(Request $request)
    {
        if ($request->has('action') || $request->has('billIds')) {
            return $this->settleBills($request);
        }
        $validator = Validator::make($request->all(), [
            'settlement_date' => 'nullable|date',
            'total_sales' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $storeId = $this->resolveStoreId($request, 1);
        $batchNo = $request->input('batch_no') ?: DocumentNumberService::resolve($request, (int) $storeId, 'SETTLE');

        $settlement = Settlement::create([
            'store_id' => $storeId,
            'batch_no' => $batchNo,
            'settlement_date' => $request->input('settlement_date') ?: now()->toDateString(),
            'total_sales' => $request->input('total_sales', 0),
            'cash_total' => $request->input('cash_total', 0),
            'card_total' => $request->input('card_total', 0),
            'upi_total' => $request->input('upi_total', 0),
            'credit_total' => $request->input('credit_total', 0),
            'settled_by' => $request->user()?->id ?? 1,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daily settlement recorded successfully',
            'data' => $settlement->load('settler'),
        ], 201);
    }

    public function nextSettlementNumber(Request $request)
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        $nextNo = DocumentNumberService::peek($storeId, 'SETTLE');

        return response()->json([
            'success' => true,
            'data' => ['settlementNo' => $nextNo],
            'next_settlement_number' => $nextNo,
        ]);
    }

    public function unpaidBills(Request $request)
    {
        $status = $request->input('status', 'open');

        $query = PosSale::with(['customer', 'payments', 'appliedReturn', 'settlement', 'user'])
            ->whereIn('store_id', $request->attributes->get('store_context_ids', []));

        if ($status !== 'all') {
            $query->whereNotIn('status', ['CANCELLED', 'RETURNED', 'PAID', 'SETTLED']);
            $query->where(fn ($q) => $q->whereIn('status', ['UNSETTLED', 'CREDIT'])
                ->orWhereColumn('paid_amount', '<', 'grand_total'));
        }

        if ($request->boolean('paginate')) {
            if ($request->filled('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('customer', fn ($customer) => $customer->where('name', 'like', "%{$search}%"));
                });
            }

            return response()->json($this->paginationService->paginate($query, 'pos_sales', $request, [
                'default_sort' => 'id', 'default_order' => 'desc', 'allowed_sorts' => ['id', 'invoice_no', 'sale_date'],
            ]));
        }

        $sales = $query->orderBy('sale_date', 'desc')->limit(50)->get();

        return response()->json([
            'success' => true,
            'data' => $sales,
            'total' => $sales->count(),
        ]);
    }

    public function getBill(Request $request, $billNo)
    {
        $sale = PosSale::with(['customer', 'payments', 'items.product', 'appliedReturn', 'settlement', 'user'])
            ->billNumber((string) $billNo)
            ->whereIn('store_id', $request->attributes->get('store_context_ids', []))
            ->get();

        abort_if($sale->count() > 1, 422, 'Select a store before looking up this bill number.');
        $sale = $sale->first();

        if (! $sale) {
            return response()->json([
                'success' => false,
                'message' => 'Bill not found: '.$billNo,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $sale,
        ]);
    }

    private function settleBills(Request $request)
    {
        $data = $request->validate([
            'action' => 'required|in:settle,credit',
            'billIds' => 'required|array|min:1|max:100',
            'billIds.*' => 'required|integer|distinct',
            'customerId' => 'required_if:action,credit|nullable|integer',
            'cashAmount' => 'nullable|numeric|min:0',
            'cardAmount' => 'nullable|numeric|min:0',
            'upiAmount' => 'nullable|numeric|min:0',
            'cardTypeId' => 'nullable|integer',
            'upiProviderId' => 'nullable|integer',
        ]);
        $storeId = $this->resolveStoreId($request, null);
        abort_unless($storeId, 422, 'Select a store first.');

        return DB::transaction(function () use ($data, $request, $storeId) {
            $bills = PosSale::with(['customer', 'appliedReturn'])->where('store_id', $storeId)
                ->whereIn('id', $data['billIds'])->orderBy('id')->lockForUpdate()->get();
            if ($bills->count() !== count($data['billIds']) || $bills->contains(fn ($bill) => in_array(strtoupper($bill->status), ['PAID', 'SETTLED', 'CANCELLED', 'RETURNED'], true)
                || ($bill->remaining_amount <= 0 && strtoupper($bill->status) !== 'UNSETTLED'))) {
                throw ValidationException::withMessages(['billIds' => 'Select open invoices from the current store. A selected invoice may already be settled.']);
            }
            if ($data['action'] === 'credit') {
                if ($bills->count() !== 1 || $bills->first()->is_credit) {
                    throw ValidationException::withMessages(['billIds' => 'Select one unsettled invoice that is not already credit.']);
                }
                $customer = Customer::whereKey($data['customerId'])->lockForUpdate()->firstOrFail();
                $bill = $bills->first();
                $amount = $bill->remaining_amount;
                $customer->increment('current_balance', $amount);
                CreditLedger::create(['customer_id' => $customer->id, 'reference_type' => 'POS_SALE',
                    'reference_id' => $bill->id, 'debit' => $amount, 'credit' => 0, 'balance' => $customer->current_balance]);
                $bill->update(['customer_id' => $customer->id, 'is_credit' => true, 'status' => 'CREDIT', 'payment_mode' => 'CREDIT']);

                return response()->json(['success' => true, 'data' => $bill]);
            }
            $due = round($bills->sum('remaining_amount'), 2);
            $cash = round((float) ($data['cashAmount'] ?? 0), 2);
            $card = round((float) ($data['cardAmount'] ?? 0), 2);
            $upi = round((float) ($data['upiAmount'] ?? 0), 2);
            if ($cash + $card + $upi < $due || $card + $upi > $due) {
                throw ValidationException::withMessages(['cashAmount' => 'Payment must cover the outstanding amount; card and UPI cannot exceed it.']);
            }
            if (($card > 0 && empty($data['cardTypeId'])) || ($upi > 0 && empty($data['upiProviderId']))) {
                throw ValidationException::withMessages(['payment' => 'Select the card type or UPI provider.']);
            }
            $change = round($cash + $card + $upi - $due, 2);
            $settlement = Settlement::create([
                'store_id' => $storeId, 'batch_no' => DocumentNumberService::resolve($request, $storeId, 'SETTLE'),
                'settlement_date' => now()->toDateString(), 'total_sales' => $due,
                'cash_total' => $cash - $change, 'card_total' => $card, 'upi_total' => $upi,
                'credit_total' => 0, 'settled_by' => $request->user()->id,
            ]);
            $remaining = ['CARD' => $card, 'UPI' => $upi, 'CASH' => $cash - $change];
            foreach ($bills as $bill) {
                $balance = $bill->remaining_amount;
                $payment = $balance;
                foreach ($remaining as $mode => $available) {
                    $amount = min($balance, $available);
                    if ($amount > 0) {
                        PosPayment::create(['pos_sale_id' => $bill->id, 'payment_mode' => $mode, 'amount' => $amount,
                            'reference_no' => $settlement->batch_no,
                            'card_type_id' => $mode === 'CARD' ? ($data['cardTypeId'] ?? null) : null,
                            'upi_provider_id' => $mode === 'UPI' ? ($data['upiProviderId'] ?? null) : null]);
                        $remaining[$mode] = round($available - $amount, 2);
                        $balance = round($balance - $amount, 2);
                    }
                }
                if ($bill->is_credit && $bill->customer_id && $payment > 0) {
                    $customer = Customer::whereKey($bill->customer_id)->lockForUpdate()->firstOrFail();
                    $customer->decrement('current_balance', $payment);
                    CreditLedger::create(['customer_id' => $customer->id, 'reference_type' => 'SETTLEMENT',
                        'reference_id' => $settlement->id, 'debit' => 0, 'credit' => $payment, 'balance' => $customer->current_balance]);
                }
                $bill->update(['paid_amount' => (float) $bill->paid_amount + $payment,
                    'status' => 'SETTLED', 'settlement_id' => $settlement->id]);
            }

            return response()->json(['success' => true, 'data' => [
                ...$settlement->toArray(), 'settlement_no' => $settlement->batch_no, 'settled_at' => now()->toIso8601String(),
                'net_amount' => $due, 'received_amount' => $cash + $card + $upi, 'return_amount' => $change,
                'cash_amount' => $cash - $change, 'card_amount' => $card, 'upi_amount' => $upi,
            ]], 201);
        });
    }
}
