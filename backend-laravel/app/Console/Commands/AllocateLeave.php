<?php

namespace App\Console\Commands;

use App\Models\Store;
use App\Services\Hr\LeaveService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/** Credits a year's leave (policy days plus carry forward) for every store. Safe to run again. */
class AllocateLeave extends Command
{
    protected $signature = 'hr:allocate-leave {year? : default the current year in the business timezone}';

    protected $description = "Allocate the year's leave to every active employee";

    public function handle(LeaveService $leave): int
    {
        $year = (int) ($this->argument('year') ?: Carbon::now(config('app.business_timezone'))->year);
        $total = 0;
        foreach (Store::query()->where('is_active', true)->pluck('id') as $storeId) {
            $total += $leave->allocateYear($storeId, $year);
        }
        $this->info("{$total} leave credit(s) added for {$year}.");

        return self::SUCCESS;
    }
}
