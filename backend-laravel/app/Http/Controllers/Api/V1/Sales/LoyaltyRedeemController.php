<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\Approvals\ApprovalService;
use App\Services\Crm\LoyaltyRedemption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * POS: redeeming a customer's loyalty points. The screen asks for a quote (balance, the most this bill can take,
 * how the customer can approve), sends the customer an OTP and checks it; the token it gets back goes with the
 * checkout (loyaltyRedeem.otpToken). Without an OTP, checkout asks for a supervisor's approval (loyalty_redeem).
 */
class LoyaltyRedeemController extends Controller
{
    public function __construct(private LoyaltyRedemption $redemption) {}

    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate(['customer_id' => 'required|integer', 'amount' => 'required|numeric|min:0']);

        $quote = $this->redemption->quote($this->storeId($request), $this->customer($data['customer_id']), (float) $data['amount']);
        // Whether this user must get the customer's OTP (or a supervisor) before redeeming; supervisors redeem on their own.
        $quote['verify'] = $quote['otp_required'] && ! in_array($request->user()?->role, ApprovalService::APPROVER_ROLES, true);

        return response()->json(['success' => true, 'data' => $quote]);
    }

    public function sendOtp(Request $request): JsonResponse
    {
        $data = $request->validate(['customer_id' => 'required|integer', 'points' => 'required|integer|min:1', 'amount' => 'required|numeric|min:0',
            'channel' => 'nullable|in:sms,whatsapp,email']);
        $result = DB::transaction(fn () => $this->redemption->requestOtp($request->user(), $this->storeId($request),
            $this->customer($data['customer_id']), (int) $data['points'], (float) $data['amount'], $data['channel'] ?? null));

        return response()->json(['success' => true, 'message' => 'OTP sent to '.$result['sent_to'].'.', 'data' => $result]);
    }

    public function verifyOtp(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['code' => 'required|string|max:10']);

        return response()->json(['success' => true, 'data' => DB::transaction(fn () => $this->redemption->verifyOtp($this->storeId($request), $id, $data['code']))]);
    }

    private function customer(int $id): Customer
    {
        $customer = Customer::find($id);
        abort_unless($customer, 404, 'Customer not found.');

        return $customer;
    }

    private function storeId(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');

        return $storeId;
    }
}
