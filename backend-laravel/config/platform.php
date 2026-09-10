<?php

return [
    // Gpretail_Admin's base URL (the platform/control-plane side of this deployment).
    'base_url' => env('PLATFORM_BASE_URL', 'http://localhost:8000'),

    // Issued when this company was created in Gpretail_Admin — set these once at install time.
    'company_code' => env('PLATFORM_COMPANY_CODE'),
    'client_id' => env('PLATFORM_CLIENT_ID'),

    // The co-located platform-service header, for a Gpretail_Admin instance running on the same
    // trusted network as this deployment. Only used as a fallback when no sync token is stored yet
    // (e.g. re-pulling a snapshot after losing the token) — normal calls use the sync token issued
    // at registration.
    'service_token' => env('PLATFORM_SERVICE_TOKEN'),

    'http_timeout_seconds' => env('PLATFORM_HTTP_TIMEOUT', 15),
];
