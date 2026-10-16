<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use JsonException;

class GoogleIdTokenVerifier
{
    public function verify(string $token): ?array
    {
        $audience = config('services.google.client_id');
        abort_unless(is_string($audience) && $audience !== '', 503, 'Google sign-in is not configured.');
        $parts = explode('.', $token);
        if (strlen($token) > 16384 || count($parts) !== 3) {
            return null;
        }
        try {
            $header = json_decode($this->decode($parts[0]) ?? '', true, flags: JSON_THROW_ON_ERROR);
            $claims = json_decode($this->decode($parts[1]) ?? '', true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }
        if (! is_array($header) || ! is_array($claims) || ($header['alg'] ?? null) !== 'RS256'
            || ! is_string($header['kid'] ?? null) || $header['kid'] === '') {
            return null;
        }
        $certificates = Cache::get('google:id-token:certificates');
        if (! is_array($certificates)) {
            try {
                $response = Http::timeout(5)->withoutRedirecting()->get('https://www.googleapis.com/oauth2/v1/certs');
            } catch (\Illuminate\Http\Client\ConnectionException) {
                abort(503, 'Google sign-in verification is temporarily unavailable.');
            }
            abort_unless($response->successful() && is_array($response->json()) && $response->json() !== [], 503, 'Google sign-in verification is temporarily unavailable.');
            $certificates = $response->json();
            preg_match('/max-age=(\d+)/i', $response->header('Cache-Control'), $matches);
            Cache::put('google:id-token:certificates', $certificates, min(3600, max(1, (int) ($matches[1] ?? 300))));
        }
        $certificate = $certificates[$header['kid']] ?? null;
        $signature = $this->decode($parts[2]);
        if (! is_string($certificate) || $signature === null) {
            return null;
        }
        $key = openssl_pkey_get_public($certificate);
        if ($key === false || openssl_verify($parts[0].'.'.$parts[1], $signature, $key, OPENSSL_ALGO_SHA256) !== 1) {
            return null;
        }
        if (! in_array($claims['iss'] ?? null, ['accounts.google.com', 'https://accounts.google.com'], true)
            || ($claims['aud'] ?? null) !== $audience || (isset($claims['azp']) && $claims['azp'] !== $audience)
            || ! is_int($claims['exp'] ?? null) || $claims['exp'] <= time()
            || ! is_int($claims['iat'] ?? null) || $claims['iat'] > time()
            || ! is_string($claims['sub'] ?? null) || $claims['sub'] === '' || strlen($claims['sub']) > 255
            || ($claims['email_verified'] ?? false) !== true
            || ! is_string($claims['email'] ?? null) || ! filter_var($claims['email'], FILTER_VALIDATE_EMAIL)) {
            return null;
        }
        return $claims;
    }

    private function decode(string $part): ?string
    {
        if (! preg_match('/^[A-Za-z0-9_-]+$/D', $part)) {
            return null;
        }
        $value = base64_decode(strtr($part, '-_', '+/'), true);
        return $value === false ? null : $value;
    }
}
