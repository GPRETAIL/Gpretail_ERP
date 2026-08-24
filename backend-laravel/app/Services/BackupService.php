<?php

namespace App\Services;

use App\Models\Backup;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use ZipArchive;

class BackupService
{
    /**
     * Module slug => [table => scope spec].
     * Scope types: none, self_id, store_id, store_id_or_company_id,
     * source_or_target_store_id, via_parent.
     */
    private const MODULE_MAP = [
        'sales' => [
            'pos_sales' => ['scope' => 'store_id'],
            'pos_sale_items' => ['scope' => 'via_parent', 'parent' => 'pos_sales', 'local_fk' => 'pos_sale_id'],
            'pos_payments' => ['scope' => 'via_parent', 'parent' => 'pos_sales', 'local_fk' => 'pos_sale_id'],
            'pos_returns' => ['scope' => 'store_id'],
            'pos_return_items' => ['scope' => 'via_parent', 'parent' => 'pos_returns', 'local_fk' => 'pos_return_id'],
            'dealer_invoices' => ['scope' => 'store_id'],
            'dealer_invoice_items' => ['scope' => 'via_parent', 'parent' => 'dealer_invoices', 'local_fk' => 'dealer_invoice_id'],
            'sales_approvals' => ['scope' => 'store_id'],
            'sales_approval_items' => ['scope' => 'via_parent', 'parent' => 'sales_approvals', 'local_fk' => 'sales_approval_id'],
            'settlements' => ['scope' => 'store_id'],
            'cash_register_sessions' => ['scope' => 'store_id'],
        ],
        'warehouse' => [
            'stocks' => ['scope' => 'store_id'],
            'stock_transactions' => ['scope' => 'store_id'],
            'barcodes' => ['scope' => 'none'],
            'inventory_entries' => ['scope' => 'store_id'],
            'inventory_entry_items' => ['scope' => 'via_parent', 'parent' => 'inventory_entries', 'local_fk' => 'inventory_entry_id'],
            'direct_purchases' => ['scope' => 'store_id_or_company_id'],
            'direct_purchase_items' => ['scope' => 'via_parent', 'parent' => 'direct_purchases', 'local_fk' => 'direct_purchase_id'],
            'physical_stocks' => ['scope' => 'store_id'],
            'physical_stock_items' => ['scope' => 'via_parent', 'parent' => 'physical_stocks', 'local_fk' => 'physical_stock_id'],
            'stock_outwards' => ['scope' => 'source_or_target_store_id'],
            'stock_outward_items' => ['scope' => 'via_parent', 'parent' => 'stock_outwards', 'local_fk' => 'stock_outward_id'],
            'stock_batches' => ['scope' => 'store_id'],
            'stock_batch_allocations' => ['scope' => 'via_parent', 'parent' => 'stock_batches', 'local_fk' => 'stock_batch_id'],
            'purchase_invoices' => ['scope' => 'store_id'],
            'purchase_invoice_items' => ['scope' => 'via_parent', 'parent' => 'purchase_invoices', 'local_fk' => 'purchase_invoice_id'],
            'grns' => ['scope' => 'store_id'],
            'grn_items' => ['scope' => 'via_parent', 'parent' => 'grns', 'local_fk' => 'grn_id'],
            'purchase_returns' => ['scope' => 'store_id'],
            'purchase_return_items' => ['scope' => 'via_parent', 'parent' => 'purchase_returns', 'local_fk' => 'purchase_return_id'],
            'transport_entries' => ['scope' => 'none'],
            'transport_issues' => ['scope' => 'none'],
            'transport_receipts' => ['scope' => 'none'],
        ],
        'masters' => [
            'brands' => ['scope' => 'none'],
            'categories' => ['scope' => 'none'],
            'attribute_types' => ['scope' => 'none'],
            'attribute_values' => ['scope' => 'none'],
            'size_groups' => ['scope' => 'none'],
            'sizes' => ['scope' => 'none'],
            'taxes' => ['scope' => 'none'],
            'tax_slabs' => ['scope' => 'none'],
            'suppliers' => ['scope' => 'none'],
            'agents' => ['scope' => 'none'],
            'transports' => ['scope' => 'none'],
            'products' => ['scope' => 'none'],
            'product_variants' => ['scope' => 'none'],
        ],
        'store' => [
            'stores' => ['scope' => 'self_id'],
            'roles' => ['scope' => 'none'],
            'permissions' => ['scope' => 'none'],
            'role_permissions' => ['scope' => 'none'],
            'printer_configs' => ['scope' => 'store_id'],
            // Login accounts - carries password hashes, so BackupController::store()
            // requires encryption whenever this table is part of the export.
            'users' => ['scope' => 'store_id', 'sensitive' => true],
            'user_table_preferences' => ['scope' => 'via_parent', 'parent' => 'users', 'local_fk' => 'user_id'],
        ],
        'crm' => [
            'customers' => ['scope' => 'none'],
            'customer_orders' => ['scope' => 'store_id'],
            'customer_order_items' => ['scope' => 'via_parent', 'parent' => 'customer_orders', 'local_fk' => 'customer_order_id'],
            'customer_order_communications' => ['scope' => 'via_parent', 'parent' => 'customer_orders', 'local_fk' => 'customer_order_id'],
            'loyalty_transactions' => ['scope' => 'none'],
            'credit_ledgers' => ['scope' => 'none'],
        ],
        'finance' => [
            'supplier_payments' => ['scope' => 'store_id'],
            'supplier_payment_items' => ['scope' => 'via_parent', 'parent' => 'supplier_payments', 'local_fk' => 'supplier_payment_id'],
            'general_ledgers' => ['scope' => 'store_id'],
        ],
        'settings' => [
            'system_configurations' => ['scope' => 'none'],
            'hr_departments' => ['scope' => 'none'],
            'hr_designations' => ['scope' => 'none'],
            'employees' => ['scope' => 'store_id'],
            'attendances' => ['scope' => 'via_parent', 'parent' => 'employees', 'local_fk' => 'employee_id'],
            'app_notifications' => ['scope' => 'store_id'],
        ],
        'dashboard' => [],
        'analytical' => [],
    ];

