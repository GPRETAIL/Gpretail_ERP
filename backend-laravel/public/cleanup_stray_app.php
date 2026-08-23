<?php

/**
 * One-time cleanup: the "app" directory left over from an earlier, abandoned PWA build attempt
 * was shadowing the current app's /app/* routing (Apache found the stray directory before
 * mod_rewrite got a chance to route to index.php). Renames it out of the way rather than
 * deleting it outright, so nothing is unrecoverable if it turns out to hold something unexpected.
 * Delete this script after confirming the rename fixed /app/*.
 */

$deployToken = 'NextErpDeploySecret2026';

if (($_GET['token'] ?? '') !== $deployToken) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json');

$target = __DIR__ . '/app';

if (!is_dir($target)) {
    echo json_encode(['status' => 'noop', 'message' => 'No "app" directory found - nothing to do.']);
    exit;
}

$listing = [];
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($target, FilesystemIterator::SKIP_DOTS)
);
foreach ($iterator as $file) {
    $listing[] = str_replace($target . DIRECTORY_SEPARATOR, '', $file->getPathname());
}

$backupPath = __DIR__ . '/app_old_backup_' . date('Ymd_His');

if (!rename($target, $backupPath)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Rename failed.', 'contents' => $listing]);
    exit;
}

echo json_encode([
    'status' => 'success',
    'message' => 'Renamed app/ to ' . basename($backupPath) . ' (not deleted).',
    'file_count' => count($listing),
    'contents_sample' => array_slice($listing, 0, 30),
]);
