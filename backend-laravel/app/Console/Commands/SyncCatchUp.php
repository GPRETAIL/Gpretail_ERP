<?php

namespace App\Console\Commands;

use App\Models\StoreLocalNode;
use App\Services\BackupService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Bulk catch-up resync for a local install that's been offline long enough
 * that per-event replay (sync_outbox, via sync:cycle) isn't practical --
 * reinstall, long outage, or its own outbox having been lost. Pulls a full or
 * incremental (since last_catch_up_at) snapshot of this store's data from
 * cloud and merges it in safely (never regresses a row this install has
 * updated more recently -- see BackupService::mergeTablesFromExport()).
 *
 * Deliberately a separate, manually/occasionally-triggered command rather
 * than folded into sync:cycle's every-15-30s loop -- this is a heavier
 * operation meant for recovery, not routine polling.
 */
class SyncCatchUp extends Command
{
    protected $signature = 'sync:catch-up {--full : Ignore last_catch_up_at and pull everything from scratch}';

    protected $description = 'Pull a full or incremental snapshot of this store\'s data from cloud and merge it in.';

    public function handle(BackupService $backupService): int
    {
        if (config('sync.node_role') !== 'local') {
            $this->warn('This install is not configured as a local node (SYNC_NODE_ROLE=local).');

            return self::SUCCESS;
        }

        $node = StoreLocalNode::where('enabled', true)->first();
        if (! $node) {
            $this->warn('No enabled local-server configuration found.');

            return self::SUCCESS;
        }

        $cloudApi = rtrim((string) config('sync.cloud_api_base_url'), '/');
        if (! $cloudApi) {
            $this->error('sync.cloud_api_base_url is not configured.');

            return self::FAILURE;
        }

        $since = $this->option('full') ? null : $node->last_catch_up_at;

        $this->info($since ? "Pulling changes since {$since->toIso8601String()}..." : 'Pulling a full snapshot...');

        $response = Http::withHeaders([
            'X-Tenant-Key' => $node->tenant_key,
            'X-Sync-Token' => $node->sync_token,
        ])->timeout(300)->get($cloudApi.'/sync/catch-up-export', array_filter([
            'since' => $since?->toIso8601String(),
        ]));

        if (! $response->successful()) {
            $this->error("Catch-up export request failed: HTTP {$response->status()}");

            return self::FAILURE;
        }

        $tables = $response->json('data.tables') ?? [];
        $result = $backupService->mergeTablesFromExport($tables);

        $node->last_catch_up_at = now();
        $node->save();

        $this->info("Merged {$result['mergedRows']} row(s) across ".count($result['tables']).' table(s).');

        return self::SUCCESS;
    }
}
