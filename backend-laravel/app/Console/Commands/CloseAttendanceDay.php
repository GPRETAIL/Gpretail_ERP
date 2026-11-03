<?php

namespace App\Console\Commands;

use App\Services\Hr\AttendanceService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/** Closes a day's attendance for every store: absent when nobody punched, unless leave, holiday or weekly off. */
class CloseAttendanceDay extends Command
{
    protected $signature = 'hr:close-attendance {date? : Y-m-d, default yesterday in the business timezone} {--store= : one store id}';

    protected $description = 'Close a day of attendance (mark absentees, holidays and weekly offs)';

    public function handle(AttendanceService $attendance): int
    {
        $date = $this->argument('date') ?: Carbon::now(AttendanceService::timezone())->subDay()->toDateString();
        $count = $attendance->closeDay($date, $this->option('store') ? (int) $this->option('store') : null);
        $this->info("Attendance closed for {$date}: {$count} employee(s).");

        return self::SUCCESS;
    }
}
