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

// HRMS: closes yesterday's attendance (absent / holiday / weekly off), and credits the new year's leave on 1 January.
Schedule::command('hr:close-attendance')->dailyAt('00:20')->timezone(config('app.business_timezone'))->withoutOverlapping();
Schedule::command('hr:apply-movements')->dailyAt('00:10')->timezone(config('app.business_timezone'))->withoutOverlapping();
Schedule::command('hr:relieve-employees')->dailyAt('00:15')->timezone(config('app.business_timezone'))->withoutOverlapping();
Schedule::command('hr:lock-tax-declarations')->dailyAt('00:20')->timezone(config('app.business_timezone'))->withoutOverlapping();
Schedule::command('hr:allocate-leave')->yearlyOn(1, 1, '00:40')->timezone(config('app.business_timezone'))->withoutOverlapping();

// Backup Center > Storage & Schedule: each store's scheduled backup runs here when it is due (no separate trigger needed).
Artisan::command('backups:run-scheduled {--store= : Only this store id}', function () {
    $result = app(\App\Services\Backup\ScheduledBackupRunner::class)->run($this->option('store') ? (int) $this->option('store') : null);
    $ran = collect($result['results'])->where('ran', true);
    $this->info(($result['skipped'] ?? null) ?: "Checked {$result['checked']} store(s); ran {$ran->count()} backup(s).");
})->purpose('Run the Backup Center scheduled backups that are due');
Schedule::command('backups:run-scheduled')->everyFifteenMinutes()->withoutOverlapping(120);

// Lets /api/health report whether the server cron (schedule:run every minute) is running.
Schedule::call(fn () => Cache::put('ops:scheduler-heartbeat', now()->timestamp, 600))->everyMinute()->name('ops:heartbeat');

// New server errors and screen crashes in the logs alert the admins (bell, plus email when OPS_ALERT_EMAIL is set).
Schedule::command('ops:error-alerts')->everyTenMinutes()->withoutOverlapping();
