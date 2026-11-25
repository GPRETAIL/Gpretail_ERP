<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreGiftCouponRequest;
use App\Models\Customer;
use App\Models\GiftCredit;
use App\Services\Approvals\ApprovalService;
use App\Services\Sales\BusinessDate;
use App\Services\Sales\GiftCreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CRM > Gift Coupon: coupons the store has given. Most are issued by the bill-settlement rule (Sales Customisation, Coupon
 * rule); a supervisor or above can also give one by hand, with a reason, or cancel one nobody has used. A coupon is used
 * whole, once, on a later bill, from the payment step at POS.
 */
class GiftCouponController extends Controller
{
    public function __construct(private GiftCreditService $credits) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => 'nullable|in:ALL,ACTIVE,USED,EXPIRED,CANCELLED', 'search' => 'nullable|string|max:80']);
        $storeId = $this->storeId($request);
        $today = BusinessDate::today()->toDateString();
        $status = $request->input('status', 'ALL');
        $search = trim((string) $request->input('search', ''));

        $rows = GiftCredit::with(['customer:id,name,phone'])->where('store_id', $storeId)->where('kind', GiftCredit::COUPON)
            ->when($status === 'ACTIVE', fn ($q) => $q->where('status', 'ACTIVE')->where(fn ($w) => $w->whereNull('expires_on')->orWhere('expires_on', '>=', $today)))
            ->when($status === 'EXPIRED', fn ($q) => $q->where('status', 'ACTIVE')->whereNotNull('expires_on')->where('expires_on', '<', $today))
            ->when(in_array($status, ['USED', 'CANCELLED'], true), fn ($q) => $q->where('status', $status))
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w->where('number', 'like', '%'.$search.'%')->orWhere('buyer_name', 'like', '%'.$search.'%')
                ->orWhere('buyer_phone', 'like', '%'.$search.'%')->orWhereHas('customer', fn ($c) => $c->where('name', 'like', '%'.$search.'%')->orWhere('phone', 'like', '%'.$search.'%'))))
            ->orderByDesc('issued_on')->orderByDesc('id')->limit(2000)->get();

        $open = round((float) $rows->filter(fn (GiftCredit $row) => $row->state === 'ACTIVE')->sum('balance'), 2);

        return response()->json(['success' => true, 'data' => $rows->map(fn (GiftCredit $row) => $this->present($row))->values(), 'total' => $rows->count(), 'outstanding' => $open]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $coupon = GiftCredit::with(['customer:id,name,phone', 'redemptions'])->where('store_id', $this->storeId($request))->where('kind', GiftCredit::COUPON)->findOrFail($id);

        return response()->json(['success' => true, 'data' => $this->present($coupon, true)]);
    }

    /** Gives a coupon by hand. Supervisor or above; the reason is kept with it. */
    public function store(StoreGiftCouponRequest $request): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ApprovalService::APPROVER_ROLES, true), 403, 'Only a supervisor, manager or admin can give a coupon by hand.');
        $data = $request->validated();
        $storeId = $this->storeId($request);
        if (! empty($data['customer_id'])) {
            abort_unless(Customer::whereKey($data['customer_id'])->exists(), 422, 'Choose a customer of this store.');
        }
        $rule = $this->credits->couponRule($storeId);
        $days = array_key_exists('valid_days', $data) && $data['valid_days'] !== null ? (int) $data['valid_days'] : $rule['validDays'];
        $minBill = array_key_exists('min_bill_amount', $data) && $data['min_bill_amount'] !== null ? (float) $data['min_bill_amount'] : $rule['redeemMinBill'];

        $coupon = DB::transaction(fn () => $this->credits->issue($request, $storeId, GiftCredit::COUPON, (float) $data['amount'], [
            'customer_id' => $data['customer_id'] ?? null, 'buyer_name' => $data['buyer_name'] ?? null, 'buyer_phone' => $data['buyer_phone'] ?? null,
            'expires_on' => $days > 0 ? BusinessDate::today()->addDays($days)->toDateString() : null,
            'min_bill_amount' => $minBill > 0 ? $minBill : null,
            'payment_reference' => $data['reason'], // Why it was given.
        ]));

        return response()->json(['success' => true, 'message' => 'Coupon '.$this->credits->displayNumber($coupon).' issued.', 'data' => $this->present($coupon->load('customer:id,name,phone'), true)], 201);
    }

    /** Cancels a coupon nobody has used. Supervisor or above. */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:255'], ['reason.required' => 'Say why the coupon is cancelled.']);
        abort_unless(in_array($request->user()->role, ApprovalService::APPROVER_ROLES, true), 403, 'Only a supervisor, manager or admin can cancel a coupon.');

        $coupon = DB::transaction(function () use ($request, $id, $data) {
            $coupon = GiftCredit::where('store_id', $this->storeId($request))->where('kind', GiftCredit::COUPON)->lockForUpdate()->findOrFail($id);
            abort_if($coupon->status === 'CANCELLED', 422, 'This coupon is already cancelled.');
            abort_if($coupon->status === 'USED' || $coupon->redemptions()->whereNull('reversed_at')->exists(), 422, 'This coupon has been used on a bill, so it cannot be cancelled.');
            $coupon->forceFill(['status' => 'CANCELLED', 'cancelled_at' => now(), 'cancelled_by' => $request->user()->id, 'cancel_reason' => $data['reason']])->save();

            return $coupon;
        });

        return response()->json(['success' => true, 'message' => 'Coupon cancelled.', 'data' => $this->present($coupon->load('customer:id,name,phone'), true)]);
    }

    private function storeId(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');

        return $storeId;
    }

    private function present(GiftCredit $coupon, bool $detail = false): array
    {
        $row = [
            'id' => $coupon->id,
            'store_id' => (int) $coupon->store_id,
            'number' => $coupon->number,
            'display_number' => $this->credits->displayNumber($coupon),
            'buyer_name' => $coupon->buyer_name ?: $coupon->customer?->name,
            'buyer_phone' => $coupon->buyer_phone ?: $coupon->customer?->phone,
            'customer_id' => $coupon->customer_id,
            'issued_on' => $coupon->issued_on?->toDateString(),
            'expires_on' => $coupon->expires_on?->toDateString(),
            'amount' => (float) $coupon->original_amount,
            'min_bill_amount' => $coupon->min_bill_amount !== null ? (float) $coupon->min_bill_amount : null,
            'state' => $coupon->state,
            // A coupon earned on a bill points to that bill; one given by hand carries the reason.
            'source' => $coupon->source_pos_sale_id ? 'BILL' : 'MANUAL',
            'reason' => $coupon->source_pos_sale_id ? null : $coupon->payment_reference,
            'cancelled_at' => $coupon->cancelled_at?->toIso8601String(),
            'cancel_reason' => $coupon->cancel_reason,
        ];
        if ($detail) {
            $row['uses'] = $coupon->redemptions->whereNull('reversed_at')->map(fn ($use) => [
                'pos_sale_id' => $use->pos_sale_id, 'amount' => (float) $use->amount, 'used_on' => $use->redeemed_on?->toDateString(),
            ])->values();
        }

        return $row;
    }
}
