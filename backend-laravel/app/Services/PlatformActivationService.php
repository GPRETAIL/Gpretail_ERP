<?php

namespace App\Services;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Owns writes to the platform_activations row: registering this deployment with Gpretail_Admin
 * and applying whatever it reports on each snapshot pull. Shared by ActivationController (the
 * immediate pull right after registering) and the platform:sync command (the recurring pull).
 */
class PlatformActivationService
{
    public function __construct(private PlatformClient $client) {}

    /**
     * @return array{ok: bool, message: ?string, activation: ?PlatformActivation}
     */
    public function register(string $oneTimePassword, ?string $companyCode = null, ?string $clientId = null, ?string $expectedTenantEmail = null): array
    {
        $companyCode = $companyCode ?: (string) config('platform.company_code');
        $clientId = $clientId ?: (string) config('platform.client_id');

        if ($companyCode === '' || $clientId === '') {
            return ['ok' => false, 'message' => 'This deployment has no company_code/client_id configured. Set PLATFORM_COMPANY_CODE and PLATFORM_CLIENT_ID.', 'activation' => null];
        }

        $existing = PlatformActivation::current();
        if (config('platform.company_code') && config('platform.company_code') !== $companyCode) {
            return ['ok' => false, 'message' => 'The activation company does not match the company configured for this installation.', 'activation' => null];
        }
        if ($existing && $existing->company_code !== $companyCode) {
            return ['ok' => false, 'message' => 'This ERP installation is already bound to another company.', 'activation' => null];
        }
        if ($existing && $existing->sync_token && $existing->client_id === $clientId) {
            $sync = $this->sync($existing, $expectedTenantEmail);
            if ($sync['ok']) {
                $existing->update(['activated' => true]);
            }

            return ['ok' => $sync['ok'], 'message' => $sync['message'] ?? null, 'activation' => $existing->fresh()];
        }

        $result = $this->client->register($companyCode, $clientId, $oneTimePassword);
        if (! $result['ok']) {
            return ['ok' => false, 'message' => $result['message'] ?? 'Registration was rejected by the platform.', 'activation' => null];
        }

        $activation = PlatformActivation::updateOrCreate(
            ['company_code' => $companyCode],
            [
                'client_id' => $clientId,
                'sync_token' => $result['data']['sync_token'] ?? null,
                'activated' => false,
                'registered_at' => now(),
            ]
        );

        // Pull the full configuration immediately rather than making the installer wait for the
        // next scheduled platform:sync — registering and then showing "not activated" until a
        // cron fires would look broken even though it isn't.
        $sync = $this->sync($activation, $expectedTenantEmail);
        if ($sync['ok']) {
            $activation->update(['activated' => true]);
        }

        return ['ok' => $sync['ok'], 'message' => $sync['message'] ?? null, 'activation' => $activation->fresh()];
    }

