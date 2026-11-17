<?php

namespace App\Services\Crm;

use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Models\PosReturn;
use App\Models\PosSale;
use App\Models\Store;
use App\Services\Sales\BusinessDate;
use Illuminate\Support\Facades\DB;

/**
 * A customer's loyalty points. Points coming in (EARN, BONUS, RESTORE, ADJUST_IN) carry an expiry date and how many
 * are still unused (`remaining`); points going out (REDEEM, REVERSAL, RETURN, EXPIRE, ADJUST_OUT) are taken from
 * the oldest unused points first. `points` is always a positive size, the type gives the direction, and
 * `customers.loyalty_points` is the balance. Call inside the caller's transaction with the customer row locked.
 */
class LoyaltyLedger
{
    public const IN = ['EARN', 'BONUS', 'RESTORE', 'ADJUST_IN'];

    public const OUT = ['REDEEM', 'REVERSAL', 'RETURN', 'EXPIRE', 'ADJUST_OUT'];

    /** @return array{enabled: bool, spend_per_point: float, redeem_value: float, min_points: int, max_percent: float, expiry_months: int, otp_required: bool} */
    public function settings(int $storeId): array
    {
        $store = Store::query()->withoutGlobalScopes()->find($storeId);

        return [
            'enabled' => (bool) ($store->loyalty_enabled ?? true),
            'spend_per_point' => (float) ($store->loyalty_point_value ?? 100),
            'redeem_value' => (float) ($store->loyalty_redeem_value ?? 1),
            'min_points' => (int) ($store->loyalty_redeem_min_points ?? 100),
            'max_percent' => (float) ($store->loyalty_max_redeem_percent ?? 50),
            'expiry_months' => (int) ($store->loyalty_redeem_window_months ?? 12) ?: 12,
            'otp_required' => (bool) ($store->loyalty_otp_required ?? true),
        ];
    }

    /** Points for a bill: one per "spend per point" of what was paid by money (not by points). */
    public function earn(PosSale $sale, Customer $customer, float $earnable, ?int $userId): ?LoyaltyTransaction
    {
        $settings = $this->settings((int) $sale->store_id);
        if (! $settings['enabled'] || $customer->disable_loyalty || $settings['spend_per_point'] <= 0) {
            return null;
        }
        $points = (int) floor(max(0, $earnable) / $settings['spend_per_point']);

        return $points > 0 ? $this->credit($customer, 'EARN', 'pos_sale', $points, $userId, ['pos_sale_id' => $sale->id, 'amount' => $earnable]) : null;
    }

    public function redeem(PosSale $sale, Customer $customer, int $points, float $amount, ?int $userId): LoyaltyTransaction
    {
        return $this->debit($customer, 'REDEEM', 'pos_sale', $points, $userId, ['pos_sale_id' => $sale->id, 'amount' => $amount]);
    }

    /** A cancelled bill: the points it earned are taken back and the points it used are given back. Nothing is deleted. */
    public function reverseSale(PosSale $sale, Customer $customer, ?int $userId): void
    {
        $rows = LoyaltyTransaction::where('pos_sale_id', $sale->id)->whereNull('pos_return_id')->get();
        $earned = (int) $rows->whereIn('type', ['EARN', 'BONUS'])->sum('points') - (int) $rows->where('type', 'REVERSAL')->sum('points');
        $redeemed = (int) $rows->where('type', 'REDEEM')->sum('points') - (int) $rows->where('type', 'RESTORE')->sum('points');
        if ($earned > 0) {
            // The bill's own earnings go first, so a bill cancelled straight away leaves older points untouched.
            $this->debit($customer, 'REVERSAL', 'cancel', $earned, $userId, ['pos_sale_id' => $sale->id, 'reason' => 'Bill cancelled'], false, $sale->id);
        }
        if ($redeemed > 0) {
            $this->credit($customer, 'RESTORE', 'cancel', $redeemed, $userId, ['pos_sale_id' => $sale->id, 'reason' => 'Bill cancelled: points given back']);
        }
    }

    /** Goods returned: the points earned on them are taken back, in proportion to the returned value. */
    public function onReturn(PosReturn $return, Customer $customer, ?int $userId): void
    {
        $sale = $return->pos_sale_id ? PosSale::query()->withoutGlobalScopes()->find($return->pos_sale_id) : null;
        if (! $sale || (float) $sale->grand_total <= 0) {
            return;
        }
        $earned = (int) LoyaltyTransaction::where('pos_sale_id', $sale->id)->whereIn('type', ['EARN', 'BONUS'])->sum('points');
        $taken = (int) LoyaltyTransaction::where('pos_sale_id', $sale->id)->whereIn('type', ['RETURN', 'REVERSAL'])->sum('points');
        $share = min(1, abs((float) $return->total_refund) / (float) $sale->grand_total);
        $points = min((int) floor($earned * $share), $earned - $taken);
        if ($points > 0) {
            $this->debit($customer, 'RETURN', 'pos_return', $points, $userId, ['pos_sale_id' => $sale->id, 'pos_return_id' => $return->id,
                'amount' => abs((float) $return->total_refund), 'reason' => 'Goods returned'], false, $sale->id);
        }
    }

