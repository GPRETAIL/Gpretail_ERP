<?php

namespace App\Http\Controllers\Api\V1\Crm;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\LoyaltyBonusRule;
use App\Models\LoyaltyTier;
use App\Models\LoyaltyTransaction;
use App\Models\Store;
use App\Services\Crm\LoyaltyExpiry;
use App\Services\Crm\LoyaltyLedger;
use App\Services\Crm\LoyaltyTiers;
use App\Services\Sales\BusinessDate;
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
        // Each customer's tier from their last-12-month spend (one query for the page).
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        if ($storeId > 0) {
            $tiers = app(LoyaltyTiers::class);
            $list = $tiers->tiers($storeId);
            $spend = $list->isEmpty() ? [] : $tiers->spend($storeId, collect($result['data'])->pluck('id')->all());
            $result['data'] = collect($result['data'])->map(fn ($c) => [...(is_array($c) ? $c : $c->toArray()),
                'tier' => $list->isEmpty() ? null : ($list->first(fn ($t) => ($spend[is_array($c) ? $c['id'] : $c->id] ?? 0) >= (float) $t->min_spend)?->name)])->all();
        }

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

    /** Runs the nightly expiry for this store now (the nightly job calls this on an on-prem server). */
    public function expire(Request $request, LoyaltyExpiry $expiry): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $expiry->run($this->storeId($request))]);
    }

    public function tiers(Request $request, LoyaltyTiers $tiers): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $tiers->tiers($this->storeId($request))->sortBy('min_spend')->values()]);
    }

    /** Saves the store's whole tier list (a few rows): names, minimum 12-month spend and earn multiplier. */
    public function saveTiers(Request $request, LoyaltyTiers $tiers): JsonResponse
    {
        $data = $request->validate(['tiers' => 'present|array|max:10', 'tiers.*.name' => 'required|string|max:60|distinct',
            'tiers.*.min_spend' => 'required|numeric|min:0|max:999999999|distinct', 'tiers.*.multiplier' => 'required|numeric|min:1|max:10']);
        $storeId = $this->storeId($request);
        DB::transaction(function () use ($data, $storeId) {
            LoyaltyTier::query()->withoutGlobalScopes()->where('store_id', $storeId)->delete();
            foreach ($data['tiers'] as $tier) {
                LoyaltyTier::create(['store_id' => $storeId, 'name' => trim($tier['name']), 'min_spend' => $tier['min_spend'], 'multiplier' => $tier['multiplier']]);
            }
        });

        return response()->json(['success' => true, 'message' => 'Tiers saved.', 'data' => $tiers->tiers($storeId)->sortBy('min_spend')->values()]);
    }

    public function bonusRules(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => LoyaltyBonusRule::query()->withoutGlobalScopes()->where('store_id', $this->storeId($request))->orderBy('id')->get()]);
    }

    public function storeBonusRule(Request $request): JsonResponse
    {
        $rule = LoyaltyBonusRule::create([...$this->bonusRule($request), 'store_id' => $this->storeId($request)]);

        return response()->json(['success' => true, 'message' => 'Bonus rule added.', 'data' => $rule], 201);
    }

    public function updateBonusRule(Request $request, int $id): JsonResponse
    {
        $rule = LoyaltyBonusRule::query()->withoutGlobalScopes()->where('store_id', $this->storeId($request))->findOrFail($id);
        $rule->update($this->bonusRule($request));

        return response()->json(['success' => true, 'message' => 'Bonus rule saved.', 'data' => $rule]);
    }

    public function destroyBonusRule(Request $request, int $id): JsonResponse
    {
        LoyaltyBonusRule::query()->withoutGlobalScopes()->where('store_id', $this->storeId($request))->findOrFail($id)->delete();

        return response()->json(['success' => true, 'message' => 'Bonus rule removed.']);
    }

    /** Customers with points expiring in the next $days days (default 30), soonest first. */
    public function expiring(Request $request): JsonResponse
    {
        $days = max(1, min(365, (int) $request->input('days', 30)));
        $rows = DB::table('loyalty_transactions as t')->join('customers as c', 'c.id', '=', 't.customer_id')
            ->where('t.store_id', $this->storeId($request))->whereIn('t.type', LoyaltyLedger::IN)->where('t.remaining', '>', 0)
            ->whereBetween('t.expires_at', [BusinessDate::today()->toDateString(), BusinessDate::today()->addDays($days)->toDateString()])
            ->selectRaw('t.customer_id, c.name, c.phone, MIN(t.expires_at) as expires_at, SUM(t.remaining) as points')
            ->groupBy('t.customer_id', 'c.name', 'c.phone')->orderBy('expires_at')->limit(500)->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn ($r) => ['customer_id' => (int) $r->customer_id, 'name' => $r->name, 'phone' => $r->phone,
            'expires_at' => substr((string) $r->expires_at, 0, 10), 'points' => (int) $r->points])]);
    }

    private function bonusRule(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:100', 'type' => 'required|in:'.implode(',', LoyaltyBonusRule::TYPES),
            'multiplier' => 'nullable|required_without:points|numeric|min:1|max:10', 'points' => 'nullable|required_without:multiplier|integer|min:1|max:1000000',
            'min_bill' => 'nullable|required_if:type,min_bill|numeric|min:0', 'starts_on' => 'nullable|required_if:type,date_range|date',
            'ends_on' => 'nullable|required_if:type,date_range|date|after_or_equal:starts_on', 'is_active' => 'boolean',
        ]);

        return [...$data, 'is_active' => (bool) ($data['is_active'] ?? true)];
    }

    private function storeId(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');

        return $storeId;
    }
}
