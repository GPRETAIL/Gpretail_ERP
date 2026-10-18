<?php

namespace App\Services;

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

        $result = app(PlatformClient::class)->authenticateTenant($email, $password);
        if (! $result['ok']) {
            $status = $result['status'] ?? 0;

            return ['ok' => false, 'status' => $status === 429 ? 429 : (in_array($status, [401, 403], true) ? 401 : 503),
                'message' => $status === 429 ? 'Too many setup attempts. Try again shortly.' : 'Could not verify company setup with GP Admin. Check your credentials and connection, then retry.'];
        }
        $identity = $result['data'];
        $company = $identity['company_code'] ?? '';
        $configured = config('platform.company_code');
        $existing = PlatformActivation::current();
        if (($identity['authenticated'] ?? false) !== true || ! is_string($company) || $company === ''
            || strcasecmp((string) ($identity['email'] ?? ''), $email) !== 0
            || ($configured && $configured !== $company) || ($existing && $existing->company_code !== $company)) {
            return ['ok' => false, 'status' => 401, 'message' => 'Invalid company credentials for this installation.'];
        }

        return $this->create($company, $email, $identity['company_name'] ?? $company);
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

    private function create(string $company, string $email, string $name): array
    {
        $token = Str::random(64);
        Cache::put($this->key($token), ['company_code' => $company, 'email' => strtolower($email)], now()->addMinutes(15));

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
