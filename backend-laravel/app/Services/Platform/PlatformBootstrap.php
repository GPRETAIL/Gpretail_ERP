<?php

namespace App\Services\Platform;

use App\Models\PlatformActivation;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class PlatformBootstrap
{
    public function issue(string $email, string $password): array
    {
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'status' => 401, 'message' => 'Use the Tenant Admin email from your company welcome email for initial setup.'];
        }
        if (PlatformActivation::current()?->activated) {
            return ['ok' => false, 'status' => 401, 'message' => 'Invalid username or password.'];
        }
        if (config('sync.node_role') === 'local') {
            // Vynerix admin allows one installation per company; an on-prem server is set up from its cloud.
            return ['ok' => false, 'status' => 401, 'message' => 'This on-prem server is not set up yet. Reload the page and use Connect to cloud.'];
        }

        $result = app(PlatformClient::class)->authenticateTenant($email, $password);
        if (! $result['ok']) {
            $status = $result['status'] ?? 0;

            return ['ok' => false, 'status' => $status === 429 ? 429 : (in_array($status, [401, 403], true) ? 401 : 503),
                'message' => $status === 429 ? 'Too many setup attempts. Try again shortly.' : 'Could not verify company setup with GP Admin. Check your credentials and connection, then retry.'];
        }
        $identity = $result['data'];
        if (($identity['authenticated'] ?? false) !== true) {
            // GP Admin answered, but this email and password are not an active company's owner there.
            return ['ok' => false, 'status' => 401, 'message' => "GP Admin did not accept this email and password. Use the company owner's ERP password from the welcome email, not the company-portal password. If this company's ERP is already installed elsewhere, sign in there: a company has one installation."];
        }
        $company = $identity['company_code'] ?? '';
        $configured = config('platform.company_code');
        $existing = PlatformActivation::current();
        if (($identity['authenticated'] ?? false) !== true || ! is_string($company) || $company === ''
            || strcasecmp((string) ($identity['email'] ?? ''), $email) !== 0
            || ($configured && $configured !== $company) || ($existing && $existing->company_code !== $company)) {
            return ['ok' => false, 'status' => 401, 'message' => 'Invalid company credentials for this installation.'];
        }

        return $this->create($company, $email, $identity['company_name'] ?? $company, array_intersect_key($identity, array_flip(['client_id', 'registration_ticket'])));
    }

    public function resume(User $user): ?array
    {
        $activation = PlatformActivation::current();
        if (! $activation || $activation->activated || ! $activation->sync_token || ! $user->is_active
            || $user->store_id || $user->role !== 'admin' || $user->platform_company_code !== $activation->company_code
            || strcasecmp($user->email, $activation->tenant_admin_email ?? '') !== 0) {
            return null;
        }

        return $this->create($activation->company_code, $user->email, $activation->company_code);
    }

    private function create(string $company, string $email, string $name, array $registration = []): array
    {
        $token = Str::random(64);
        Cache::put($this->key($token), array_merge($registration, ['company_code' => $company, 'email' => strtolower($email)]), now()->addMinutes(15));

        return ['ok' => true, 'data' => [
            'activation_required' => true, 'setup_token' => $token, 'expires_in_seconds' => 900,
            'company_code' => $company, 'company_name' => $name,
        ]];
    }

    public function identity(string $token): ?array
    {
        return $token !== '' ? Cache::get($this->key($token)) : null;
    }

    public function forget(string $token): void
    {
        Cache::forget($this->key($token));
    }

    private function key(string $token): string
    {
        return 'erp-company-setup:'.hash('sha256', $token);
    }
}
