<?php

namespace App\Console\Commands;

use App\Services\Hr\SeparationService;
use Illuminate\Console\Command;

/** Relieves everyone whose last working day has passed: inactive, login switched off. */
class RelieveEmployees extends Command
{
    protected $signature = 'hr:relieve-employees';

    protected $description = 'Relieve employees whose last working day has passed (mark inactive, switch off their login)';

    public function handle(SeparationService $separations): int
    {
        $this->info($separations->relieveDue().' employee(s) relieved.');

        return self::SUCCESS;
    }
}
