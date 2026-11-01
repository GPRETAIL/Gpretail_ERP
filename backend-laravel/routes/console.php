<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('platform:sync')->everyFiveMinutes()->withoutOverlapping();

Schedule::command('platform:notifications-sync')->everyMinute()->withoutOverlapping();

Schedule::command('security:purge-plaintext-snapshots --encrypt')->dailyAt('03:15')->withoutOverlapping();

// Drafts purchase orders for items at or below their reorder level; buyers review and approve.
Schedule::command('purchase-orders:generate')->dailyAt('02:30')->withoutOverlapping();

// Catches up any bill or payment whose voucher could not be posted when it was saved.
Schedule::command('accounting:post')->dailyAt('02:45')->withoutOverlapping();

// Lets /api/health report whether the server cron (schedule:run every minute) is running.
Schedule::call(fn () => Cache::put('ops:scheduler-heartbeat', now()->timestamp, 600))->everyMinute()->name('ops:heartbeat');
