<?php

namespace App\Console\Commands;

use App\Models\PlatformActivation;
use App\Services\Platform\PlatformNotificationSync;
use App\Services\Platform\PlatformPushClient;
use Illuminate\Console\Command;

class SyncPlatformNotifications extends Command
{
    protected $signature = 'platform:notifications-sync';

    protected $description = 'Import company notifications from Vynerix Admin using an independent cursor';

    private const FAILING_SINCE = 'platform:notifications-sync:failing-since';

    private const ALERT_AFTER_MINUTES = 30;

    public function handle(PlatformNotificationSync $sync): int
    {
        if (! PlatformActivation::current()?->activated) {
            $this->info('Deployment is not activated; notification sync skipped.');

            return self::SUCCESS;
        } $result = $sync->sync();
        app(PlatformPushClient::class)->syncContacts();
        if (! $result['ok']) {
            $this->warn($result['message']);
            // Runs every minute: a few misses are retried by themselves. Fail (and so alert admins) only when GP
            // Admin has been unreachable for half an hour.
            $since = \Illuminate\Support\Facades\Cache::rememberForever(self::FAILING_SINCE, fn () => now()->timestamp);

            return now()->timestamp - $since >= self::ALERT_AFTER_MINUTES * 60 ? self::FAILURE : self::SUCCESS;
        }
        \Illuminate\Support\Facades\Cache::forget(self::FAILING_SINCE); $this->info('Imported '.$result['imported'].' notification events.');

        return self::SUCCESS;
    }
}
