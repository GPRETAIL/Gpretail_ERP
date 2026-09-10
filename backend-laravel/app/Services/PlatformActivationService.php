<?php

namespace App\Services;

use App\Models\PlatformActivation;
use App\Models\User;
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
    public function register(string $oneTimePassword, ?string $companyCode = null, ?string $clientId = null): array
    {
        $companyCode = $companyCode ?: (string) config('platform.company_code');
        $clientId = $clientId ?: (string) config('platform.client_id');

        if ($companyCode === '' || $clientId === '') {
            return ['ok' => false, 'message' => 'This deployment has no company_code/client_id configured. Set PLATFORM_COMPANY_CODE and PLATFORM_CLIENT_ID.', 'activation' => null];
        }

        $result = $this->client->register($companyCode, $clientId, $oneTimePassword);
        if (!$result['ok']) {
            return ['ok' => false, 'message' => $result['message'] ?? 'Registration was rejected by the platform.', 'activation' => null];
        }

        $activation = PlatformActivation::updateOrCreate(
            ['company_code' => $companyCode],
            [
                'client_id' => $clientId,
                'sync_token' => $result['data']['sync_token'] ?? null,
                'activated' => true,
                'registered_at' => now(),
            ]
        );

        // Pull the full configuration immediately rather than making the installer wait for the
        // next scheduled platform:sync — registering and then showing "not activated" until a
        // cron fires would look broken even though it isn't.
        $this->sync($activation);

        return ['ok' => true, 'message' => null, 'activation' => $activation->fresh()];
    }

    /**
     * Pulls this deployment's configuration and applies it. Never throws: a failed pull leaves the
     * last-known state in place (the deployment keeps running on stale-but-valid data) and records
     * the error for status() to surface, rather than blanking out a working activation because the
     * platform was briefly unreachable.
     */
    public function sync(?PlatformActivation $activation = null): array
    {
        $activation ??= PlatformActivation::current();
        if (!$activation) {
            return ['ok' => false, 'message' => 'Not registered with the platform yet.'];
        }

        $result = $this->client->pullSnapshot($activation->company_code, $activation->sync_token);
        if (!$result['ok']) {
            $activation->update(['last_sync_error' => $result['message'] ?? ('HTTP '.$result['status'])]);

            return ['ok' => false, 'message' => $result['message']];
        }

        $company = $result['data']['company'] ?? [];
        $licenceToken = $result['data']['licence'] ?? null;
        $licenceClaims = $this->decodeLicenceClaims($licenceToken);

        $activation->update([
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
        ]);

        $this->adoptTenantPassword($activation, $company);

        return ['ok' => true, 'message' => null];
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

        if ($user) {
            $user->password = $hash;
            $user->must_change_password = $mustChange;
            $user->is_active = true;
            $user->save();
        } else {
            User::create([
                'name' => $company['name'] ?? 'Tenant Administrator',
                'username' => $this->uniqueUsernameFor($email),
                'email' => $email,
                'password' => $hash,
                'role' => 'admin',
                'store_id' => DB::table('stores')->value('id'),
                'is_active' => true,
                'must_change_password' => $mustChange,
            ]);
        }

        $this->client->passwordAdopted($activation->company_code, $activation->sync_token, (int) $version);
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
        if (!$token || substr_count($token, '.') !== 2) {
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
