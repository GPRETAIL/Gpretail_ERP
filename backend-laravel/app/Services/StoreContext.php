<?php

namespace App\Services;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/** Store identity in the existing single-company installation. company_id is a legacy store alias. */
class StoreContext
{
    public function available(User $user): Builder
    {
        $query = Store::query();
        if ($user->platform_company_code) {
            $query->where('platform_company_code', $user->platform_company_code);
        } elseif (PlatformActivation::current()?->activated) {
            $query->whereNull('platform_company_code');
        }
        // A tenant owner has no fixed store. Store-bound admins remain store-bound.
        if ($user->role === 'super_admin' || ($user->role === 'admin' && ! $user->store_id)) {
            return $query;
        }

        return $query->whereKey($user->store_id ?? 0);
    }

    public function stores(User $user): Collection
    {
        return $this->available($user)->orderBy('id')->get();
    }

    public function selected(User $user): ?Store
    {
        $stores = $this->stores($user);

        return $stores->count() === 1 ? $stores->first() : null;
    }

    public function authFields(User $user): array
    {
        $stores = $this->stores($user);
        // ResolveStoreContext has already checked this selection against this user's stores.
        $selected = $stores->firstWhere('id', request()->attributes->get('store_context_id'))
            ?? ($stores->count() === 1 ? $stores->first() : null);
        $activation = PlatformActivation::current();
        // A selected store in the response is not the account's fixed store assignment.
        // Issue the tenant identity explicitly, using the registered company administrator.
        $tenantAdmin = $user->is_active && $user->role === 'admin' && ! $user->store_id
            && $user->platform_company_code && $activation?->activated
            && $user->platform_company_code === $activation->company_code
            && strcasecmp($user->email, $activation->tenant_admin_email ?? '') === 0;

        return [
            'is_tenant_admin' => (bool) $tenantAdmin,
            'platform_company_code' => $user->platform_company_code,
            'store_id' => $selected?->id,
            'company_id' => $selected?->id, // Compatibility alias; never defaults to 1.
            'company_name' => $selected?->name,
            'brand' => $selected?->theme_customization ?: [],
            'logo' => $selected?->logo,
            'store_ids' => $stores->pluck('id')->all(),
            'company_ids' => $stores->pluck('id')->all(), // Existing desktop/mobile switchers.
            'store_selection_required' => $stores->count() > 1,
            'subscription_portal_url' => config('platform.portal_url'),
        ];
    }
}
