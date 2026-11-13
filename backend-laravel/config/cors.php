<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // CORS_EXTRA_ORIGINS: a store's intranet address with dots, e.g. http://erp.store.local:5173 (comma list).
    'allowed_origins' => array_values(array_filter(array_merge(['https://dev.gpsoftware.in'],
        array_map('trim', explode(',', (string) env('CORS_EXTRA_ORIGINS', '')))))),

    // Local-server / cloud-failover: a page served from either side needs to call the other
    // directly from the browser (dev.gpsoftware.in -> a store's LAN IP, and back). Store LAN
    // IPs aren't known in advance, so private ranges are allowed by pattern instead of listing
    // every store's address; localhost covers same-machine dev/testing.
    'allowed_origins_patterns' => [
        '#^https?://localhost(:\d+)?$#',
        '#^https?://127\.0\.0\.1(:\d+)?$#',
        '#^https?://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$#',
        '#^https?://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$#',
        '#^https?://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$#',
        // A store's on-prem counters by machine name, e.g. http://mainserver:5173, failing over to the cloud.
        // Single-label (dotless) names only exist inside a network; every public site has a dot.
        '#^https?://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(:\d+)?$#i',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
