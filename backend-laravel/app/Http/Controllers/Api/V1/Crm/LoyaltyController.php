<?php

namespace App\Http\Controllers\Api\V1\Crm;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Models\Store;
use App\Services\Crm\LoyaltyLedger;
use App\Support\PaginationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CRM -> Loyalty Points. Mirrors the CI4 LoyaltyApiController's design
 * (read-only view of balances/transaction history) but reads from the
 * proper loyalty_transactions ledger this app already has, rather than
 * CI4's redemption-only redeem_tab.
 */
class LoyaltyController extends Controller
{
    public function __construct(private readonly PaginationService $paginationService) {}

    public function balances(Request $request)
    {
        $query = Customer::query();

        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('loyalty_card_number', 'like', "%{$s}%");
            });
        }

        $result = $this->paginationService->paginate($query, 'customers', $request, [
            'default_sort' => 'loyalty_points',
            'default_order' => 'desc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'name', 'phone', 'loyalty_card_number', 'loyalty_points'],
        ]);

        $result['totalPoints'] = (int) Customer::sum('loyalty_points');

        return response()->json($result);
    }

    public function transactions(Request $request)
    {
        $query = LoyaltyTransaction::with(['customer:id,name,phone', 'posSale:id,invoice_no']);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->input('customer_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $items = $query->orderByDesc('created_at')->limit(2000)->get();

            return response()->json(['success' => true, 'data' => $items, 'total' => $items->count()]);
        }

        $result = $this->paginationService->paginate($query, 'stock_transactions', $request, [
            'default_sort' => 'id',
            'default_order' => 'desc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'created_at'],
        ]);

        return response()->json($result);
    }

    /** CRM > Loyalty Management > Settings: how points are earned and redeemed in this store. */
    public function settings(Request $request, LoyaltyLedger $ledger): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $ledger->settings($this->storeId($request))]);
    }

    public function saveSettings(Request $request, LoyaltyLedger $ledger): JsonResponse
    {
        $data = $request->validate([
            'enabled' => 'required|boolean', 'spend_per_point' => 'required|numeric|min:1|max:100000',
            'redeem_value' => 'required|numeric|min:0.01|max:10000', 'min_points' => 'required|integer|min:0|max:1000000',
            'max_percent' => 'required|numeric|min:1|max:100', 'expiry_months' => 'required|integer|min:1|max:120', 'otp_required' => 'required|boolean',
        ]);
        $storeId = $this->storeId($request);
        Store::query()->withoutGlobalScopes()->whereKey($storeId)->update([
            'loyalty_enabled' => $data['enabled'], 'loyalty_point_value' => $data['spend_per_point'], 'loyalty_redeem_value' => $data['redeem_value'],
            'loyalty_redeem_min_points' => $data['min_points'], 'loyalty_max_redeem_percent' => $data['max_percent'],
            'loyalty_redeem_window_months' => $data['expiry_months'], 'loyalty_otp_required' => $data['otp_required'],
        ]);

        return response()->json(['success' => true, 'message' => 'Loyalty settings saved.', 'data' => $ledger->settings($storeId)]);
    }

    /** A manual correction of a customer's points, with the reason (kept in the ledger). */
    public function adjust(Request $request, LoyaltyLedger $ledger): JsonResponse
    {
        $data = $request->validate(['customer_id' => 'required|integer', 'points' => 'required|integer|not_in:0|min:-1000000|max:1000000',
            'reason' => 'required|string|max:255']);
        $row = DB::transaction(function () use ($data, $ledger, $request) {
            $customer = Customer::whereKey($data['customer_id'])->lockForUpdate()->first();
            abort_unless($customer, 404, 'Customer not found.');

            return $ledger->adjust($customer, (int) $data['points'], $data['reason'], $request->user()?->id);
        });

        return response()->json(['success' => true, 'message' => 'Points adjusted.', 'data' => $row]);
    }

    private function storeId(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');

        return $storeId;
    }
}
