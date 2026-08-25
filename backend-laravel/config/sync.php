<?php

return [
    // 'local' on a store's on-prem install, 'cloud' on the shared dev.gpsoftware.in install.
    'node_role' => env('SYNC_NODE_ROLE', 'cloud'),

    // Where a local install pushes/pulls sync traffic to/from.
    'cloud_api_base_url' => env('SYNC_CLOUD_API_BASE_URL', 'https://dev.gpsoftware.in/api'),

    // Shared secret for the externally-triggered sync cron endpoint (Phase 2).
    'cron_secret' => env('SYNC_CRON_SECRET'),
];
