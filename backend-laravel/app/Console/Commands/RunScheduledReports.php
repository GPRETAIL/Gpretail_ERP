<?php

namespace App\Console\Commands;

use App\Services\Reports\Scheduled\ScheduledReportRunner;
use Illuminate\Console\Command;

/** Settings > Scheduler: emails the scheduled reports that are due (scheduled every 5 minutes). */
class RunScheduledReports extends Command
{
    protected $signature = 'reports:run-scheduled';

    protected $description = 'Email the scheduled reports that are due';

    public function handle(ScheduledReportRunner $runner): int
    {
        $sent = $runner->runDue();
        $this->info($sent ? "Ran $sent scheduled report(s)." : 'No scheduled reports due.');

        return self::SUCCESS;
    }
}
