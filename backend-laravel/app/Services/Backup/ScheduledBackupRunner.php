<?php

namespace App\Services\Backup;

use App\Models\Backup;
use App\Models\Store;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Throwable;

/**
 * Backup Center > Storage & Schedule: runs each store's scheduled backup when it is due, then
 * applies its retention. Called every 15 minutes by the server scheduler (backups:run-scheduled,
 * the same schedule:run cron or Task Scheduler entry the rest of the ERP needs) and by the older
 * token-protected URL. A lock keeps the two from running at the same time.
 */
class ScheduledBackupRunner
{
    public function __construct(private readonly BackupService $backups) {}

    /** @return array{checked: int, results: array<int, array<string, mixed>>, skipped?: string} */
    public function run(?int $storeId = null): array
    {
        $lock = Cache::lock('backups:scheduled-run', 3600);
        if (! $lock->get()) {
            return ['checked' => 0, 'results' => [], 'skipped' => 'Another scheduled backup run is in progress.'];
        }
        try {
            return $this->runDue($storeId);
        } finally {
            $lock->release();
        }
    }

    private function runDue(?int $storeId): array
    {
        $stores = Store::withoutGlobalScopes()->whereNotNull('backup_settings')
            ->when($storeId, fn ($q) => $q->where('id', $storeId))
            ->get();

        $results = [];

        foreach ($stores as $store) {
            $settings = $store->backup_settings ?? [];
            if (empty($settings['schedule_enabled'])) {
                $results[] = ['company_id' => $store->id, 'ran' => false, 'reason' => 'scheduling disabled'];

                continue;
            }

            $nextAt = ! empty($settings['next_scheduled_at']) ? Carbon::parse($settings['next_scheduled_at']) : null;
            if ($nextAt && $nextAt->isFuture()) {
                $results[] = ['company_id' => $store->id, 'ran' => false, 'reason' => 'not due yet', 'next_scheduled_at' => $nextAt->toIso8601String()];

                continue;
            }

            $backupType = $settings['schedule_backup_type'] ?? 'full';
            $moduleNames = $backupType === 'module' ? ($settings['schedule_module_names'] ?? []) : $this->backups->moduleOptions();

            $startedAt = now();
            $status = 'success';
            $tableCounts = [];
            $fileName = null;
            $filePath = null;
            $fileSize = 0;

            // If the operator saved a scheduled-backup password (Storage & Schedule
            // settings), decrypt it and include sensitive tables (Users) encrypted.
            // Otherwise fall back to the safe default: strip them, run unencrypted.
            $scheduledPassword = null;
            if (! empty($settings['encryption_password_encrypted'])) {
                try {
                    $scheduledPassword = Crypt::decryptString($settings['encryption_password_encrypted']);
                } catch (Throwable) {
                    // APP_KEY rotated or the stored value is corrupt - fall back safely
                    // rather than failing the whole scheduled run for this store.
                    $scheduledPassword = null;
                }
            }
            $encryptScheduled = $scheduledPassword !== null && $scheduledPassword !== '';

            // Resolve the real storage mode from the two "Enable ... for scheduled
            // backups" checkboxes, instead of the previous hardcoded 'local'. Cloud
            // is only actually used if OCI credentials are genuinely configured for
            // this store - otherwise it silently falls back to local rather than
            // failing the whole scheduled run.
            $wantsLocal = $settings['local_storage_enabled'] ?? true;
            $wantsCloud = ! empty($settings['cloud_storage_enabled']) && BackupService::isCloudConfigured($settings);
            if ($wantsCloud && $wantsLocal) {
                $storageMode = 'hybrid';
            } elseif ($wantsCloud) {
                $storageMode = 'cloud';
            } else {
                $storageMode = 'local';
            }

            $statusMessage = $encryptScheduled
                ? 'Scheduled run (encrypted with the saved schedule password).'
                : 'Scheduled run (unencrypted, no password saved - the Users table was skipped; save a password in Storage & Schedule settings to include it).';

            $cloudPath = null;
            try {
                $since = null;
                if ($backupType === 'incremental') {
                    $lastBackup = $this->backups->findLatestSuccessfulBackup($store->id);
                    if ($lastBackup && $lastBackup->completed_at) {
                        $since = Carbon::parse($lastBackup->completed_at);
                    }
                }
                $manifest = $this->backups->buildTableManifestForModules($moduleNames);
                if (! $encryptScheduled) {
                    // No password on file - sensitive tables (users - password hashes)
                    // are skipped here. Still covered by manual, encrypted backups.
                    $manifest = $this->backups->stripSensitiveTables($manifest);
                }
                $exported = $this->backups->exportTablesToJson($manifest, $store->id, $since);
                foreach ($exported as $table => $rows) {
                    $tableCounts[$table] = count($rows);
                }
                $baseName = 'backup_scheduled_'.$store->id.'_'.now()->format('Ymd_His').'_'.uniqid();
                $zipPath = $this->backups->writeBackupArchive($exported, $manifest, $baseName);
                if ($encryptScheduled) {
                    $zipPath = $this->backups->encryptArchive($zipPath, $scheduledPassword);
                }
                $fileSize = filesize($zipPath) ?: 0;
                $fileName = basename($zipPath);
                $filePath = 'backups/'.$fileName;

                if (in_array($storageMode, ['cloud', 'hybrid'], true)) {
                    $cloudPath = $this->backups->uploadToCloud($zipPath, $settings);
                    if ($storageMode === 'cloud') {
                        @unlink($zipPath);
                        $filePath = null;
                    }
                }
            } catch (Throwable $e) {
                $status = 'failed';
                $statusMessage = $e->getMessage();
            }

            $backup = Backup::create([
                'file_name' => $fileName ?? ('backup_failed_'.now()->format('Ymd_His')),
                'backup_type' => $backupType,
                'storage_mode' => $storageMode,
                'module_names' => $moduleNames,
                'company_id' => $store->id,
                'file_path' => $filePath,
                'cloud_path' => $cloudPath,
                'file_size' => $fileSize,
                'file_size_label' => $this->backups->formatBytes($fileSize),
                'status' => $status,
                'encryption_enabled' => $encryptScheduled,
                'summary' => ['status_message' => $statusMessage, 'tables' => $tableCounts, 'progress_percent' => 100, 'triggered_by' => 'scheduled'],
                'started_at' => $startedAt,
                'completed_at' => now(),
            ]);

            $settings['last_scheduled_at'] = now()->toIso8601String();
            $settings['next_scheduled_at'] = $this->backups->computeNextScheduledAt($settings)->toIso8601String();
            $store->update(['backup_settings' => $settings]);

            $this->applyRetention($store, $settings);

            $results[] = ['company_id' => $store->id, 'ran' => true, 'backup_id' => $backup->id, 'status' => $status];
        }

        return ['checked' => $stores->count(), 'results' => $results];
    }

