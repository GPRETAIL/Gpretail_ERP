<?php

namespace App\Console\Commands;

use App\Models\PlatformActivation;
use App\Services\PlatformNotificationSync;
use App\Services\PlatformPushClient;
use Illuminate\Console\Command;

class SyncPlatformNotifications extends Command
{
    protected $signature = 'platform:notifications-sync';

    protected $description = 'Import company notifications from Vynerix Admin using an independent cursor';

    public function handle(PlatformNotificationSync $sync): int
    {
        if (! PlatformActivation::current()?->activated) {
            $this->info('Deployment is not activated; notification sync skipped.');

            return self::SUCCESS;
        } $result = $sync->sync();
        app(PlatformPushClient::class)->syncContacts();
        if (! $result['ok']) {
            $this->warn($result['message']);

            return self::FAILURE;
        } $this->info('Imported '.$result['imported'].' notification events.');

        return self::SUCCESS;
    }
}
