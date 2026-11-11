<?php

namespace App\Http\Controllers\Api\V1\Settings;

use App\Http\Controllers\Controller;
use App\Models\Backup;
use App\Models\BackupRestore;
use App\Models\Store;
use App\Services\Backup\BackupService;
use App\Services\Backup\ScheduledBackupRunner;
use App\Services\Tenancy\StoreContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Validator;
use Throwable;

class BackupController extends Controller
{
    private const CLOUD_NEEDS_OCI = 'Cloud and Hybrid storage need all five Oracle Cloud (OCI) details: namespace, region, access key, secret key and bucket. Fill them in (use Test Connection to check), or choose Local Storage.';

    public function __construct(private BackupService $backups) {}

    private function presentSettings(array $settings): array
    {
        $settings['cloud_configured'] = BackupService::isCloudConfigured($settings);
        $settings['scheduled_encryption_configured'] = ! empty($settings['encryption_password_encrypted']);
        if (! empty($settings['oci_secret_access_key'])) {
            $settings['oci_secret_access_key'] = str_repeat('*', 20);
        }
        if ($settings['scheduled_encryption_configured']) {
            $settings['encryption_password'] = str_repeat('*', 20);
        }
        unset($settings['encryption_password_encrypted']);

        return $settings;
    }

    /** @return Builder<Store> */
    private function authorizedStores(Request $request): Builder
    {
        return app(StoreContext::class)->available($request->user());
    }

    private function authorizedStoreIds(Request $request): array
    {
        return array_values(array_map('intval', (array) $request->attributes->get('store_context_ids', [])));
    }

    private function findAuthorizedBackup(Request $request, $id): ?Backup
    {
        $storeIds = $this->authorizedStoreIds($request);
        if ($storeIds === []) {
            return null;
        }

        return Backup::whereIn('company_id', $storeIds)->find($id);
    }