    /** A manual correction from CRM: positive adds points, negative removes them (never below zero). */
    public function adjust(Customer $customer, int $points, string $reason, ?int $userId): LoyaltyTransaction
    {
        return $points >= 0
            ? $this->credit($customer, 'ADJUST_IN', 'adjustment', $points, $userId, ['reason' => $reason])
            : $this->debit($customer, 'ADJUST_OUT', 'adjustment', -$points, $userId, ['reason' => $reason], false);
    }

    /** Points past their expiry date leave the balance (nightly job). Returns the points expired. */
    public function expire(Customer $customer, ?string $today = null): int
    {
        $today ??= BusinessDate::today()->toDateString();
        $due = LoyaltyTransaction::where('customer_id', $customer->id)->whereIn('type', self::IN)->where('remaining', '>', 0)
            ->whereNotNull('expires_at')->whereDate('expires_at', '<', $today)->lockForUpdate()->get();
        $points = (int) $due->sum('remaining');
        if ($points <= 0) {
            return 0;
        }
        foreach ($due as $row) {
            $row->update(['remaining' => 0]);
        }
        $this->debit($customer, 'EXPIRE', 'expiry', $points, null, ['reason' => 'Points expired'], false);

        return $points;
    }

    private function credit(Customer $customer, string $type, string $source, int $points, ?int $userId, array $extra = []): LoyaltyTransaction
    {
        $balance = (int) $customer->loyalty_points + $points;
        $row = LoyaltyTransaction::create([...$extra, 'store_id' => $customer->store_id, 'customer_id' => $customer->id, 'type' => $type,
            'source' => $source, 'points' => $points, 'amount' => $extra['amount'] ?? 0, 'remaining' => $points,
            'expires_at' => BusinessDate::today()->addMonths($this->settings((int) $customer->store_id)['expiry_months'])->toDateString(),
            'balance_after' => $balance, 'created_by' => $userId]);
        $customer->forceFill(['loyalty_points' => $balance])->save();

        return $row;
    }

    /**
     * Takes $points from the oldest unused points. $strict: the customer must have them (redeeming); otherwise the
     * balance just stops at zero (taking back points the customer has already spent). $fromSaleId: that bill's own
     * earnings are used first.
     */
    private function debit(Customer $customer, string $type, string $source, int $points, ?int $userId, array $extra = [], bool $strict = true, ?int $fromSaleId = null): LoyaltyTransaction
    {
        $balance = (int) $customer->loyalty_points;
        if ($strict && $points > $balance) {
            throw new \DomainException("Only {$balance} points are available.");
        }
        $left = $points;
        $rows = LoyaltyTransaction::where('customer_id', $customer->id)->whereIn('type', self::IN)->where('remaining', '>', 0)
            ->when($fromSaleId, fn ($q) => $q->orderByRaw('CASE WHEN pos_sale_id = ? THEN 0 ELSE 1 END', [$fromSaleId]))
            ->orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')->orderBy('expires_at')->orderBy('id')->lockForUpdate()->get();
        foreach ($rows as $row) {
            if ($left <= 0) {
                break;
            }
            $take = min($left, (int) $row->remaining);
            $row->update(['remaining' => (int) $row->remaining - $take]);
            $left -= $take;
        }
        $after = max(0, $balance - $points);
        $entry = LoyaltyTransaction::create([...$extra, 'store_id' => $customer->store_id, 'customer_id' => $customer->id, 'type' => $type,
            'source' => $source, 'points' => $points, 'amount' => $extra['amount'] ?? 0, 'remaining' => 0, 'balance_after' => $after, 'created_by' => $userId]);
        $customer->forceFill(['loyalty_points' => $after])->save();

        return $entry;
    }

    /** Sum of unused points per expiry date, soonest first: what the customer can redeem and when it lapses. */
    public function expiring(Customer $customer, int $limit = 5): array
    {
        return DB::table('loyalty_transactions')->where('customer_id', $customer->id)->whereIn('type', self::IN)->where('remaining', '>', 0)
            ->selectRaw('expires_at, SUM(remaining) as points')->groupBy('expires_at')->orderBy('expires_at')->limit($limit)
            ->get()->map(fn ($r) => ['expires_at' => $r->expires_at ? substr((string) $r->expires_at, 0, 10) : null, 'points' => (int) $r->points])->all();
    }
}
