<?php

namespace App\Services;

use App\Models\PlatformActivation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class LegacyTenantOwnerLink
{
    public function link(string $email, array $company): User
    {
        $activation = PlatformActivation::current();
        if (! $activation?->activated || ($company['company_code'] ?? '') !== $activation->company_code
            || config('platform.company_code') !== $activation->company_code || ($company['status'] ?? '') !== 'active'
            || strcasecmp($email, $company['tenant_admin_email'] ?? '') !== 0 || ($company['onboarding_required'] ?? false)
            || ! empty($company['tenant_password_hash'])) {
            throw new \RuntimeException('Legacy account linking requires the registered company identity and an already adopted owner password.');
        }

        return DB::transaction(function () use ($email, $company, $activation): User {
            $user = User::whereRaw('LOWER(email) = ?', [strtolower($email)])->lockForUpdate()->firstOrFail();
            if ($user->role !== 'admin' || $user->store_id || ($user->platform_company_code && $user->platform_company_code !== $activation->company_code)) {
                throw new \RuntimeException('This account has conflicting store/company ownership.');
            }
            $user->update(['platform_company_code' => $activation->company_code,
                'platform_password_version' => max((int) $user->platform_password_version, (int) ($company['tenant_password_version'] ?? 0))]);

            return $user;
        });
    }
}
