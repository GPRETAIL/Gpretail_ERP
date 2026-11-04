<?php

namespace App\Console\Commands;

use App\Services\Hr\TaxDeclarationService;
use Illuminate\Console\Command;

/** Closes tax declarations once the year's proof deadline has passed (only verified amounts count after it). */
class LockTaxDeclarations extends Command
{
    protected $signature = 'hr:lock-tax-declarations';

    protected $description = 'Close income tax declarations whose proof deadline has passed';

    public function handle(TaxDeclarationService $declarations): int
    {
        $this->info($declarations->lockDue().' declaration(s) closed.');

        return self::SUCCESS;
    }
}
