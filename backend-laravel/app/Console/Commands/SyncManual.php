<?php

namespace App\Console\Commands;

use App\Models\StoreLocalNode;
use App\Services\Platform\ManualSync;
use Illuminate\Console\Command;

/** Sync now / Re-copy from cloud, started from the on-prem page and run here, outside the web request. */
class SyncManual extends Command
{
    protected $signature = 'sync:manual {kind : sync or recopy}';

    protected $description = 'Run Sync now or Re-copy from cloud for this on-prem server';

    public function handle(ManualSync $manual): int
    {
        $node = StoreLocalNode::where('enabled', true)->first();
        if (! $node) {
            $this->error('This server is not connected to the cloud yet.');

            return self::FAILURE;
        }
        $result = $manual->run($this->argument('kind') === 'recopy' ? 'recopy' : 'sync', $node);
        $this->line($result['message']);

        return $result['ok'] ? self::SUCCESS : self::FAILURE;
    }
}
