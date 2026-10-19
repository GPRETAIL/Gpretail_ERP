<?php

namespace App\Services;

use App\Models\PlatformActivation;
use App\Models\Store;

class StoreLicenceVerifier
{
    public const DEV_PUBLIC_KEY = 'MCowBQYDK2VwAyEAj5cKxJkJKAyG3zFVAiwZL0xyiWeCvfIzOpUoCrrgvfA=';

    public function verify(Store $store, ?PlatformActivation $activation = null): array
    {
        $activation ??= PlatformActivation::current();
        $invalid = ['ok' => false, 'message' => 'Store licence is invalid or expired. Refresh from GP Admin or renew this store.', 'claims' => []];
        if (! $activation?->activated || $activation->status !== 'active' || ! $store->activated_at) {
            return $invalid;
        }
        $parts = explode('.', $store->platform_licence_token ?? '');
        if (count($parts) !== 3) {
            return $invalid;
        }
        $header = json_decode($this->decode($parts[0]) ?: '', true);
        $claims = json_decode($this->decode($parts[1]) ?: '', true);
        if (! is_array($header) || ! is_array($claims) || ($header['alg'] ?? '') !== 'EdDSA' || ($header['typ'] ?? '') !== 'JWT') {
            return $invalid;
        }
        $kid = $header['kid'] ?? '';
        $keys = config('platform.licence_public_keys', []);
        if (app()->environment(['local', 'testing'])) {
            $keys['dev'] ??= self::DEV_PUBLIC_KEY;
        }
        $public = $keys[$kid] ?? null;
        if (! is_string($public) || $public === '' || ($claims['kid'] ?? '') !== $kid) {
            return ['ok' => false, 'message' => 'The store licence signing key is not configured for this ERP server. Ask your administrator to pin the verified Vynerix Admin production public key, then refresh stores.', 'claims' => []];
        }
        $pem = "-----BEGIN PUBLIC KEY-----\n".chunk_split($public, 64, "\n").'-----END PUBLIC KEY-----';
        $key = openssl_pkey_get_public($pem);
        $signature = $this->decode($parts[2]);
        if (! $key || $signature === false || openssl_verify($parts[0].'.'.$parts[1], $signature, $key, null) !== 1) {
            return $invalid;
        }
        $now = now()->timestamp;
        if (($claims['iss'] ?? '') !== 'vx-admin' || ($claims['aud'] ?? '') !== 'next-erp'
            || ($claims['sub'] ?? '') !== $store->code
            || ($claims['company_code'] ?? '') !== $activation->company_code
            || $store->platform_company_code !== $activation->company_code
            || ($claims['store_id'] ?? null) !== (int) $store->platform_store_id
            || empty($activation->deployment_id) || ($claims['deployment_id'] ?? '') !== $activation->deployment_id
            || ($claims['status'] ?? '') !== 'active' || ($claims['subscription_status'] ?? '') !== 'active'
            || ! is_int($claims['iat'] ?? null) || $claims['iat'] > $now + 60
            || ! is_int($claims['exp'] ?? null) || ! is_int($claims['activeTill'] ?? null)
            || ! is_int($claims['offline_until'] ?? null) || $claims['exp'] < $claims['iat']
            || $claims['offline_until'] > $claims['activeTill'] || $claims['offline_until'] < $claims['exp']
            || $now >= $claims['activeTill'] || $now >= $claims['offline_until']) {
            return $invalid;
        }

        return ['ok' => true, 'message' => null, 'claims' => $claims];
    }

    private function decode(string $value): string|false
    {
        if (! preg_match('/^[A-Za-z0-9_-]+$/', $value)) {
            return false;
        }

        return base64_decode(strtr($value, '-_', '+/'), true);
    }
}
