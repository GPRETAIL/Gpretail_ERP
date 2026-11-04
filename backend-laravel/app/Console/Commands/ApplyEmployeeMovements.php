<?php

namespace App\Console\Commands;

use App\Services\Hr\MovementService;
use Illuminate\Console\Command;

/** Applies promotions, transfers and salary revisions whose effective date has come. */
class ApplyEmployeeMovements extends Command
{
    protected $signature = 'hr:apply-movements';

    protected $description = 'Apply scheduled employee promotions, transfers and salary revisions that are due';

    public function handle(MovementService $movements): int
    {
        $this->info($movements->applyDue().' change(s) applied.');

        return self::SUCCESS;
    }
}
