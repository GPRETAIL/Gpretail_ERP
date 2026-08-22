<?php

return [
    'url' => env('INVOICE_AI_URL'),
    'token' => env('INVOICE_AI_TOKEN'),
    'timeout' => (int) env('INVOICE_AI_TIMEOUT', 120),
    'connect_timeout' => (int) env('INVOICE_AI_CONNECT_TIMEOUT', 10),
];
