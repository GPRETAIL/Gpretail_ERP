<?php

/**
 * Hostinger Instant Deployment Unzipper & Database Auto-Migrator
 */

$allowedTokens = [
    'NextErpDeploySecret2026',
    'GpretailDeploySecret2026',
    'HostingerDeployToken2026',
];

$passedToken = $_GET['token'] ?? $_POST['token'] ?? $_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? '';

if (empty($passedToken) || (!in_array($passedToken, $allowedTokens, true) && $passedToken !== (getenv('HOSTINGER_DEPLOY_TOKEN') ?: ''))) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json');

$zipFile = __DIR__ . '/deploy.zip';

if (!file_exists($zipFile)) {
    // A non-2xx status here is what lets the CI deploy step's retry loop
    // (curl -f) actually detect failure and retry - it only checks the
    // HTTP status code, not this JSON body, so returning 200 on failure
    // made the very first attempt look like a success and the retry loop
    // exit immediately, even though FTP hadn't finished writing deploy.zip.
    http_response_code(503);
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
    
    // Ensure write permissions for storage and cache. mkdir() only helps the first time a
    // directory doesn't exist yet -- a bootstrap/cache/*.php file left over from an earlier
    // deploy (e.g. routes-v7.php) keeps whatever permissions it already had, and a subsequent
    // route:cache call that can't overwrite it fails without necessarily throwing a PHP
    // exception (Artisan::call() returns a non-zero exit code for most command failures, it
    // doesn't throw), so the try/catch below alone never caught this -- explicitly chmod the
    // directory AND its existing contents on every deploy so a stale permission from any
    // earlier state can't silently pin production on an old compiled route/config cache.
    @mkdir(__DIR__ . '/storage/framework/cache/data', 0777, true);
    @mkdir(__DIR__ . '/storage/framework/sessions', 0777, true);
    @mkdir(__DIR__ . '/storage/framework/views', 0777, true);
    @mkdir(__DIR__ . '/storage/logs', 0777, true);
    @mkdir(__DIR__ . '/bootstrap/cache', 0777, true);
    @chmod(__DIR__ . '/bootstrap/cache', 0777);
    foreach (glob(__DIR__ . '/bootstrap/cache/*.php') ?: [] as $cacheFile) {
        @chmod($cacheFile, 0666);
    }

    // Delete default placeholder if present
    if (file_exists(__DIR__ . '/default.php')) {
        @unlink(__DIR__ . '/default.php');
    }

    $migrationOutput = '';
    $cacheOutput = '';
    // Bootstrap Laravel, then clear+rebuild caches BEFORE migrate. These used to
    // run after migrate in the same try block, so a bad DB credential (this
    // deploy's, or one baked into a stale bootstrap/cache/config.php from a much
    // earlier deploy) made migrate throw, which aborted the block before
    // config:clear/config:cache ever ran -- leaving the OLD cached config in
    // place forever, since a stale bad password makes every future migrate fail
    // the exact same way before it ever gets a chance to clear itself. Clearing
    // and rebuilding first, unconditionally, means this deploy's real .env is
    // what's actually in effect regardless of whether migrate itself succeeds.
    //
    // Each command's own exit code + output is captured (not just "did an exception get
    // thrown") because a stale/unwritable bootstrap/cache/routes-v7.php from an earlier deploy
    // made route:cache silently fail to update -- Artisan::call() doesn't throw for that, it
    // just returns non-zero, so a blanket "Caches cleared and rebuilt." message regardless of
    // each command's real result had been masking exactly this failure.
    try {
        $baseDir = file_exists(__DIR__ . '/vendor/autoload.php') ? __DIR__ : dirname(__DIR__);
        require_once $baseDir . '/vendor/autoload.php';
        $app = require_once $baseDir . '/bootstrap/app.php';
        $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();

        $cacheSteps = [];
        foreach (['config:clear', 'route:clear', 'cache:clear', 'config:cache', 'route:cache', 'view:cache'] as $cmd) {
            $exitCode = \Illuminate\Support\Facades\Artisan::call($cmd);
            $out = trim(\Illuminate\Support\Facades\Artisan::output());
            $cacheSteps[] = "{$cmd} => exit {$exitCode}" . ($out !== '' ? " ({$out})" : '');
        }
        $cacheOutput = "Cache steps:\n" . implode("\n", $cacheSteps);
    } catch (\Throwable $e) {
        $cacheOutput = 'Cache note: ' . $e->getMessage();
    }

    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $migrationOutput = \Illuminate\Support\Facades\Artisan::output();
    } catch (\Throwable $e) {
        $migrationOutput = 'Migration note: ' . $e->getMessage();
    }
    $migrationOutput = $cacheOutput . "\n" . $migrationOutput;

    echo json_encode([
        'status'     => 'success',
        'message'    => 'Deployment package extracted, storage initialized, and migrations executed!',
        'migrations' => $migrationOutput,
    ]);
} else {
    // Same reasoning as the file_exists() check above: a truncated/still-
    // being-written zip fails ZipArchive::open() with a corruption code -
    // this must not look like an HTTP success or the CI retry loop stops
    // here instead of retrying once the FTP upload actually finishes.
    http_response_code(503);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Failed to open deploy.zip, error code: ' . $res,
    ]);
}
