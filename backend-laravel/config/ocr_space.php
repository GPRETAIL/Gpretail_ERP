<?php

return [
    'key' => env('OCR_SPACE_API_KEY'),
    'endpoint' => env('OCR_SPACE_API_URL', 'https://api.ocr.space/parse/image'),
    'timeout' => (int) env('OCR_SPACE_TIMEOUT', 120),
    'connect_timeout' => (int) env('OCR_SPACE_CONNECT_TIMEOUT', 10),
];
