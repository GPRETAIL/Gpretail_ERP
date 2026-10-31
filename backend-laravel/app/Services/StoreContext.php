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
    /** @return Builder<Store> */
    public function available(User $user): Builder
    {
        $query = Store::query();
        if ($user->platform_company_code) {
            $query->where('platform_company_code', $user->platform_company_code);
        } elseif (PlatformActivation::current()?->activated) {
            // Legacy/unlinked accounts cannot operate a platform-managed tenant.
            $query->whereRaw('1 = 0');
        }
        // A tenant owner has no fixed store. Store-bound admins remain store-bound.
        if ($user->role === 'super_admin' || ($user->role === 'admin' && ! $user->store_id)) {
            return $query;
        }

        return $query->where(fn ($scope) => $scope->whereKey($user->store_id ?? 0)
            ->orWhereIn('id', $user->assignedStores()->select('stores.id')));
    }

    /** @return Collection<int, Store> */
    public function stores(User $user): Collection
    {
        return $this->available($user)->orderBy('id')->get();
    }

    public function selected(User $user): ?Store
    {
        $stores = $this->stores($user);

        return $stores->count() === 1 ? $stores->first() : null;
    }

    /** The registered company administrator, who keeps access to renew/activate expired stores. */
    public function isTenantAdmin(User $user): bool
    {
        $activation = PlatformActivation::current();

        return $user->is_active && $user->role === 'admin' && ! $user->store_id
            && $user->platform_company_code && $activation?->activated
            && $user->platform_company_code === $activation->company_code
            && strcasecmp($user->email, $activation->tenant_admin_email ?? '') === 0;
    }

    /**
     * Stores this user may operate under a valid signed licence. Staff of an expired
     * store are signed out entirely; only the Tenant Admin keeps a session to renew.
     *
     * @return Collection<int, Store>
     */
    public function licensedStores(User $user): Collection
    {
        $activation = PlatformActivation::current();
        $verifier = app(StoreLicenceVerifier::class);

        return $this->stores($user)->filter(fn (Store $store) => $store->is_active
            && (! ($store->platform_store_id || $activation?->activated) || $verifier->verify($store, $activation)['ok']))->values();
    }

    public function authFields(User $user): array
    {
        $stores = $this->stores($user);
        // ResolveStoreContext has already checked this selection against this user's stores.
        $selected = $stores->firstWhere('id', request()->attributes->get('store_context_id'))
            ?? ($stores->count() === 1 ? $stores->first() : null);
        $counter = PosCounter::find($user->counter_id, $selected?->id);
        // A selected store in the response is not the account's fixed store assignment.
        $tenantAdmin = $this->isTenantAdmin($user);

        return [
            'counter_id' => $counter?->id,
            'counter_name' => $counter->value ?? $counter?->config_value,
            'is_tenant_admin' => (bool) $tenantAdmin,
            'can_switch_stores' => $user->is_active && ($user->role === 'super_admin' || $tenantAdmin || $stores->count() > 1),
            'web_access' => (bool) $user->web_access,
            'mobile_access' => (bool) $user->mobile_access,
            'module_permissions' => $user->module_permissions,
            'page_permissions' => $user->page_permissions,
            'effective_page_permissions' => app(PagePermissions::class)->effective($user),
            'auth_client' => in_array('client:mobile', $user->currentAccessToken()->abilities ?? [], true) ? 'mobile' : 'web',
            'platform_company_code' => $user->platform_company_code,
            'store_id' => $selected?->id,
            'company_id' => $selected?->id, // Compatibility alias; never defaults to 1.
            'company_name' => $selected?->name,
            'brand' => app(TenantThemes::class)->effective($selected, $user->platform_company_code),
            'theme_override_allowed' => $selected ? app(TenantThemes::class)->overrideAllowed($selected) : false,
            'theme_source' => $selected?->theme_customization && app(TenantThemes::class)->overrideAllowed($selected) ? 'store' : (app(TenantThemes::class)->company($user->platform_company_code) ? 'company' : 'default'),
            'logo' => $selected?->logo,
            'store_ids' => $stores->pluck('id')->all(),
            'company_ids' => $stores->pluck('id')->all(), // Existing desktop/mobile switchers.
            'store_selection_required' => $stores->count() > 1,
            'subscription_portal_url' => config('platform.portal_url'),
            // Public connection settings, so the browser always uses this server's Pusher/Reverb app.
            'realtime' => config('services.pusher.key') ? array_filter(['key' => config('services.pusher.key'), 'cluster' => config('services.pusher.cluster'),
                'host' => config('services.pusher.host'), 'port' => config('services.pusher.port'), 'scheme' => config('services.pusher.scheme')]) : null,
        ];
    }
}