    public function moduleOptions(): array
    {
        return array_keys(self::MODULE_MAP);
    }

    /**
     * @return array<string, array> table => scope spec
     */
    public function buildTableManifestForModules(array $moduleNames): array
    {
        $manifest = [];
        foreach ($moduleNames as $module) {
            foreach (self::MODULE_MAP[$module] ?? [] as $table => $spec) {
                $manifest[$table] = $spec;
            }
        }

        return $manifest;
    }

    public function fullTableManifest(): array
    {
        return $this->buildTableManifestForModules(array_keys(self::MODULE_MAP));
    }

    /**
     * True if the manifest includes a table marked 'sensitive' (e.g. users - password hashes).
     */
    public function manifestContainsSensitiveTable(array $manifest): bool
    {
        foreach ($manifest as $spec) {
            if (! empty($spec['sensitive'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Remove sensitive tables from a manifest - used for unattended scheduled backups,
     * which always run without encryption (no human present to supply a password).
     */
    public function stripSensitiveTables(array $manifest): array
    {
        return array_filter($manifest, fn ($spec) => empty($spec['sensitive']));
    }

    /**
     * @return array<string, array> table => rows[]
     */
    public function exportTablesToJson(array $manifest, ?int $companyId, ?Carbon $since): array
    {
        $exported = [];

        foreach ($manifest as $table => $spec) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $query = DB::table($table);
            $this->applyScope($query, $table, $spec, $companyId, $manifest);

            if ($since && Schema::hasColumn($table, 'updated_at')) {
                $query->where('updated_at', '>', $since);
            }

            $exported[$table] = $query->get()->map(fn ($row) => (array) $row)->all();
        }

        return $exported;
    }

    private function applyScope($query, string $table, array $spec, ?int $companyId, array $manifest): void
    {
        if (! $companyId) {
            return;
        }

        switch ($spec['scope']) {
            case 'self_id':
                $query->where('id', $companyId);
                break;
            case 'store_id':
                $query->where('store_id', $companyId);
                break;
            case 'store_id_or_company_id':
                $query->where(fn ($q) => $q->where('store_id', $companyId)->orWhere('company_id', $companyId));
                break;
            case 'source_or_target_store_id':
                $query->where(fn ($q) => $q->where('source_store_id', $companyId)->orWhere('target_store_id', $companyId));
                break;
            case 'via_parent':
                $parentTable = $spec['parent'];
                $parentSpec = self::findSpecForTable($parentTable) ?? ['scope' => 'store_id'];
                $query->whereIn($spec['local_fk'], function ($sub) use ($parentTable, $parentSpec, $companyId) {
                    $sub->select('id')->from($parentTable);
                    $this->applyScope($sub, $parentTable, $parentSpec, $companyId, []);
                });
                break;
            case 'none':
            default:
                break;
        }
    }

    private static function findSpecForTable(string $table): ?array
    {
        foreach (self::MODULE_MAP as $tables) {
            if (isset($tables[$table])) {
                return $tables[$table];
            }
        }

        return null;
    }

    public function writeBackupArchive(array $exportedData, array $manifest, string $baseName): string
    {
        $dir = storage_path('app/private/backups');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $zipPath = $dir.DIRECTORY_SEPARATOR.$baseName.'.zip';
        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException("Could not create backup archive at {$zipPath}");
        }

        $tableMeta = [];
        foreach ($exportedData as $table => $rows) {
            $zip->addFromString("tables/{$table}.json", json_encode($rows, JSON_UNESCAPED_UNICODE));
            $tableMeta[$table] = [
                'row_count' => count($rows),
                'scope' => $manifest[$table]['scope'] ?? 'none',
            ];
        }

        $manifestJson = [
            'app' => 'Vynerix ERP',
            'generated_at' => now()->toIso8601String(),
            'tables' => $tableMeta,
        ];
        $zip->addFromString('manifest.json', json_encode($manifestJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $zip->close();

        return $zipPath;
    }

    public function encryptArchive(string $zipPath, string $password): string
    {
        $data = file_get_contents($zipPath);
        $key = hash('sha256', $password, true);
        $iv = random_bytes(16);
        $cipher = openssl_encrypt($data, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);

        if ($cipher === false) {
            throw new RuntimeException('Failed to encrypt backup archive.');
        }

        $encPath = $zipPath.'.enc';
        file_put_contents($encPath, $iv.$cipher);
        @unlink($zipPath);

        return $encPath;
    }

    public function decryptArchive(string $encPath, string $password): string
    {
        $blob = file_get_contents($encPath);
        $iv = substr($blob, 0, 16);
        $cipher = substr($blob, 16);
        $key = hash('sha256', $password, true);
        $plain = openssl_decrypt($cipher, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);

        if ($plain === false) {
            throw new RuntimeException('Incorrect password or corrupted backup file.');
        }

        $tmpDir = storage_path('app/private/backups/tmp');
        if (! is_dir($tmpDir)) {
            mkdir($tmpDir, 0755, true);
        }
        $tmpZip = $tmpDir.DIRECTORY_SEPARATOR.'decrypt_'.uniqid().'.zip';
        file_put_contents($tmpZip, $plain);

        $zip = new ZipArchive;
        if ($zip->open($tmpZip) !== true) {
            @unlink($tmpZip);
            throw new RuntimeException('Incorrect password or corrupted backup file.');
        }
        $zip->close();

        return $tmpZip;
    }

    /**
     * @return array{restoredRows: int, tables: array<string,int>}
     */
    /**
     * Restore straight from the zip archive's in-memory entries - no extract-to-disk
     * step. Avoids writing/reading N small files per table, which dominated the time
     * for large restores (measured: extracting to disk first made this meaningfully
     * slower than reading each table's JSON directly out of the zip stream).
     */
    public function restoreTablesFromArchive(string $zipPath, ?array $tableFilter, ?int $targetCompanyId, ?int $originalCompanyId): array
    {
        $zip = new ZipArchive;
        if ($zip->open($zipPath) !== true) {
            throw new RuntimeException('Could not open backup archive.');
        }

        $manifestRaw = $zip->getFromName('manifest.json');
        if ($manifestRaw === false) {
            $zip->close();

            throw new RuntimeException('Backup archive is missing manifest.json.');
        }
        $manifest = json_decode($manifestRaw, true) ?? [];
        $tables = array_keys($manifest['tables'] ?? []);

        if ($tableFilter) {
            $tables = array_values(array_intersect($tables, $tableFilter));
        }

        $restoredRows = 0;
        $tableCounts = [];

        DB::transaction(function () use ($zip, $tables, $targetCompanyId, $originalCompanyId, &$restoredRows, &$tableCounts) {
            foreach ($tables as $table) {
                if (! Schema::hasTable($table)) {
                    continue;
                }
                $raw = $zip->getFromName("tables/{$table}.json");
                $rows = $raw === false ? [] : (json_decode($raw, true) ?? []);
                if (! $rows) {
                    $tableCounts[$table] = 0;

                    continue;
                }

                // Never blindly rewrite the stores table itself when restoring into a
                // different target - would clobber the target store's own profile.
                if ($table === 'stores') {
                    $tableCounts[$table] = 0;

                    continue;
                }

                if ($targetCompanyId && $originalCompanyId && $targetCompanyId !== $originalCompanyId) {
                    $rows = $this->rewriteScopeColumn($table, $rows, $originalCompanyId, $targetCompanyId);
                }

                $uniqueBy = $table === 'role_permissions' ? ['role_id', 'permission_id'] : ['id'];
                $updateColumns = array_values(array_diff(array_keys($rows[0]), $uniqueBy));

                // Larger batches = fewer round trips to the DB, which is what actually
                // dominates restore time (not PHP-side JSON decoding).
                foreach (array_chunk($rows, 1000) as $chunk) {
                    DB::table($table)->upsert($chunk, $uniqueBy, $updateColumns);
                }

                $tableCounts[$table] = count($rows);
                $restoredRows += count($rows);
            }
        });

        $zip->close();

        return ['restoredRows' => $restoredRows, 'tables' => $tableCounts];
    }

    private function rewriteScopeColumn(string $table, array $rows, int $originalCompanyId, int $targetCompanyId): array
    {
        $spec = self::findSpecForTable($table);
        if (! $spec) {
            return $rows;
        }

        return array_map(function ($row) use ($spec, $originalCompanyId, $targetCompanyId) {
            switch ($spec['scope']) {
                case 'store_id':
                    if (($row['store_id'] ?? null) == $originalCompanyId) {
                        $row['store_id'] = $targetCompanyId;
                    }
                    break;
                case 'store_id_or_company_id':
                    if (($row['store_id'] ?? null) == $originalCompanyId) {
                        $row['store_id'] = $targetCompanyId;
                    }
                    if (($row['company_id'] ?? null) == $originalCompanyId) {
                        $row['company_id'] = $targetCompanyId;
                    }
                    break;
                case 'source_or_target_store_id':
                    if (($row['source_store_id'] ?? null) == $originalCompanyId) {
                        $row['source_store_id'] = $targetCompanyId;
                    }
                    if (($row['target_store_id'] ?? null) == $originalCompanyId) {
                        $row['target_store_id'] = $targetCompanyId;
                    }
                    break;
            }

            return $row;
        }, $rows);
    }


    public function findLatestSuccessfulBackup(?int $companyId): ?Backup
    {
        return Backup::where('status', 'success')
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->when(! $companyId, fn ($q) => $q->whereNull('company_id'))
            ->orderByDesc('completed_at')
            ->first();
    }

    public function computeNextScheduledAt(array $settings, ?Carbon $from = null): Carbon
    {
        $from = $from ?: now();
        $time = $settings['schedule_time'] ?? '02:00';
        [$hour, $minute] = array_map('intval', explode(':', $time.':00'));

        $frequency = $settings['schedule_frequency'] ?? 'daily';
        $next = $from->copy()->setTime($hour, $minute, 0);

        if ($next->lte($from)) {
            $next->addDay();
        }

        if ($frequency === 'weekly') {
            $targetDow = (int) ($settings['schedule_day_of_week'] ?? 1);
            while ((int) $next->dayOfWeek !== $targetDow) {
                $next->addDay();
            }
        } elseif ($frequency === 'monthly') {
            $targetDom = min((int) ($settings['schedule_day_of_month'] ?? 1), 28);
            $next->day($targetDom);
            if ($next->lte($from)) {
                $next->addMonthNoOverflow()->day($targetDom);
            }
        }

        return $next;
    }

    public function formatBytes(int $bytes): string
    {
        if ($bytes <= 0) {
            return '0 B';
        }
        $units = ['B', 'KB', 'MB', 'GB'];
        $power = (int) floor(log($bytes, 1024));
        $power = min($power, count($units) - 1);

        return round($bytes / (1024 ** $power), 1).' '.$units[$power];
    }

    // ─── Oracle Cloud Infrastructure (OCI) Object Storage ─────────────────────

    /**
     * Check whether OCI Object Storage credentials are configured in backup_settings.
     * Free tier: 20 GB storage, 10 TB egress/month, 50 000 API calls/month.
     */
    public static function isCloudConfigured(array $settings): bool
    {
        return ! empty($settings['oci_namespace'])
            && ! empty($settings['oci_region'])
            && ! empty($settings['oci_access_key_id'])
            && ! empty($settings['oci_secret_access_key'])
            && ! empty($settings['oci_bucket']);
    }

    /**
     * Build an on-the-fly S3-compatible Flysystem disk from OCI Customer Secret Key credentials.
     * OCI S3-compatible endpoint: https://{namespace}.compat.objectstorage.{region}.oraclecloud.com
     * Does NOT modify the global filesystem config.
     */
    public function buildOciDisk(array $settings): \Illuminate\Contracts\Filesystem\Filesystem
    {
        $namespace = $settings['oci_namespace'] ?? '';
        $region    = $settings['oci_region']    ?? 'ap-mumbai-1';
        $endpoint  = "https://{$namespace}.compat.objectstorage.{$region}.oraclecloud.com";

        $config = [
            'driver'                  => 's3',
            'key'                     => $settings['oci_access_key_id'],
            'secret'                  => $settings['oci_secret_access_key'],
            'region'                  => $region,
            'bucket'                  => $settings['oci_bucket'],
            'endpoint'                => $endpoint,
            'use_path_style_endpoint' => true,
            'version'                 => 'latest',
            'throw'                   => true,
        ];

        // Local XAMPP dev machines often lack a valid CA bundle, which breaks TLS
        // verification against OCI. Never disable verification outside local dev.
        if (app()->environment('local')) {
            $config['http'] = ['verify' => false];
        }

        return Storage::build($config);
    }

    /**
     * Upload a local backup file to OCI Object Storage.
     * Returns the remote object path stored in the bucket.
     */
    public function uploadToCloud(string $localPath, array $settings): string
    {
        $disk       = $this->buildOciDisk($settings);
        $remotePath = 'backups/'.basename($localPath);
        $stream     = fopen($localPath, 'rb');

        if ($stream === false) {
            throw new RuntimeException("Cannot open local backup file for cloud upload: {$localPath}");
        }

        try {
            $disk->writeStream($remotePath, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        return $remotePath;
    }

    /**
     * Download a backup from OCI Object Storage to a local temp file and return its path.
     */
    public function downloadFromCloud(string $remotePath, array $settings): string
    {
        $disk    = $this->buildOciDisk($settings);
        $tmpDir  = storage_path('app/private/backups/tmp');
        if (! is_dir($tmpDir)) {
            mkdir($tmpDir, 0755, true);
        }

        $tmpPath = $tmpDir.DIRECTORY_SEPARATOR.'cloud_dl_'.uniqid().'_'.basename($remotePath);
        $stream  = $disk->readStream($remotePath);

        if ($stream === false || $stream === null) {
            throw new RuntimeException("Could not read backup from cloud storage: {$remotePath}");
        }

        try {
            file_put_contents($tmpPath, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        return $tmpPath;
    }

    /**
     * Delete a backup object from OCI Object Storage.
     */
    public function deleteFromCloud(string $remotePath, array $settings): void
    {
        $disk = $this->buildOciDisk($settings);
        $disk->delete($remotePath);
    }

    /**
     * Test the OCI Object Storage connection by listing the backups prefix.
     * Returns ['ok' => bool, 'message' => string].
     */
    public function testCloudConnection(array $settings): array
    {
        if (! self::isCloudConfigured($settings)) {
            return ['ok' => false, 'message' => 'OCI credentials are incomplete. Please fill in all fields.'];
        }

        try {
            $disk = $this->buildOciDisk($settings);
            $disk->files('backups');  // lists prefix — throws on auth/network failure

            return ['ok' => true, 'message' => 'Connection to OCI Object Storage successful.'];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => 'Connection failed: '.$e->getMessage()];
        }
    }

    /**
     * Get the total storage bytes used in the OCI bucket by summing all backup object sizes.
     */
    public function cloudStorageUsedBytes(array $settings): int
    {
        if (! self::isCloudConfigured($settings)) {
            return 0;
        }

        try {
            $disk  = $this->buildOciDisk($settings);
            $files = $disk->allFiles('backups');
            $total = 0;
            foreach ($files as $file) {
                $total += $disk->size($file);
            }

            return $total;
        } catch (\Throwable) {
            return 0;
        }
    }
}
