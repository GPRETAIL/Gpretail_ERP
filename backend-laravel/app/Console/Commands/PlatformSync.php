<?php

namespace App\Console\Commands;

use App\Services\PlatformActivationService;
use Illuminate\Console\Command;

/**
 * Pulls this deployment's configuration from the platform (Gpretail_Admin): status, active_till,
 * entitlement limits, feature flags, and a fresh signed licence. Meant to be triggered by the same
 * kind of external scheduler that drives sync:cycle (Windows Task Scheduler / cron), on an interval
 * a few times a day — this is licence/entitlement freshness, not the store's own data sync.
 */
class PlatformSync extends Command
{
    protected $signature = 'platform:sync';

    protected $description = 'Pull this deployment\'s status/limits/licence from the platform (Gpretail_Admin).';

    public function handle(PlatformActivationService $service): int
    {
        $result = $service->sync();

        if (!$result['ok']) {
            $this->warn($result['message'] ?? 'platform:sync did not run.');

            return self::SUCCESS;
        }

        $this->info('Platform sync applied.');

        return self::SUCCESS;
    }
}
