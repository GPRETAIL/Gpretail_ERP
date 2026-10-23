<?php

return [
    // Ed25519 SubjectPublicKeyInfo (base64 or PEM) keyed by JWT 'kid'.
    // Never hardcode development or fallback public keys in source code.
    'licence_public_keys' => array_filter([
        'prod' => env('PLATFORM_LICENCE_PUBLIC_KEY', ''),
        'dev' => env('PLATFORM_LICENCE_DEV_PUBLIC_KEY', ''),
    ], fn ($value) => is_string($value) && trim($value) !== ''),

    // Gpretail_Admin's base URL (the platform/control-plane side of this deployment).
    'base_url' => env('PLATFORM_BASE_URL', 'http://localhost:8000'),
    'portal_url' => env('PLATFORM_PORTAL_URL', 'https://company.gpsoftware.in/login'),

    // Issued when this company was created in Gpretail_Admin — set these once at install time.
    'company_code' => env('PLATFORM_COMPANY_CODE'),
    'client_id' => env('PLATFORM_CLIENT_ID'),

    'http_timeout_seconds' => env('PLATFORM_HTTP_TIMEOUT', 15),
];
