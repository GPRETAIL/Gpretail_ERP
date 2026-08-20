<?php

/**
 * Hostinger Instant Deployment Unzipper & Migration Runner
 */

// Secret deployment token to prevent unauthorized access
$deployToken = 'NextErpDeploySecret2026';

if (($_GET['token'] ?? '') !== $deployToken) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json');

$zipFile = __DIR__ . '/deploy.zip';

if (!file_exists($zipFile)) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'deploy.zip not found in ' . __DIR__,
    ]);
    exit;
}

$zip = new ZipArchive();
$res = $zip->open($zipFile);

if ($res === true) {
    // Extract all files directly into current directory
    $zip->extractTo(__DIR__);
    $zip->close();
    
    // Delete the zip file after extraction
    @unlink($zipFile);
    
    // Ensure write permissions for storage and cache
    @mkdir(__DIR__ . '/storage/framework/cache/data', 0777, true);
    @mkdir(__DIR__ . '/storage/framework/sessions', 0777, true);
    @mkdir(__DIR__ . '/storage/framework/views', 0777, true);
    @mkdir(__DIR__ . '/storage/logs', 0777, true);
    @mkdir(__DIR__ . '/bootstrap/cache', 0777, true);
    
    // Delete default placeholder if present
    if (file_exists(__DIR__ . '/default.php')) {
        @unlink(__DIR__ . '/default.php');
    }

    echo json_encode([
        'status'  => 'success',
        'message' => 'Deployment package extracted and initialized successfully!',
    ]);
} else {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Failed to open deploy.zip, error code: ' . $res,
    ]);
}