    public function overview(Request $request)
    {
        $companyId = $this->resolveStoreId($request, null);
        $authorizedIds = $this->authorizedStoreIds($request);

        $companies = $this->authorizedStores($request)->where('is_active', true)->orderBy('name')->get(['id', 'name']);

        $setting = $companyId ? ($this->authorizedStores($request)->find($companyId)->backup_settings ?? []) : [];
        // Expose whether OCI cloud storage is configured so the frontend can enable/disable options
        $cloudConfigured = BackupService::isCloudConfigured($setting);
        $setting['cloud_configured'] = $cloudConfigured;

        $backupsQuery = Backup::query()->whereIn('company_id', $authorizedIds)->orderByDesc('created_at');
        $restoresQuery = BackupRestore::query()->orderByDesc('created_at');
        if ($companyId) {
            $backupsQuery->where('company_id', $companyId);
            // target_company_id is only set when restoring INTO a different store than
            // the backup's own - the default "Original store(s) from backup" option
            // leaves it null, so a plain `where('target_company_id', $companyId)` never
            // matched those rows at all (NULL never equals anything in SQL). Fall back to
            // the backup's own company_id whenever target_company_id wasn't overridden.
            $restoresQuery->where(function ($q) use ($companyId) {
                $q->where('target_company_id', $companyId)
                    ->orWhere(function ($q2) use ($companyId) {
                        $q2->whereNull('target_company_id')
                            ->whereHas('backup', fn ($b) => $b->where('company_id', $companyId));
                    });
            });
        } else {
            $restoresQuery->where(function ($q) use ($authorizedIds) {
                $q->whereIn('target_company_id', $authorizedIds)
                    ->orWhere(function ($q2) use ($authorizedIds) {
                        $q2->whereNull('target_company_id')
                            ->whereHas('backup', fn ($b) => $b->whereIn('company_id', $authorizedIds));
                    });
            });
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
            'last_backup_status' => $lastBackup->status ?? 'never',
            'last_backup_at' => $lastBackup?->completed_at,
            'next_scheduled_backup' => $setting['next_scheduled_at'] ?? null,
            'storage_usage' => [
                'total_label' => $this->backups->formatBytes($totalBytes),
                'local_label' => $this->backups->formatBytes($localBytes),
                'cloud_label' => $this->backups->formatBytes($cloudBytes),
            ],
            'total_backups' => $backups->count(),
            'success_count' => $backups->where('status', 'success')->count(),
            'failed_count' => $backups->where('status', 'failed')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'companies' => $companies,
                'moduleOptions' => $this->backups->moduleOptions(),
                'setting' => $this->presentSettings($setting),
                'stats' => $stats,
                'backups' => $backups,
                'restores' => $restores,
                // Lets the UI show real status instead of just static setup instructions -
                // whether the server side is ready for an external trigger to call it, and
                // whether one ever actually has.
                'cronSecretConfigured' => ! empty(config('backup.cron_secret')),
                // Scheduled backups run from the server scheduler (backups:run-scheduled); its heartbeat says it is running.
                'schedulerRunning' => is_int($beat = \Illuminate\Support\Facades\Cache::get('ops:scheduler-heartbeat')) && $beat >= now()->timestamp - 180,
            ],
        ]);
    }

    public function store(Request $request)
    {
        if (! request()->isMethod('GET')) {
            abort_unless(in_array(request()->user()?->role, ['admin', 'super_admin'], true), 403, 'Only administrators can manage backups.');
        }
        $validator = Validator::make($request->all(), [
            'backupType' => 'required|in:full,incremental,module',
            'storageMode' => 'nullable|in:local,cloud,hybrid',
            'moduleNames' => 'nullable|array',
            'moduleNames.*' => 'string|in:'.implode(',', $this->backups->moduleOptions()),
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }
        abort_if($request->input('backupType') === 'module' && ! $request->input('moduleNames'), 422, 'Select at least one backup module.');

        $companyId = $this->resolveStoreId($request, null);
        abort_unless($companyId && in_array($companyId, $this->authorizedStoreIds($request), true), 422, 'Select one authorized store before creating a backup.');
        $storageMode = $request->input('storageMode', 'local');

        // Resolve store settings (needed for cloud credentials)
        $storeSettings = $this->authorizedStores($request)->find($companyId)->backup_settings ?? [];

        // Validate cloud mode is configured before accepting the request
        if (in_array($storageMode, ['cloud', 'hybrid']) && ! BackupService::isCloudConfigured($storeSettings)) {
            return response()->json([
                'success' => false,
                'message' => 'OCI Object Storage is not configured for this store. Save OCI credentials in Settings first.',
            ], 422);
        }

        $backupType = $request->input('backupType');
        $moduleNames = $backupType === 'module'
            ? ($request->input('moduleNames') ?: [])
            : $this->backups->moduleOptions();

        // Backups that include the Users table (password hashes) must be encrypted -
        // an unencrypted backup file would put hashed passwords in plain-readable JSON.
        $plannedManifest = $this->backups->buildTableManifestForModules($moduleNames);
        if ($this->backups->manifestContainsSensitiveTable($plannedManifest) && ! $request->boolean('encryptionEnabled')) {
            return response()->json([
                'success' => false,
                'message' => 'This backup includes the Users table. Enable encryption and set a password before running it, or switch to a module-wise backup that excludes "Store" to skip it.',
            ], 422);
        }

        $startedAt = now();
        $status = 'success';
        $statusMessage = null;
        $filePath = null;
        $cloudPath = null;
        $fileSize = 0;
        $fileName = null;
        $tableCounts = [];

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

            $manifest = $plannedManifest;
            $exported = $this->backups->exportTablesToJson($manifest, $companyId, $since);
            foreach ($exported as $table => $rows) {
                $tableCounts[$table] = count($rows);
            }

            $baseName = 'backup_'.$backupType.'_'.$companyId.'_'.now()->format('Ymd_His').'_'.uniqid();
            $zipPath = $this->backups->writeBackupArchive($exported, $manifest, $baseName);

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
            $status = 'failed';
            $statusMessage = $e->getMessage();
        }

        $backup = Backup::create([
            'file_name' => $fileName ?? ('backup_failed_'.now()->format('Ymd_His')),
            'backup_type' => $backupType,
            'storage_mode' => $storageMode,
            'module_names' => $moduleNames,
            'company_id' => $companyId,
            'file_path' => $filePath,
            'cloud_path' => $cloudPath,
            'file_size' => $fileSize,
            'file_size_label' => $this->backups->formatBytes($fileSize),
            'status' => $status,
            'encryption_enabled' => $request->boolean('encryptionEnabled'),
            'summary' => ['status_message' => $statusMessage, 'tables' => $tableCounts, 'progress_percent' => 100],
            'started_at' => $startedAt,
            'completed_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => $status === 'success' ? 'Backup created' : 'Backup failed', 'data' => $backup], 201);
    }

    public function settings(Request $request)
    {
        if (! request()->isMethod('GET')) {
            abort_unless(in_array(request()->user()?->role, ['admin', 'super_admin'], true), 403, 'Only administrators can manage backups.');
        }
        $companyId = $this->resolveStoreId($request, null);

        if ($request->isMethod('post') || $request->isMethod('put')) {
            $request->validate([
                'storageMode' => 'sometimes|in:local,cloud,hybrid',
                'scheduleFrequency' => 'sometimes|in:daily,weekly,monthly',
                'scheduleTime' => 'sometimes|date_format:H:i',
                'scheduleDayOfWeek' => 'sometimes|integer|between:0,6',
                'scheduleDayOfMonth' => 'sometimes|integer|between:1,28',
                'scheduleBackupType' => 'sometimes|in:full,incremental,module',
                'scheduleModuleNames' => 'sometimes|array',
                'scheduleModuleNames.*' => 'string|in:'.implode(',', $this->backups->moduleOptions()),
                'retentionDaily' => 'sometimes|integer|between:1,3650',
                'retentionWeekly' => 'sometimes|integer|between:1,520',
                'retentionMonthly' => 'sometimes|integer|between:1,120',
                'ociNamespace' => ['nullable', 'string', 'max:63', 'regex:/\A[a-zA-Z0-9][a-zA-Z0-9-]{0,62}\z/'],
                'ociRegion' => ['nullable', 'string', 'max:63', 'regex:/\A[a-zA-Z0-9][a-zA-Z0-9-]{0,62}\z/'],
            ]);
            $settings = [
                'storage_mode' => $request->input('storageMode', 'local'),
                'local_storage_enabled' => $request->boolean('localStorageEnabled', true),
                'cloud_storage_enabled' => $request->boolean('cloudStorageEnabled'),
                'encryption_enabled' => $request->boolean('encryptionEnabled'),
                'restore_password_hint' => $request->input('restorePasswordHint', ''),
                'schedule_enabled' => $request->boolean('scheduleEnabled'),
                'schedule_frequency' => $request->input('scheduleFrequency', 'daily'),
                'schedule_time' => $request->input('scheduleTime', '02:00'),
                'schedule_day_of_week' => (int) $request->input('scheduleDayOfWeek', 1),
                'schedule_day_of_month' => (int) $request->input('scheduleDayOfMonth', 1),
                'schedule_backup_type' => $request->input('scheduleBackupType', 'full'),
                'schedule_module_names' => $request->input('scheduleModuleNames', []),
                'retention_daily' => (int) $request->input('retentionDaily', 7),
                'retention_weekly' => (int) $request->input('retentionWeekly', 4),
                'retention_monthly' => (int) $request->input('retentionMonthly', 12),
                'auto_cleanup_enabled' => $request->boolean('autoCleanupEnabled', true),
                // Oracle Cloud Infrastructure (OCI) Object Storage credentials - no
                // inline defaults here (region's old 'ap-mumbai-1' default silently
                // overwrote a real saved region on any request that omitted it, since
                // a non-empty default value can never be told apart from a real
                // submission). Left null when omitted; resolved against the existing
                // stored value below, only falling back to a real default as a last
                // resort for a store that's never configured OCI at all.
                'oci_namespace' => $request->input('ociNamespace'),
                'oci_region' => $request->input('ociRegion'),
                'oci_access_key_id' => $request->input('ociAccessKeyId'),
                'oci_secret_access_key' => $request->input('ociSecretAccessKey'),
                'oci_bucket' => $request->input('ociBucket'),
            ];

            if ($settings['schedule_enabled']) {
                $settings['next_scheduled_at'] = $this->backups->computeNextScheduledAt($settings)->toIso8601String();
            } else {
                $settings['next_scheduled_at'] = null;
            }

            // Scheduled backups run unattended - no human is present to type a
            // password, so if the operator wants them encrypted (required to
            // include the Users table), the password has to be stored somewhere
            // the server can read it without a human. Encrypting it at rest with
            // the app's own key (Crypt::encryptString, backed by APP_KEY) protects
            // it if the backup FILE leaks or gets stolen separately - the same
            // protection most backup systems rely on. It does NOT protect against
            // someone who fully compromises this server, since they'd have the
            // same key. That's a real, deliberate trade-off, not an oversight.
            $submittedPassword = $request->input('encryptionPassword');
            $isMaskedPassword = $submittedPassword !== null && str_repeat('*', 20) === $submittedPassword;
            if ($submittedPassword && ! $isMaskedPassword) {
                $settings['encryption_password_encrypted'] = Crypt::encryptString($submittedPassword);
            }

            if ($companyId) {
                $store = $this->authorizedStores($request)->find($companyId);
                if (! $store) {
                    return response()->json(['success' => false, 'message' => 'Store not found'], 404);
                }
                $existing = $store->backup_settings ?? [];
                if ($settings['oci_secret_access_key'] === str_repeat('*', 20)) {
                    $settings['oci_secret_access_key'] = $existing['oci_secret_access_key'] ?? '';
                }
                // Preserve every OCI credential field whenever it's submitted blank - a
                // caller that only means to change scheduling/retention (not touching the
                // OCI section at all) must never silently wipe working credentials. Real,
                // reproduced bug: a settings save that omitted the OCI fields blanked
                // oci_namespace/oci_bucket even though cloud was already configured.
                foreach (['oci_namespace', 'oci_region', 'oci_access_key_id', 'oci_secret_access_key', 'oci_bucket'] as $ociField) {
                    if (empty($settings[$ociField]) && ! empty($existing[$ociField])) {
                        $settings[$ociField] = $existing[$ociField];
                    }
                }
                // Only a genuinely first-time save (no existing region either) falls
                // back to this default - never overwrites a real saved region.
                $settings['oci_namespace'] ??= '';
                $settings['oci_region'] ??= 'ap-mumbai-1';
                $settings['oci_access_key_id'] ??= '';
                $settings['oci_secret_access_key'] ??= '';
                $settings['oci_bucket'] ??= '';
                // Preserve the existing stored encryption password unless a real new one was submitted
                if (! isset($settings['encryption_password_encrypted']) && ! empty($existing['encryption_password_encrypted'])) {
                    $settings['encryption_password_encrypted'] = $existing['encryption_password_encrypted'];
                }
                $settings['last_scheduled_at'] = $existing['last_scheduled_at'] ?? null;
                if (in_array($settings['storage_mode'], ['cloud', 'hybrid'], true) && ! BackupService::isCloudConfigured($settings)) {
                    return response()->json(['success' => false, 'message' => self::CLOUD_NEEDS_OCI], 422);
                }
                $store->update(['backup_settings' => $settings]);
            } else {
                abort_unless(
                    $request->user()?->role === 'super_admin' || ($request->user()?->role === 'admin' && ! $request->user()->store_id),
                    403,
                    'Select a store before saving backup settings.'
                );
                // Multi-store owner / Super Admin: apply schedule/retention across
                // authorized active stores only. OCI credentials are preserved per-store.
                $stores = $this->authorizedStores($request)->where('is_active', true)->get();
                $updates = [];
                foreach ($stores as $store) {
                    $existing = $store->backup_settings ?? [];
                    $storeSettings = array_merge($settings, [
                        'last_scheduled_at' => $existing['last_scheduled_at'] ?? null,
                        'oci_namespace' => ($existing['oci_namespace'] ?? '') ?: ($settings['oci_namespace'] ?? ''),
                        'oci_region' => ($existing['oci_region'] ?? '') ?: ($settings['oci_region'] ?? 'ap-mumbai-1'),
                        'oci_access_key_id' => ($existing['oci_access_key_id'] ?? '') ?: ($settings['oci_access_key_id'] ?? ''),
                        'oci_secret_access_key' => ($existing['oci_secret_access_key'] ?? '') ?: (($settings['oci_secret_access_key'] ?? '') === str_repeat('*', 20) ? '' : ($settings['oci_secret_access_key'] ?? '')),
                        'oci_bucket' => ($existing['oci_bucket'] ?? '') ?: ($settings['oci_bucket'] ?? ''),
                        'encryption_password_encrypted' => $existing['encryption_password_encrypted']
                            ?? ($settings['encryption_password_encrypted'] ?? null),
                    ]);
                    if (in_array($storeSettings['storage_mode'], ['cloud', 'hybrid'], true) && ! BackupService::isCloudConfigured($storeSettings)) {
                        return response()->json(['success' => false, 'message' => self::CLOUD_NEEDS_OCI." ({$store->name} has no OCI details yet; select it and save them there first.)"], 422);
                    }
                    $updates[] = [$store, $storeSettings];
                }
                // Checked for every store first, so a refusal never leaves the stores half updated.
                foreach ($updates as [$store, $storeSettings]) {
                    $store->update(['backup_settings' => $storeSettings]);
                }
            }

            return response()->json(['success' => true, 'message' => 'Backup settings saved']);
        }

        if ($companyId) {
            $store = $this->authorizedStores($request)->find($companyId);
            if (! $store) {
                return response()->json(['success' => false, 'message' => 'Store not found'], 404);
            }
        } else {
            $store = null;
        }

        return response()->json(['success' => true, 'data' => $this->presentSettings($store->backup_settings ?? [])]);
    }

    public function cloudTest(Request $request)
    {
        $request->validate([
            'ociNamespace' => ['nullable', 'string', 'max:63', 'regex:/\A[a-zA-Z0-9][a-zA-Z0-9-]{0,62}\z/'],
            'ociRegion' => ['nullable', 'string', 'max:63', 'regex:/\A[a-zA-Z0-9][a-zA-Z0-9-]{0,62}\z/'],
        ]);
        $companyId = $this->resolveStoreId($request, null);
        $store = $companyId ? $this->authorizedStores($request)->find($companyId) : null;
        $stored = $store->backup_settings ?? [];

        // Merge submitted credentials with stored ones (secret may be masked)
        $submittedSecret = $request->input('ociSecretAccessKey');
        $creds = [
            'oci_namespace' => $request->input('ociNamespace') ?: ($stored['oci_namespace'] ?? ''),
            'oci_region' => $request->input('ociRegion') ?: ($stored['oci_region'] ?? 'ap-mumbai-1'),
            'oci_access_key_id' => $request->input('ociAccessKeyId') ?: ($stored['oci_access_key_id'] ?? ''),
            'oci_secret_access_key' => ($submittedSecret && $submittedSecret !== str_repeat('*', 20)) ? $submittedSecret : ($stored['oci_secret_access_key'] ?? ''),
            'oci_bucket' => $request->input('ociBucket') ?: ($stored['oci_bucket'] ?? ''),
        ];

        $result = $this->backups->testCloudConnection($creds);

        return response()->json([
            'success' => $result['ok'],
            'message' => $result['message'],
        ], $result['ok'] ? 200 : 422);
    }

    public function restore(Request $request, $id)
    {
        if (! request()->isMethod('GET')) {
            abort_unless(in_array(request()->user()?->role, ['admin', 'super_admin'], true), 403, 'Only administrators can manage backups.');
        }
        $backup = $this->findAuthorizedBackup($request, $id);
        if (! $backup) {
            return response()->json(['success' => false, 'message' => 'Backup not found'], 404);
        }

        $restoreType = $request->input('restoreType', 'partial');
        $request->validate(['restoreType' => 'sometimes|in:partial,full', 'targetCompanyId' => 'nullable|integer|min:1', 'moduleNames' => 'sometimes|array']);
        $targetCompanyId = $request->filled('targetCompanyId') ? (int) $request->input('targetCompanyId') : $backup->company_id;
        abort_unless($targetCompanyId && $this->authorizedStores($request)->whereKey($targetCompanyId)->exists(), 403, 'Target store is not authorized.');
        $moduleNames = $restoreType === 'partial' ? ($request->input('moduleNames') ?: []) : [];

        $startedAt = now();
        $status = 'success';
        $statusMessage = null;
        $restoredRows = 0;
        $tableCounts = [];

        $decryptedTempPath = null;
        $skippedTables = [];
        $cloudTempPath = null;
        try {
            $zipPath = $backup->file_path ? storage_path('app/private/'.$backup->file_path) : null;
            if ((! $zipPath || ! is_file($zipPath)) && in_array($backup->storage_mode, ['cloud', 'hybrid'], true) && $backup->cloud_path) {
                $settings = $this->authorizedStores($request)->find($backup->company_id)->backup_settings ?? [];
                $zipPath = $cloudTempPath = $this->backups->downloadFromCloud($backup->cloud_path, $settings);
            }
            if (! $zipPath || ! is_file($zipPath)) {
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
            $skippedTables = $result['skippedTables'] ?? [];
        } catch (Throwable $e) {
            $status = 'failed';
            $statusMessage = $e->getMessage();
        } finally {
            if ($decryptedTempPath && file_exists($decryptedTempPath)) {
                @unlink($decryptedTempPath);
            }
            if ($cloudTempPath && is_file($cloudTempPath)) {
                @unlink($cloudTempPath);
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
                'skipped_tables' => $skippedTables,
            ],
            'started_at' => $startedAt,
            'completed_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => $status === 'success' ? 'Restore completed' : 'Restore failed', 'data' => $restore], 201);
    }

    public function import(Request $request)
    {
        if (! request()->isMethod('GET')) {
            abort_unless(in_array(request()->user()?->role, ['admin', 'super_admin'], true), 403, 'Only administrators can manage backups.');
        }
        $validator = Validator::make($request->all(), [
            'backupFile' => 'required|file|max:102400',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        $companyId = $this->resolveStoreId($request, null);
        abort_unless($companyId && in_array($companyId, $this->authorizedStoreIds($request), true), 422, 'Select one authorized store before importing a backup.');
        $password = $request->input('password');
        $uploaded = $request->file('backupFile');
        abort_unless(in_array(strtolower($uploaded->getClientOriginalExtension()), ['zip', 'enc'], true), 422, 'Upload a .zip or .enc backup file.');

        $fileName = 'imported_'.now()->format('Ymd_His').'_'.uniqid().'.'.$uploaded->getClientOriginalExtension();
        $dir = storage_path('app/private/backups');
        if (! is_dir($dir)) {
            mkdir($dir, 0700, true);
        }
        $uploaded->move($dir, $fileName);
        $savedPath = $dir.DIRECTORY_SEPARATOR.$fileName;
        @chmod($savedPath, 0600);

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

        if ($status === 'failed') {
            @unlink($savedPath);
            $backup->delete();
            report(new \RuntimeException($statusMessage));

            return response()->json(['success' => false, 'message' => 'Backup could not be restored. Check the archive, password and selected store.'], 422);
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

    public function download(Request $request, $id)
    {
        $backup = $this->findAuthorizedBackup($request, $id);
        if (! $backup) {
            return response()->json(['success' => false, 'message' => 'Backup not found'], 404);
        }

        $tmpCloudPath = null;

        try {
            // Cloud-only backup: fetch from OCI to a temp file, then stream
            if ($backup->storage_mode === 'cloud' && $backup->cloud_path) {
                $storeSettings = $backup->company_id
                    ? ($this->authorizedStores($request)->find($backup->company_id)->backup_settings ?? [])
                    : [];
                $tmpCloudPath = $this->backups->downloadFromCloud($backup->cloud_path, $storeSettings);

                return response()->download($tmpCloudPath, $backup->file_name, [
                    'Content-Type' => 'application/octet-stream',
                    'Content-Disposition' => 'attachment; filename="'.$backup->file_name.'"',
                ])->deleteFileAfterSend(true);
            }

            // Hybrid backup: try local first, fall back to OCI
            if ($backup->storage_mode === 'hybrid') {
                $localPath = $backup->file_path ? storage_path('app/private/'.$backup->file_path) : null;
                if ($localPath && file_exists($localPath)) {
                    return response()->download($localPath, $backup->file_name, [
                        'Content-Type' => 'application/octet-stream',
                        'Content-Disposition' => 'attachment; filename="'.$backup->file_name.'"',
                    ]);
                }
                if ($backup->cloud_path) {
                    $storeSettings = $backup->company_id
                        ? ($this->authorizedStores($request)->find($backup->company_id)->backup_settings ?? [])
                        : [];
                    $tmpCloudPath = $this->backups->downloadFromCloud($backup->cloud_path, $storeSettings);

                    return response()->download($tmpCloudPath, $backup->file_name, [
                        'Content-Type' => 'application/octet-stream',
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
                'Content-Type' => 'application/octet-stream',
                'Content-Disposition' => 'attachment; filename="'.$backup->file_name.'"',
            ]);
        } catch (Throwable $e) {
            if ($tmpCloudPath && file_exists($tmpCloudPath)) {
                @unlink($tmpCloudPath);
            }

            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function logs(Request $request, $id)
    {
        $backup = $this->findAuthorizedBackup($request, $id);
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

    public function destroy(Request $request, $id)
    {
        if (! request()->isMethod('GET')) {
            abort_unless(in_array(request()->user()?->role, ['admin', 'super_admin'], true), 403, 'Only administrators can manage backups.');
        }
        $backup = $this->findAuthorizedBackup($request, $id);
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
                    ? ($this->authorizedStores($request)->find($backup->company_id)->backup_settings ?? [])
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
        // Header (or POST body) only: a token in the URL ends up in web server and proxy access logs.
        $token = $request->header('X-Backup-Cron-Token') ?? $request->post('token');
        if ($request->query('token') !== null) {
            return response()->json(['success' => false, 'message' => 'Send the token in the X-Backup-Cron-Token header, not the URL.'], 400);
        }

        if (! $secret || ! $token || ! hash_equals($secret, (string) $token)) {
            return response()->json(['success' => false, 'message' => 'Invalid or missing token'], 403);
        }

        // The same run the server scheduler does every 15 minutes (backups:run-scheduled); this URL
        // stays for installations that trigger it from an outside timer.
        $result = app(ScheduledBackupRunner::class)->run($request->attributes->get('store_context_id'));

        return response()->json(['success' => true, 'data' => $result]);
    }
}
