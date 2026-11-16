<?php

namespace App\Services\Platform;

use App\Models\StoreLocalNode;
use Illuminate\Support\Facades\Cache;

/**
 * Sync now and Re-copy from cloud, run by an administrator on the on-prem page.
 *
 * They run in their own background process (`sync:manual`), not inside the web request: waiting on a slow cloud
 * held the request for up to minutes, which blocked the server's health checks (counters then moved to the cloud,
 * "on-prem server down") and ran into the 30-second proxy limit. The page follows SyncProgress and shows the
 * result stored here. Tests (SYNC_MANUAL_INLINE) run it in the request instead.
 */
class ManualSync
{
    public const RESULT = 'sync:manual-result';

    /** @return array{ok: bool, message: string} */
    public function run(string $kind, StoreLocalNode $node): array
    {
        try {
            if ($kind === 'recopy') {
                @set_time_limit(900);
                $copied = app(LocalNodeRegistration::class)->recopy($node);
                $result = ['ok' => true, 'message' => "Copied from the cloud: {$copied['rows']} record(s), ".($copied['users'] ?? 0).' staff account(s).'];
            } else {
                $cycle = app(SyncCycleService::class)->run(now: true);
                $result = ($cycle['ran'] ?? false) ? ['ok' => ! $cycle['pushed']['failed'] && ! $cycle['pulled']['failed'] && ! $cycle['pushed']['stopped_early'],
                    'message' => "Sent {$cycle['pushed']['sent']} and received {$cycle['pulled']['applied']} change(s)."
                        .($cycle['pushed']['stopped_early'] ? ' The cloud did not answer; waiting changes stay queued.' : '')]
                    : ['ok' => false, 'message' => $cycle['reason'] ?? 'The sync did not run.', 'busy' => (bool) ($cycle['busy'] ?? false)];
            }
        } catch (\Throwable $e) {
            report($e);
            $result = ['ok' => false, 'message' => $e->getMessage() ?: 'The sync did not finish.'];
        } finally {
            SyncProgress::finish();
        }
        Cache::forever(self::RESULT, $result + ['kind' => $kind, 'at' => now()->toIso8601String()]);

        return $result;
    }

    /** Starts the background job; false when a sync is already running. */
    public function start(string $kind): bool
    {
        $lock = Cache::lock(SyncCycleService::LOCK, 5);
        if (! $lock->get()) {
            return false;
        }
        $lock->release();
        SyncProgress::start($kind === 'recopy' ? 'recopy' : 'sync', $kind === 'recopy' ? 'Copying store data from the cloud' : 'Syncing');
        $this->spawn(['sync:manual', $kind === 'recopy' ? 'recopy' : 'sync']);

        return true;
    }

    public static function lastResult(): ?array
    {
        return Cache::get(self::RESULT);
    }

    /** The PHP command line (under Apache, PHP_BINARY is the web server itself). */
    public static function phpBinary(): string
    {
        if ($configured = config('sync.php_binary')) {
            return $configured;
        }
        if (preg_match('/php(\.exe)?$/i', PHP_BINARY)) {
            return PHP_BINARY;
        }
        $ini = php_ini_loaded_file();

        return $ini ? dirname($ini).DIRECTORY_SEPARATOR.(PHP_OS_FAMILY === 'Windows' ? 'php.exe' : 'php') : 'php';
    }

    /** Runs `php artisan <args>` detached from this request (it keeps running after the response). */
    protected function spawn(array $args): void
    {
        $artisan = base_path('artisan');
        $quoted = implode(' ', array_map('escapeshellarg', $args));
        if (PHP_OS_FAMILY === 'Windows') {
            pclose(popen('start "" /B "'.self::phpBinary().'" "'.$artisan.'" '.$quoted.' > NUL 2>&1', 'r'));
        } else {
            exec(escapeshellarg(self::phpBinary()).' '.escapeshellarg($artisan).' '.$quoted.' > /dev/null 2>&1 &');
        }
    }
}