    /**
     * Pulls this deployment's configuration and applies it. Never throws: a failed pull leaves the
     * last-known state in place (the deployment keeps running on stale-but-valid data) and records
     * the error for status() to surface, rather than blanking out a working activation because the
     * platform was briefly unreachable.
     */
    public function sync(?PlatformActivation $activation = null, ?string $expectedTenantEmail = null): array
    {
        $activation ??= PlatformActivation::current();
        if (! $activation) {
            return ['ok' => false, 'message' => 'Not registered with the platform yet.'];
        }

        $result = $this->client->pullSnapshot($activation->company_code, $activation->sync_token);
        if (! $result['ok']) {
            $activation->update(['last_sync_error' => $result['message'] ?? ('HTTP '.$result['status'])]);

            return ['ok' => false, 'message' => $result['message']];
        }

        $company = $result['data']['company'] ?? [];
        if (($company['company_code'] ?? null) !== $activation->company_code) {
            return ['ok' => false, 'message' => 'GP Admin returned configuration for a different company.'];
        }
        if ($expectedTenantEmail && (strcasecmp((string) ($company['tenant_admin_email'] ?? ''), $expectedTenantEmail) !== 0
            || ($company['status'] ?? '') !== 'active')) {
            return ['ok' => false, 'message' => 'The company snapshot does not match the verified Tenant Admin.'];
        }
        $licenceToken = $result['data']['licence'] ?? null;
        $licenceClaims = $this->decodeLicenceClaims($licenceToken);

        $activation->update([
            'sync_token' => $result['data']['sync_token'] ?? $activation->sync_token,
            'status' => $company['status'] ?? $activation->status,
            'active_till' => $company['active_till'] ?? null,
            'limits' => $company['limits'] ?? [],
            'feature_flags' => $company['feature_flags'] ?? [],
            'licence_token' => $licenceToken,
            'licence_state' => $licenceClaims['status'] ?? $activation->licence_state,
            'licence_expires_at' => isset($licenceClaims['exp']) ? date('Y-m-d H:i:s', (int) $licenceClaims['exp']) : $activation->licence_expires_at,
            'licence_grace_until' => isset($licenceClaims['exp'], $licenceClaims['grace'])
                ? date('Y-m-d H:i:s', (int) $licenceClaims['exp'] + (int) $licenceClaims['grace'])
                : $activation->licence_grace_until,
            'last_synced_at' => now(),
            'last_sync_error' => null,
            'tenant_admin_email' => $company['tenant_admin_email'] ?? null,
            'onboarding_required' => (bool) ($company['onboarding_required'] ?? false),
            'first_erp_login_at' => $company['first_erp_login_at'] ?? null,
        ]);

        try {
            if (! $activation->deployment_id) {
                $activation->update(['deployment_id' => (string) Str::uuid()]);
            }
            $this->importStores($activation, $result['data']['stores'] ?? []);
            $this->importWarehouses($activation, $result['data']['warehouses'] ?? []);
            $this->adoptTenantPassword($activation, $company);
            $this->importStoreAdministrators($activation, $result['data']['stores'] ?? []);
            if ($expectedTenantEmail && ! User::whereRaw('LOWER(email) = ?', [strtolower($expectedTenantEmail)])
                ->where('platform_company_code', $activation->company_code)->whereNull('store_id')->where('role', 'admin')->where('is_active', true)->exists()) {
                throw new \RuntimeException('Tenant Admin credentials are not available for this installation. Request fresh setup details from GP Admin.');
            }
        } catch (\RuntimeException $exception) {
            $activation->update(['last_sync_error' => $exception->getMessage()]);

            return ['ok' => false, 'message' => $exception->getMessage()];
        }

        return ['ok' => true, 'message' => null];
    }

    private function importWarehouses(PlatformActivation $activation, array $warehouses): void
    {
        Warehouse::withoutEvents(function () use ($activation, $warehouses): void {
            DB::transaction(function () use ($activation, $warehouses): void {
                $seen = [];
                foreach ($warehouses as $source) {
                    if (! ($source['licence_inherited'] ?? false)) {
                        continue;
                    }
                    $store = Store::where('platform_company_code', $activation->company_code)->where('platform_store_id', $source['store_id'] ?? 0)->first();
                    if (! $store) {
                        throw new \RuntimeException('Warehouse references a store that is not provisioned in this company.');
                    }
                    $id = (int) ($source['warehouse_id'] ?? 0);
                    if ($id < 1) {
                        throw new \RuntimeException('Invalid warehouse identity.');
                    }
                    $warehouse = Warehouse::withoutGlobalScopes()->where('platform_warehouse_id', $id)->first();
                    if ($warehouse && ($warehouse->platform_company_code !== $activation->company_code || $warehouse->store_id !== $store->id)) {
                        throw new \RuntimeException('Warehouse ownership changed. Reconcile stock before importing it.');
                    }
                    $warehouse ??= new Warehouse;
                    $warehouse->fill(['platform_warehouse_id' => $id, 'platform_company_code' => $activation->company_code,
                        'store_id' => $store->id, 'name' => $source['name'], 'code' => $source['code'],
                        'is_active' => $store->is_active && ($source['status'] ?? '') === 'active'])->save();
                    $seen[] = $id;
                }
                Warehouse::withoutGlobalScopes()->where('platform_company_code', $activation->company_code)
                    ->whereNotIn('platform_warehouse_id', $seen)->update(['is_active' => false]);
            });
        });
    }

