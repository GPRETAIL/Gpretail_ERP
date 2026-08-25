<?php

namespace App\Console\Commands;

use App\Services\SyncCycleService;
use Illuminate\Console\Command;

/**
 * Runs one local<->cloud sync cycle. Meant to be triggered by the local
 * machine's own OS task scheduler (Windows Task Scheduler / cron) every
 * 15-30s -- not by an external pinger, since a shop LAN box generally isn't
 * inbound-reachable the way the shared cloud install already is.
 */
class SyncCycle extends Command
{
    protected $signature = 'sync:cycle';

    protected $description = 'Push this local install\'s pending writes to cloud, pull+apply cloud\'s pending writes for this store, then heartbeat.';

    public function handle(SyncCycleService $service): int
    {
        $result = $service->run();

        if (! $result['ran']) {
            $this->warn($result['reason'] ?? 'Sync cycle did not run.');

            return self::SUCCESS;
        }

        $this->info(sprintf(
            'Pushed %d, failed %d%s. Pulled %d, failed %d. Heartbeat %s.',
            $result['pushed']['sent'],
            $result['pushed']['failed'],
            $result['pushed']['stopped_early'] ? ' (stopped early)' : '',
            $result['pulled']['applied'],
            $result['pulled']['failed'],
            $result['heartbeat_ok'] ? 'ok' : 'failed',
        ));

        return self::SUCCESS;
    }
}
