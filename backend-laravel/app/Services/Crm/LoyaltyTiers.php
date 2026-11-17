<?php

namespace App\Services\Crm;

use App\Models\Customer;
use App\Models\LoyaltyTier;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Loyalty tiers: a customer's tier is the highest whose minimum spend they reached in the last 12 months
 * (completed POS bills, not cancelled ones). The tier multiplies the points they earn.
 */
class LoyaltyTiers
{
    /** @return Collection<int, LoyaltyTier> highest first */
    public function tiers(int $storeId): Collection
    {
        return LoyaltyTier::query()->withoutGlobalScopes()->where('store_id', $storeId)->orderByDesc('min_spend')->get();
    }

    /** @return array<int, float> customer id => spend in the last 12 months */
    public function spend(int $storeId, array $customerIds): array
    {
        if (! $customerIds) {
            return [];
        }

        return DB::table('pos_sales')->where('store_id', $storeId)->whereIn('customer_id', $customerIds)
            ->whereNotIn('status', ['CANCELLED', 'CANCELED'])->where('sale_date', '>=', now()->subYear())
            ->selectRaw('customer_id, SUM(grand_total) as total')->groupBy('customer_id')->pluck('total', 'customer_id')
            ->map(fn ($v) => round((float) $v, 2))->all();
    }

    /** @return array{name: string, multiplier: float, spend: float, next: ?array{name: string, needed: float}}|null */
    public function forCustomer(int $storeId, Customer $customer, ?Collection $tiers = null, ?float $spend = null): ?array
    {
        $tiers ??= $this->tiers($storeId);
        if ($tiers->isEmpty()) {
            return null;
        }
        $spend ??= $this->spend($storeId, [$customer->id])[$customer->id] ?? 0.0;
        $tier = $tiers->first(fn ($t) => $spend >= (float) $t->min_spend);
        $next = $tiers->filter(fn ($t) => (float) $t->min_spend > $spend)->sortBy('min_spend')->first();

        return [
            'name' => $tier?->name ?? '', 'multiplier' => $tier ? (float) $tier->multiplier : 1.0, 'spend' => $spend,
            'next' => $next ? ['name' => $next->name, 'needed' => round((float) $next->min_spend - $spend, 2)] : null,
        ];
    }
}