    private function importStores(PlatformActivation $activation, array $stores): void
    {
        DB::transaction(function () use ($activation, $stores): void {
            $seen = [];
            foreach ($stores as $source) {
                if (! ($source['activation_required'] ?? false)) {
                    continue;
                }
                $id = (int) ($source['store_id'] ?? 0);
                if ($id < 1 || empty($source['code'])) {
                    throw new \RuntimeException('GP Admin returned an invalid store identity.');
                }
                $local = Store::where('platform_store_id', $id)->first();
                if ($local && $local->platform_company_code !== $activation->company_code) {
                    throw new \RuntimeException('Store identity conflicts with a different local company.');
                }
                if (Store::where('code', $source['code'])->when($local, fn ($q) => $q->where('id', '!=', $local->id))->exists()) {
                    throw new \RuntimeException('A GP Admin store code conflicts with an unlinked local store. Reconcile it before sync.');
                }
                $local ??= new Store;
                $local->fill([
                    'name' => $source['name'], 'code' => $source['code'],
                    'platform_store_id' => $id, 'platform_company_code' => $activation->company_code,
                    'activation_required' => true, 'activated_at' => $source['activated_at'] ?? null,
                    'is_active' => $activation->status === 'active' && ($source['status'] ?? '') === 'active'
                        && ! empty($source['activated_at']) && ($source['deployment_id'] ?? '') === $activation->deployment_id
                        && ! empty($source['active_till']) && Carbon::parse($source['active_till'])->isFuture()
                        && ($source['subscription']['status'] ?? '') === 'active',
                    'platform_active_till' => $source['active_till'] ?? null,
                    'platform_licence_token' => $source['licence'] ?? null,
                    'platform_subscription' => $source['subscription'] ?? null,
                ]);
                if ($local->is_active && ! app(StoreLicenceVerifier::class)->verify($local, $activation)['ok']) {
                    throw new \RuntimeException('GP Admin returned a store licence that this installation cannot verify. Check the pinned public key and refresh.');
                }
                $local->save();
                $seen[] = $id;
            }
            Store::where('platform_company_code', $activation->company_code)->whereNotNull('platform_store_id')
                ->whereNotIn('platform_store_id', $seen)->update(['is_active' => false]);
        });
    }

    /**
     * Copies a platform-issued tenant admin password into a local login. Gpretail_Admin keeps
     * tenant_password_hash set on the company until this deployment confirms it's been adopted (see
     * TenantRegistrationController::passwordAdopted on that side) -- so its presence here is exactly
     * "there's a password waiting to be picked up", and calling passwordAdopted() is what makes the
     * platform stop sending it. The hash is PHP's native password_hash() (bcrypt, $2y$-prefixed, see
     * Gpretail_Admin's TenantPasswordHasher), the same format Laravel's own Hash facade produces, so
     * it can be stored directly into users.password and verified by this app's normal Hash::check()
     * login path -- no re-hashing, no separate verification path.
     */
    private function adoptTenantPassword(PlatformActivation $activation, array $company): void
    {
        $email = isset($company['tenant_admin_email']) ? strtolower(trim((string) $company['tenant_admin_email'])) : '';
        $hash = $company['tenant_password_hash'] ?? null;
        $version = $company['tenant_password_version'] ?? null;

        if ($email === '' || empty($hash) || $version === null) {
            return;
        }

        $mustChange = (bool) ($company['tenant_password_must_change'] ?? false);
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if ($user && ($user->platform_company_code !== $activation->company_code || $user->store_id)) {
            throw new \RuntimeException('The tenant email conflicts with an existing local account. Resolve its company ownership before activation.');
        }
        if ($user && (int) $user->platform_password_version >= (int) $version) {
            $this->client->passwordAdopted($activation->company_code, $activation->sync_token, (int) $version);

            return;
        }

        if ($user) {
            $user->password = $hash;
            $user->must_change_password = $mustChange;
            $user->is_active = true;
            $user->platform_password_version = (int) $version;
            $user->save();
        } else {
            User::create([
                'name' => $company['name'] ?? 'Tenant Administrator',
                'username' => $this->uniqueUsernameFor($email),
                'email' => $email,
                'password' => $hash,
                'role' => 'admin',
                'store_id' => null, // Company owner chooses a store; never assign the first local store.
                'is_active' => true,
                'must_change_password' => $mustChange,
                'platform_company_code' => $activation->company_code,
                'platform_password_version' => (int) $version,
            ]);
        }

        $this->client->passwordAdopted($activation->company_code, $activation->sync_token, (int) $version);
    }

