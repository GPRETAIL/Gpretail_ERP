<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreGiftVoucherRequest;
use App\Models\Customer;
use App\Models\GiftCredit;
use App\Services\Approvals\ApprovalService;
use App\Services\Pos\PosCounter;
use App\Services\Sales\BusinessDate;
use App\Services\Sales\CashRegisterService;
use App\Services\Sales\GiftCreditService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CRM > Gift Voucher: a gift voucher is sold at the counter for cash, card or UPI and used later as a payment on a bill, in
 * parts, until it expires. The money taken is a liability until it is used (LedgerPoster: till or clearing debit, Gift
 * Vouchers Outstanding credit). A voucher nobody has used can be cancelled by a supervisor or above, and the money is given back.
 */
class GiftVoucherController extends Controller
{
    public function __construct(private GiftCreditService $credits) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => 'nullable|in:ALL,ACTIVE,USED,EXPIRED,CANCELLED', 'search' => 'nullable|string|max:80']);
        $storeId = $this->storeId($request);
        $today = BusinessDate::today()->toDateString();
        $status = $request->input('status', 'ALL');
        $search = trim((string) $request->input('search', ''));

        $rows = GiftCredit::with(['customer:id,name,phone'])->where('store_id', $storeId)->where('kind', GiftCredit::GIFT_VOUCHER)
            ->when($status === 'ACTIVE', fn ($q) => $q->where('status', 'ACTIVE')->where(fn ($w) => $w->whereNull('expires_on')->orWhere('expires_on', '>=', $today)))
            ->when($status === 'EXPIRED', fn ($q) => $q->where('status', 'ACTIVE')->whereNotNull('expires_on')->where('expires_on', '<', $today))
            ->when(in_array($status, ['USED', 'CANCELLED'], true), fn ($q) => $q->where('status', $status))
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w->where('number', 'like', '%'.$search.'%')->orWhere('buyer_name', 'like', '%'.$search.'%')
                ->orWhere('buyer_phone', 'like', '%'.$search.'%')->orWhereHas('customer', fn ($c) => $c->where('name', 'like', '%'.$search.'%')->orWhere('phone', 'like', '%'.$search.'%'))))
            ->orderByDesc('issued_on')->orderByDesc('id')->limit(2000)->get();

        $outstanding = round((float) $rows->filter(fn (GiftCredit $row) => $row->state === 'ACTIVE')->sum('balance'), 2);

        return response()->json(['success' => true, 'data' => $rows->map(fn (GiftCredit $row) => $this->present($row))->values(), 'total' => $rows->count(), 'outstanding' => $outstanding]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $voucher = GiftCredit::with(['customer:id,name,phone', 'redemptions'])->where('store_id', $this->storeId($request))->where('kind', GiftCredit::GIFT_VOUCHER)->findOrFail($id);

        return response()->json(['success' => true, 'data' => $this->present($voucher, true)]);
    }

    public function store(StoreGiftVoucherRequest $request): JsonResponse
    {
        $data = $request->validated();
        $storeId = $this->storeId($request);
        $user = $request->user();
        $counter = PosCounter::find($user?->counter_id, $storeId);
        if ($user?->counter_id && ! $counter) {
            abort(422, 'Select an active counter in this store before saving.');
        }
        // Cash goes into this counter's drawer, so a counter (and its opened cash, when the store requires it) is needed.
        if ($data['payment_mode'] === 'CASH' && ($block = app(CashRegisterService::class)->billingBlock($storeId, $counter?->id, $counter?->value ?? $counter?->config_value))) {
            throw new HttpResponseException(response()->json(['success' => false, ...$block], 422));
        }
        if (! empty($data['customer_id'])) {
            abort_unless(Customer::whereKey($data['customer_id'])->exists(), 422, 'Choose a customer of this store.');
        }

        $attributes = [
            'customer_id' => $data['customer_id'] ?? null, 'counter_id' => $counter?->id, 'payment_mode' => $data['payment_mode'],
            'payment_reference' => $data['payment_reference'] ?? null, 'buyer_name' => $data['buyer_name'] ?? null, 'buyer_phone' => $data['buyer_phone'] ?? null,
        ];
        if (array_key_exists('valid_days', $data) && $data['valid_days'] !== null) {
            $attributes['expires_on'] = (int) $data['valid_days'] > 0 ? BusinessDate::today()->addDays((int) $data['valid_days'])->toDateString() : null;
        }

        $voucher = DB::transaction(fn () => $this->credits->issue($request, $storeId, GiftCredit::GIFT_VOUCHER, (float) $data['amount'], $attributes));

        return response()->json(['success' => true, 'message' => 'Gift voucher '.$this->credits->displayNumber($voucher).' sold.', 'data' => $this->present($voucher->load('customer:id,name,phone'), true)], 201);
    }

    /** Cancels a voucher nobody has used. Supervisor or above; the money is handed back to the buyer. */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:255'], ['reason.required' => 'Say why the voucher is cancelled.']);
        abort_unless(in_array($request->user()->role, ApprovalService::APPROVER_ROLES, true), 403, 'Only a supervisor, manager or admin can cancel a gift voucher.');

        $voucher = DB::transaction(function () use ($request, $id, $data) {
            $voucher = GiftCredit::where('store_id', $this->storeId($request))->where('kind', GiftCredit::GIFT_VOUCHER)->lockForUpdate()->findOrFail($id);
            abort_if($voucher->status === 'CANCELLED', 422, 'This gift voucher is already cancelled.');
            $spent = $voucher->redemptions()->whereNull('reversed_at')->exists() || round((float) $voucher->balance, 2) !== round((float) $voucher->original_amount, 2);
            abort_if($spent || $voucher->status === 'USED', 422, 'This gift voucher has been used on a bill, so it cannot be cancelled.');
            $voucher->forceFill(['status' => 'CANCELLED', 'cancelled_at' => now(), 'cancelled_by' => $request->user()->id, 'cancel_reason' => $data['reason']])->save();

            return $voucher;
        });

        return response()->json(['success' => true, 'message' => 'Gift voucher cancelled.', 'data' => $this->present($voucher->load('customer:id,name,phone'), true)]);
    }

    private function storeId(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');

        return $storeId;
    }

    private function present(GiftCredit $voucher, bool $detail = false): array
    {
        $row = [
            'id' => $voucher->id,
            'store_id' => (int) $voucher->store_id,
            'number' => $voucher->number,
            'display_number' => $this->credits->displayNumber($voucher),
            'buyer_name' => $voucher->buyer_name ?: $voucher->customer?->name,
            'buyer_phone' => $voucher->buyer_phone ?: $voucher->customer?->phone,
            'customer_id' => $voucher->customer_id,
            'issued_on' => $voucher->issued_on?->toDateString(),
            'expires_on' => $voucher->expires_on?->toDateString(),
            'original_amount' => (float) $voucher->original_amount,
            'balance' => (float) $voucher->balance,
            'state' => $voucher->state,
            'payment_mode' => $voucher->payment_mode,
            'payment_reference' => $voucher->payment_reference,
            'cancelled_at' => $voucher->cancelled_at?->toIso8601String(),
            'cancel_reason' => $voucher->cancel_reason,
        ];
        if ($detail) {
            $row['uses'] = $voucher->redemptions->whereNull('reversed_at')->map(fn ($use) => [
                'pos_sale_id' => $use->pos_sale_id, 'amount' => (float) $use->amount, 'used_on' => $use->redeemed_on?->toDateString(),
            ])->values();
        }

        return $row;
    }
}
