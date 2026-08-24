<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Backup;
use App\Models\BackupRestore;
use App\Models\Store;
use App\Services\BackupService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Throwable;

class BackupController extends Controller
{
    public function __construct(private BackupService $backups) {}

    public function overview(Request $request)
    {
        $companyId = $request->input('companyId') ?: null;

        $companies = Store::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        $setting = $companyId ? (Store::find($companyId)?->backup_settings ?? []) : [];
        // Expose whether OCI cloud storage is configured so the frontend can enable/disable options
        $cloudConfigured = BackupService::isCloudConfigured($setting);
        $setting['cloud_configured'] = $cloudConfigured;

        $backupsQuery = Backup::query()->orderByDesc('created_at');
        $restoresQuery = BackupRestore::query()->orderByDesc('created_at');
        if ($companyId) {
            $backupsQuery->where('company_id', $companyId);
            $restoresQuery->where('target_company_id', $companyId);
        }
        // Limit to 100 rows to avoid heavy payloads; clients may filter client-side
        $backups = $backupsQuery->limit(100)->get();
        $restores = $restoresQuery->limit(100)->get();

        $localBytes = (int) $backups->where('storage_mode', 'local')->sum('file_size')
                     + (int) $backups->where('storage_mode', 'hybrid')->sum('file_size');
        $cloudBytes = $cloudConfigured ? $this->backups->cloudStorageUsedBytes($setting) : 0;
        $totalBytes = $localBytes + $cloudBytes;

        $lastBackup = $backups->first();

        $stats = [
            'last_backup_status'    => $lastBackup?->status ?? 'never',
            'last_backup_at'        => $lastBackup?->completed_at,
            'next_scheduled_backup' => $setting['next_scheduled_at'] ?? null,
            'storage_usage'         => [
                'total_label' => $this->backups->formatBytes($totalBytes),
                'local_label' => $this->backups->formatBytes($localBytes),
                'cloud_label' => $this->backups->formatBytes($cloudBytes),
            ],
            'total_backups'  => $backups->count(),
            'success_count'  => $backups->where('status', 'success')->count(),
            'failed_count'   => $backups->where('status', 'failed')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'companies'     => $companies,
                'moduleOptions' => $this->backups->moduleOptions(),
                'setting'       => $setting,
                'stats'         => $stats,
                'backups'       => $backups,
                'restores'      => $restores,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'backupType' => 'required|in:full,incremental,module',
            'storageMode' => 'nullable|in:local,cloud,hybrid',
            'moduleNames' => 'nullable|array',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        $companyId   = $request->input('companyId') ?: null;
        $storageMode = $request->input('storageMode', 'local');

        // Resolve store settings (needed for cloud credentials)
        $storeSettings = $companyId ? (Store::find($companyId)?->backup_settings ?? []) : [];

        // Validate cloud mode is configured before accepting the request
        if (in_array($storageMode, ['cloud', 'hybrid']) && ! BackupService::isCloudConfigured($storeSettings)) {
            return response()->json([
                'success' => false,
                'message' => 'OCI Object Storage is not configured for this store. Save OCI credentials in Settings first.',
            ], 422);
        }

        $backupType  = $request->input('backupType');
        $moduleNames = $backupType === 'module'
            ? ($request->input('moduleNames') ?: [])
            : ['sales', 'warehouse', 'masters', 'store', 'crm', 'finance', 'settings', 'dashboard', 'analytical'];

        $startedAt      = now();
        $status         = 'success';
        $statusMessage  = null;
        $filePath       = null;
        $cloudPath      = null;
        $fileSize       = 0;
        $fileName       = null;
        $tableCounts    = [];

        try {
            $since = null;
            if ($backupType === 'incremental') {
                $lastBackup = $this->backups->findLatestSuccessfulBackup($companyId);
                if ($lastBackup && $lastBackup->completed_at) {
                    $since = Carbon::parse($lastBackup->completed_at);
                } else {
                    $statusMessage = 'No prior backup found for this scope - ran as a full backup instead.';
                }
            }

            $manifest = $this->backups->buildTableManifestForModules($moduleNames);
            $exported = $this->backups->exportTablesToJson($manifest, $companyId, $since);
            foreach ($exported as $table => $rows) {
                $tableCounts[$table] = count($rows);
            }

            $baseName = 'backup_'.$backupType.'_'.($companyId ?: 'all').'_'.now()->format('Ymd_His').'_'.uniqid();
            $zipPath  = $this->backups->writeBackupArchive($exported, $manifest, $baseName);

            $encryptionEnabled = $request->boolean('encryptionEnabled');
            if ($encryptionEnabled) {
                $password = $request->input('encryptionPassword');
                if (! $password) {
                    throw new \RuntimeException('An encryption password is required when encryption is enabled.');
                }
                $zipPath = $this->backups->encryptArchive($zipPath, $password);
            }

            $fileSize = filesize($zipPath) ?: 0;
            $fileName = basename($zipPath);
            $filePath = 'backups/'.$fileName;

            // Upload to OCI Object Storage for cloud / hybrid modes
            if (in_array($storageMode, ['cloud', 'hybrid'])) {
                $cloudPath = $this->backups->uploadToCloud($zipPath, $storeSettings);
                // In cloud-only mode, remove the local copy to save disk space
                if ($storageMode === 'cloud') {
                    @unlink($zipPath);
                    $filePath = null;  // no local path
                }
            }
        } catch (Throwable $e) {
            $status        = 'failed';
            $statusMessage = $e->getMessage();
        }

        $backup = Backup::create([
            'file_name'          => $fileName ?? ('backup_failed_'.now()->format('Ymd_His')),
            'backup_type'        => $backupType,
            'storage_mode'       => $storageMode,
            'module_names'       => $moduleNames,
            'company_id'         => $companyId,
            'file_path'          => $filePath,
            'cloud_path'         => $cloudPath,
            'file_size'          => $fileSize,
            'file_size_label'    => $this->backups->formatBytes($fileSize),
            'status'             => $status,
            'encryption_enabled' => $request->boolean('encryptionEnabled'),
            'summary'            => ['status_message' => $statusMessage, 'tables' => $tableCounts, 'progress_percent' => 100],
            'started_at'         => $startedAt,
            'completed_at'       => now(),
        ]);

        return response()->json(['success' => true, 'message' => $status === 'success' ? 'Backup created' : 'Backup failed', 'data' => $backup], 201);
    }

    public function settings(Request $request)
    {
        $companyId = $request->input('companyId') ?? $request->input('company_id');

        if ($request->isMethod('post') || $request->isMethod('put')) {
            $settings = [
                'storage_mode'           => $request->input('storageMode', 'local'),
                'local_storage_enabled'  => true,
                'cloud_storage_enabled'  => $request->boolean('cloudStorageEnabled'),
                'encryption_enabled'     => $request->boolean('encryptionEnabled'),
                'restore_password_hint'  => $request->input('restorePasswordHint', ''),
                'schedule_enabled'       => $request->boolean('scheduleEnabled'),
                'schedule_frequency'     => $request->input('scheduleFrequency', 'daily'),
                'schedule_time'          => $request->input('scheduleTime', '02:00'),
                'schedule_day_of_week'   => (int) $request->input('scheduleDayOfWeek', 1),
                'schedule_day_of_month'  => (int) $request->input('scheduleDayOfMonth', 1),
                'schedule_backup_type'   => $request->input('scheduleBackupType', 'full'),
                'schedule_module_names'  => $request->input('scheduleModuleNames', []),
                'retention_daily'        => (int) $request->input('retentionDaily', 7),
                'retention_weekly'       => (int) $request->input('retentionWeekly', 4),
                'retention_monthly'      => (int) $request->input('retentionMonthly', 12),
                'auto_cleanup_enabled'   => $request->boolean('autoCleanupEnabled', true),
                // Oracle Cloud Infrastructure (OCI) Object Storage credentials
                'oci_namespace'          => $request->input('ociNamespace', ''),
                'oci_region'             => $request->input('ociRegion', 'ap-mumbai-1'),
                'oci_access_key_id'      => $request->input('ociAccessKeyId', ''),
                'oci_secret_access_key'  => $request->input('ociSecretAccessKey', ''),
                'oci_bucket'             => $request->input('ociBucket', ''),
            ];

            if ($settings['schedule_enabled']) {
                $settings['next_scheduled_at'] = $this->backups->computeNextScheduledAt($settings)->toIso8601String();
            } else {
                $settings['next_scheduled_at'] = null;
            }

            if ($companyId) {
                $store = Store::find($companyId);
                if (! $store) {
                    return response()->json(['success' => false, 'message' => 'Store not found'], 404);
                }
                $existing = $store->backup_settings ?? [];
                // Preserve existing OCI secret if the field was submitted blank (masked)
                if (empty($settings['oci_secret_access_key']) && ! empty($existing['oci_secret_access_key'])) {
                    $settings['oci_secret_access_key'] = $existing['oci_secret_access_key'];
                }
                $settings['last_scheduled_at'] = $existing['last_scheduled_at'] ?? null;
                $store->update(['backup_settings' => $settings]);
            } else {
                // Super Admin: apply as global default across all active stores
                $stores = Store::where('is_active', true)->get();
                foreach ($stores as $store) {
                    $existing      = $store->backup_settings ?? [];
                    $storeSettings = array_merge($settings, [
                        'last_scheduled_at'      => $existing['last_scheduled_at'] ?? null,
                        // Preserve per-store OCI secrets
                        'oci_secret_access_key'  => $settings['oci_secret_access_key'] ?: ($existing['oci_secret_access_key'] ?? ''),
                    ]);
                    $store->update(['backup_settings' => $storeSettings]);
                }
            }

            return response()->json(['success' => true, 'message' => 'Backup settings saved']);
        }

        $store   = $companyId ? Store::find($companyId) : null;
        $setting = $store?->backup_settings ?? [];

        // Mask the OCI secret before sending to the frontend — never expose the raw key
        if (! empty($setting['oci_secret_access_key'])) {
            $setting['oci_secret_access_key'] = str_repeat('*', 20);
        }
        $setting['cloud_configured'] = BackupService::isCloudConfigured($store?->backup_settings ?? []);

        return response()->json([
            'success' => true,
            'data'    => $setting,
        ]);
    }

    public function cloudTest(Request $request)
    {
        $companyId = $request->input('companyId') ?: null;
        $store = $companyId ? Store::find($companyId) : null;
        $stored = $store?->backup_settings ?? [];

        // Merge submitted credentials with stored ones (secret may be masked)
        $submittedSecret = $request->input('ociSecretAccessKey');
        $creds = [
            'oci_namespace'         => $request->input('ociNamespace')       ?: ($stored['oci_namespace'] ?? ''),
            'oci_region'            => $request->input('ociRegion')          ?: ($stored['oci_region'] ?? 'ap-mumbai-1'),
            'oci_access_key_id'     => $request->input('ociAccessKeyId')     ?: ($stored['oci_access_key_id'] ?? ''),
            'oci_secret_access_key' => ($submittedSecret && $submittedSecret !== str_repeat('*', 20)) ? $submittedSecret : ($stored['oci_secret_access_key'] ?? ''),
            'oci_bucket'            => $request->input('ociBucket')          ?: ($stored['oci_bucket'] ?? ''),
        ];

        $result = $this->backups->testCloudConnection($creds);

        return response()->json([
            'success' => $result['ok'],
            'message' => $result['message'],
        ], $result['ok'] ? 200 : 422);
    }

    public function restore(Request $request, $id)
    {
        $backup = Backup::find($id);
        if (! $backup) {
            return response()->json(['success' => false, 'message' => 'Backup not found'], 404);
        }

        $restoreType = $request->input('restoreType', 'partial');
        $targetCompanyId = $request->input('targetCompanyId') ?: null;
        $moduleNames = $restoreType === 'partial' ? ($request->input('moduleNames') ?: []) : [];

        $startedAt = now();
        $status = 'success';
        $statusMessage = null;
        $restoredRows = 0;
        $tableCounts = [];

        $decryptedTempPath = null;
        try {
            $zipPath = storage_path('app/private/'.$backup->file_path);
            if (! file_exists($zipPath)) {
                throw new \RuntimeException('Backup file no longer exists on disk.');
            }

            if ($backup->encryption_enabled) {
                $password = $request->input('password');
                if (! $password) {
                    throw new \RuntimeException('This backup is encrypted - a password is required to restore it.');
                }
                $zipPath = $decryptedTempPath = $this->backups->decryptArchive($zipPath, $password);
            }

            $tableFilter = null;
            if ($restoreType === 'partial' && $moduleNames) {
                $manifest = $this->backups->buildTableManifestForModules($moduleNames);
                $tableFilter = array_keys($manifest);
            }

            $result = $this->backups->restoreTablesFromArchive(
                $zipPath,
                $tableFilter,
                $targetCompanyId,
                $backup->company_id
            );
            $restoredRows = $result['restoredRows'];
            $tableCounts = $result['tables'];
        } catch (Throwable $e) {
            $status = 'failed';
            $statusMessage = $e->getMessage();
        } finally {
            if ($decryptedTempPath && file_exists($decryptedTempPath)) {
                @unlink($decryptedTempPath);
            }
        }

        $restore = BackupRestore::create([
            'backup_id' => $backup->id,
            'restore_type' => $restoreType,
            'module_names' => $moduleNames,
            'target_company_id' => $targetCompanyId,
            'status' => $status,
            'summary' => [
                'restoredRows' => $restoredRows,
                'progress_percent' => 100,
                'status_message' => $statusMessage,
                'tables' => $tableCounts,
            ],
            'started_at' => $startedAt,
            'completed_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => $status === 'success' ? 'Restore completed' : 'Restore failed', 'data' => $restore], 201);
    }

    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'backupFile' => 'required|file',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        $companyId = $request->input('companyId') ?: null;
        $password = $request->input('password');
        $uploaded = $request->file('backupFile');

        $fileName = 'imported_'.now()->format('Ymd_His').'_'.uniqid().'.'.($uploaded->getClientOriginalExtension() ?: 'zip');
        $dir = storage_path('app/private/backups');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $uploaded->move($dir, $fileName);
        $savedPath = $dir.DIRECTORY_SEPARATOR.$fileName;

        $backup = Backup::create([
            'file_name' => $fileName,
            'backup_type' => 'full',
            'storage_mode' => 'local',
            'module_names' => [],
            'company_id' => $companyId,
            'file_path' => 'backups/'.$fileName,
            'file_size' => filesize($savedPath) ?: 0,
            'file_size_label' => $this->backups->formatBytes(filesize($savedPath) ?: 0),
            'status' => 'success',
            'encryption_enabled' => (bool) $password,
            'summary' => ['status_message' => 'Imported backup file saved.'],
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        $status = 'success';
        $statusMessage = null;
        $restoredRows = 0;
        $tableCounts = [];

        $decryptedTempPath = null;
        try {
            $zipPath = $savedPath;
            if ($password) {
                $zipPath = $decryptedTempPath = $this->backups->decryptArchive($zipPath, $password);
            }
            $result = $this->backups->restoreTablesFromArchive($zipPath, null, $companyId, $companyId);
            $restoredRows = $result['restoredRows'];
            $tableCounts = $result['tables'];
        } catch (Throwable $e) {
            $status = 'failed';
            $statusMessage = $e->getMessage();
        } finally {
            if ($decryptedTempPath && file_exists($decryptedTempPath)) {
                @unlink($decryptedTempPath);
            }
        }

        $restore = BackupRestore::create([
            'backup_id' => $backup->id,
            'restore_type' => 'full',
            'module_names' => [],
            'target_company_id' => $companyId,
            'status' => $status,
            'summary' => [
                'restoredRows' => $restoredRows,
                'progress_percent' => 100,
                'status_message' => $statusMessage,
                'tables' => $tableCounts,
            ],
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Backup imported', 'data' => $restore], 201);
    }

    public function download($id)
    {
        $backup = Backup::find($id);
        if (! $backup) {
            return response()->json(['success' => false, 'message' => 'Backup not found'], 404);
        }

        $tmpCloudPath = null;

        try {
            // Cloud-only backup: fetch from OCI to a temp file, then stream
            if ($backup->storage_mode === 'cloud' && $backup->cloud_path) {
                $storeSettings = $backup->company_id
                    ? (Store::find($backup->company_id)?->backup_settings ?? [])
                    : [];
                $tmpCloudPath = $this->backups->downloadFromCloud($backup->cloud_path, $storeSettings);
                return response()->download($tmpCloudPath, $backup->file_name, [
                    'Content-Type'        => 'application/octet-stream',
                    'Content-Disposition' => 'attachment; filename="'.$backup->file_name.'"',
                ])->deleteFileAfterSend(true);
            }

            // Hybrid backup: try local first, fall back to OCI
            if ($backup->storage_mode === 'hybrid') {
                $localPath = $backup->file_path ? storage_path('app/private/'.$backup->file_path) : null;
                if ($localPath && file_exists($localPath)) {
                    return response()->download($localPath, $backup->file_name, [
                        'Content-Type'        => 'application/octet-stream',
                        'Content-Disposition' => 'attachment; filename="'.$backup->file_name.'"',
                    ]);
                }
                if ($backup->cloud_path) {
                    $storeSettings = $backup->company_id
                        ? (Store::find($backup->company_id)?->backup_settings ?? [])
                        : [];
                    $tmpCloudPath = $this->backups->downloadFromCloud($backup->cloud_path, $storeSettings);
                    return response()->download($tmpCloudPath, $backup->file_name, [
                        'Content-Type'        => 'application/octet-stream',
                        'Content-Disposition' => 'attachment; filename="'.$backup->file_name.'"',
                    ])->deleteFileAfterSend(true);
                }
                return response()->json(['success' => false, 'message' => 'Backup file not found locally or in cloud.'], 404);
            }

            // Local backup
            if (! $backup->file_path) {
                return response()->json(['success' => false, 'message' => 'Backup has no file path.'], 404);
            }
            $path = storage_path('app/private/'.$backup->file_path);
            if (! file_exists($path)) {
                return response()->json(['success' => false, 'message' => 'Backup file no longer exists on disk.'], 404);
            }
            return response()->download($path, $backup->file_name, [
                'Content-Type'        => 'application/octet-stream',
                'Content-Disposition' => 'attachment; filename="'.$backup->file_name.'"',
            ]);
        } catch (Throwable $e) {
            if ($tmpCloudPath && file_exists($tmpCloudPath)) {
                @unlink($tmpCloudPath);
            }
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function logs($id)
    {
        $backup = Backup::find($id);
        if (! $backup) {
            return response()->json(['success' => false, 'message' => 'Backup not found'], 404);
        }

        $lines = [];
        $lines[] = "Backup #{$backup->id} - {$backup->file_name}";
        $lines[] = "Type: {$backup->backup_type} | Storage: {$backup->storage_mode} | Status: {$backup->status}";
        $lines[] = 'Company: '.($backup->company_id ?: 'All stores');
        $lines[] = "Started: {$backup->started_at} | Completed: {$backup->completed_at}";
        $lines[] = "Size: {$backup->file_size_label}";
        $lines[] = 'Encrypted: '.($backup->encryption_enabled ? 'Yes' : 'No');
        $lines[] = '';
        $lines[] = 'Summary:';
        $lines[] = $backup->summary['status_message'] ?? '(no message)';
        $lines[] = '';
        $lines[] = 'Tables:';
        foreach (($backup->summary['tables'] ?? []) as $table => $count) {
            $lines[] = "  {$table}: {$count} rows";
        }

        $content = implode("\n", $lines);

        return response($content, 200, [
            'Content-Type' => 'text/plain',
            'Content-Disposition' => 'attachment; filename="backup-'.$backup->id.'-log.txt"',
        ]);
    }

    public function destroy($id)
    {
        $backup = Backup::find($id);
        if (! $backup) {
            return response()->json(['success' => false, 'message' => 'Backup not found'], 404);
        }

        // Delete local file
        if ($backup->file_path) {
            $path = storage_path('app/private/'.$backup->file_path);
            if (file_exists($path)) {
                @unlink($path);
            }
        }

        // Delete cloud file from OCI (fire-and-forget — don't block on failure)
        if ($backup->cloud_path && in_array($backup->storage_mode, ['cloud', 'hybrid'])) {
            try {
                $storeSettings = $backup->company_id
                    ? (Store::find($backup->company_id)?->backup_settings ?? [])
                    : [];
                if (BackupService::isCloudConfigured($storeSettings)) {
                    $this->backups->deleteFromCloud($backup->cloud_path, $storeSettings);
                }
            } catch (Throwable) {
                // Non-fatal: record is still deleted even if OCI removal fails
            }
        }

        $backup->delete();

        return response()->json(['success' => true, 'message' => 'Backup deleted']);
    }

    public function scheduledRun(Request $request)
    {
        $secret = config('backup.cron_secret');
        $token = $request->input('token') ?? $request->header('X-Backup-Cron-Token');

        if (! $secret || ! $token || ! hash_equals($secret, (string) $token)) {
            return response()->json(['success' => false, 'message' => 'Invalid or missing token'], 403);
        }

        $companyId = $request->input('companyId') ?: null;
        $stores = Store::whereNotNull('backup_settings')
            ->when($companyId, fn ($q) => $q->where('id', $companyId))
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
            $moduleNames = $backupType === 'module' ? ($settings['schedule_module_names'] ?? []) : ['sales', 'warehouse', 'masters', 'store', 'crm', 'finance', 'settings', 'dashboard', 'analytical'];

            $startedAt = now();
            $status = 'success';
            $statusMessage = 'Scheduled run (unencrypted - no operator present to supply a password).';
            $tableCounts = [];
            $fileName = null;
            $filePath = null;
            $fileSize = 0;

            try {
                $since = null;
                if ($backupType === 'incremental') {
                    $lastBackup = $this->backups->findLatestSuccessfulBackup($store->id);
                    if ($lastBackup && $lastBackup->completed_at) {
                        $since = Carbon::parse($lastBackup->completed_at);
                    }
                }
                $manifest = $this->backups->buildTableManifestForModules($moduleNames);
                $exported = $this->backups->exportTablesToJson($manifest, $store->id, $since);
                foreach ($exported as $table => $rows) {
                    $tableCounts[$table] = count($rows);
                }
                $baseName = 'backup_scheduled_'.$store->id.'_'.now()->format('Ymd_His').'_'.uniqid();
                $zipPath = $this->backups->writeBackupArchive($exported, $manifest, $baseName);
                $fileSize = filesize($zipPath) ?: 0;
                $fileName = basename($zipPath);
                $filePath = 'backups/'.$fileName;
            } catch (Throwable $e) {
                $status = 'failed';
                $statusMessage = $e->getMessage();
            }

            $backup = Backup::create([
                'file_name' => $fileName ?? ('backup_failed_'.now()->format('Ymd_His')),
                'backup_type' => $backupType,
                'storage_mode' => 'local',
                'module_names' => $moduleNames,
                'company_id' => $store->id,
                'file_path' => $filePath,
                'file_size' => $fileSize,
                'file_size_label' => $this->backups->formatBytes($fileSize),
                'status' => $status,
                'encryption_enabled' => false,
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

        return response()->json(['success' => true, 'data' => ['checked' => $stores->count(), 'results' => $results]]);
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
        // match. Use whereJsonPath to compare the scalar value directly.
        $scheduled = Backup::where('company_id', $store->id)
            ->where('status', 'success')
            ->whereJsonPath('summary.triggered_by', 'scheduled')
            ->orderByDesc('completed_at')
            ->get();

        foreach ($scheduled->slice($keep) as $old) {
            if ($old->file_path) {
                $path = storage_path('app/private/'.$old->file_path);
                if (file_exists($path)) {
                    @unlink($path);
                }
            }
            $old->delete();
        }
    }
}