    private function importStoreAdministrators(PlatformActivation $activation, array $stores): void
    {
        $seen = [];
        $acknowledgements = [];
        DB::transaction(function () use ($activation, $stores, &$seen, &$acknowledgements): void {
            foreach ($stores as $source) {
                $store = Store::where('platform_company_code', $activation->company_code)
                    ->where('platform_store_id', $source['store_id'] ?? 0)->first();
                if (! $store) {
                    continue;
                }
                $identity = 'store:'.$store->platform_store_id;
                $seen[] = $identity;
                $email = strtolower(trim((string) ($source['admin_email'] ?? '')));
                $user = User::where('platform_company_code', $activation->company_code)->where('platform_identity', $identity)->first();
                if ($email === '') {
                    $user?->update(['is_active' => false]);

                    continue;
                }
                $emailUser = User::whereRaw('LOWER(email) = ?', [$email])->first();
                if ($emailUser && $emailUser->platform_company_code === $activation->company_code
                    && ! $emailUser->store_id && $emailUser->role === 'admin'
                    && strcasecmp($email, $activation->tenant_admin_email ?? '') === 0) {
                    $user?->update(['is_active' => false]);

                    continue;
                }
                if ($emailUser && ($emailUser->platform_company_code !== $activation->company_code
                    || (int) $emailUser->store_id !== (int) $store->id || ($user && $emailUser->id !== $user->id))) {
                    throw new \RuntimeException('A store administrator email conflicts with another ERP account. Resolve ownership before sync.');
                }
                $user ??= $emailUser;
                $hash = $source['admin_password_hash'] ?? null;
                $version = (int) ($source['admin_password_version'] ?? 0);
                if ($hash && (! is_string($hash) || (password_get_info($hash)['algoName'] ?? 'unknown') === 'unknown' || $version < 1)) {
                    throw new \RuntimeException('GP Admin returned invalid store administrator credentials.');
                }
                if ($user && strcasecmp($user->email, $email) !== 0 && (! $hash || $version <= (int) $user->platform_password_version)) {
                    $user->update(['is_active' => false]);

                    continue;
                }
                if (! $user && ! $hash) {
                    continue;
                }
                if (! $user) {
                    $username = trim((string) ($source['admin_username'] ?? ''));
                    if ($username !== '' && User::where('username', $username)->exists()) {
                        throw new \RuntimeException('A store administrator username conflicts with another ERP account. Resolve it before sync.');
                    }
                    $user = new User(['username' => $username !== '' ? $username : $this->uniqueUsernameFor($email)]);
                }
                $user->fill([
                    'name' => $source['admin_name'] ?? $source['name'], 'email' => $email,
                    'role' => 'admin', 'store_id' => $store->id, 'platform_company_code' => $activation->company_code,
                    'platform_identity' => $identity, 'is_active' => $store->is_active,
                ]);
                if ($hash && (! $user->exists || $version > (int) $user->platform_password_version)) {
                    $user->password = $hash;
                    $user->platform_password_version = $version;
                    $user->must_change_password = (bool) ($source['admin_password_must_change'] ?? false);
                }
                if ($user->isDirty('email') && $user->exists) {
                    $user->google_sub = null;
                }
                $user->save();
                if ($hash) {
                    $acknowledgements[] = [$version, $store->code];
                }
            }
            User::where('platform_company_code', $activation->company_code)->where('platform_identity', 'like', 'store:%')
                ->whereNotIn('platform_identity', $seen)->get()->each(fn (User $user) => $user->update(['is_active' => false]));
        });
        foreach ($acknowledgements as [$version, $storeCode]) {
            $this->client->passwordAdopted($activation->company_code, $activation->sync_token, $version, $storeCode);
        }
    }

    private function uniqueUsernameFor(string $email): string
    {
        $base = Str::slug(strstr($email, '@', true)) ?: 'tenant-admin';
        $username = $base;
        $suffix = 1;
        while (User::where('username', $username)->exists()) {
            $username = $base.'-'.(++$suffix);
        }

        return $username;
    }

    /**
     * Reads the unsigned claims out of the licence JWT for display purposes only (status/expiry to
     * show the operator). This is NOT signature verification — LicenceSigner on the Gpretail_Admin
     * side is the source of truth; a deployment trusts what its own registered sync token pulled
     * over HTTPS from the platform it just authenticated to, the same way the rest of this snapshot
     * is trusted without a second signature check on every field.
     */
    private function decodeLicenceClaims(?string $token): array
    {
        if (! $token || substr_count($token, '.') !== 2) {
            return [];
        }
        [, $payload] = explode('.', $token);
        $base64 = strtr($payload, '-_', '+/');
        $base64 .= str_repeat('=', (4 - strlen($base64) % 4) % 4);
        $json = base64_decode($base64, true);
        $claims = $json ? json_decode($json, true) : null;

        return is_array($claims) ? $claims : [];
    }
}