    private function applyRetention(Store $store, array $settings): void
    {
        if (empty($settings['auto_cleanup_enabled'])) {
            return;
        }

        $frequency = $settings['schedule_frequency'] ?? 'daily';
        $keep = (int) ($settings["retention_{$frequency}"] ?? 7);

        // `triggered_by` is stored as a plain JSON string value inside the summary column,
        // NOT as an array — so whereJsonContains (which checks array membership) will never
        // match. `whereJsonPath` also isn't a real query-builder method (it silently gets
        // treated as a literal column named "json_path", which errors with "column not
        // found" the moment this ever actually runs). Laravel's real syntax for comparing
        // a JSON path to a scalar is the `column->path` dot-arrow syntax in a plain where().
        $scheduled = Backup::where('company_id', $store->id)
            ->where('status', 'success')
            ->where('summary->triggered_by', 'scheduled')
            ->orderByDesc('completed_at')
            ->get();

        foreach ($scheduled->slice($keep) as $old) {
            if ($old->file_path) {
                $path = storage_path('app/private/'.$old->file_path);
                if (file_exists($path)) {
                    @unlink($path);
                }
            }
            // Cloud/hybrid scheduled backups also have a cloud_path - without this,
            // retention only ever cleaned the local copy, leaving cloud-only and
            // hybrid backups orphaned in the OCI bucket forever once past retention
            // (silently consuming the Always Free storage allowance over time).
            if ($old->cloud_path && in_array($old->storage_mode, ['cloud', 'hybrid'], true)) {
                try {
                    if (BackupService::isCloudConfigured($settings)) {
                        $this->backups->deleteFromCloud($old->cloud_path, $settings);
                    }
                } catch (Throwable) {
                    // Non-fatal: the DB row is still cleaned up even if OCI removal fails
                }
            }
            $old->delete();
        }
    }
}
