<?php

return [
    // Explicit self-instance marker for local development diagnostics only.
    'development_server_origin' => env('DEV_SERVER_ORIGIN'),
    // 'local' on a store's on-prem install, 'cloud' on the shared dev.gpsoftware.in install.
    'probe_allowed_endpoints' => array_values(array_filter(array_map('trim', explode(',', env('SERVER_PROBE_ALLOWED_ENDPOINTS', ''))))),

    'node_role' => env('SYNC_NODE_ROLE', 'cloud'),

    // Where a local install pushes/pulls sync traffic to/from.
    'cloud_api_base_url' => env('SYNC_CLOUD_API_BASE_URL', 'https://dev.gpsoftware.in/api'),

    // Shared secret for the externally-triggered sync cron endpoint (Phase 2).
    'cron_secret' => env('SYNC_CRON_SECRET'),

    // Sync now / Re-copy run in a background process (ManualSync); tests run them in the request instead.
    'manual_inline' => (bool) env('SYNC_MANUAL_INLINE', false),
    // The PHP command line for that process, when it cannot be found next to php.ini (e.g. D:/xampp/php/php.exe).
    'php_binary' => env('SYNC_PHP_BINARY'),
];
