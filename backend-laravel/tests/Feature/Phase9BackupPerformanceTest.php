<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Store;
use App\Models\User;
use App\Services\BackupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

class Phase9BackupPerformanceTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private BackupService $backupService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create([
            'name' => 'Phase 9 Store',
            'code' => 'STR-P9',
            'is_active' => true,
        ]);

        $this->backupService = app(BackupService::class);
    }

    public function test_export_tables_to_json_streams_via_cursor_and_strips_store_secrets(): void
    {
        $this->store->update([
            'admin_password' => 'secret-pass',
            'einvoice_password' => 'einvoice-secret',
            'gst_access_key' => 'gst-secret',
        ]);

        (new Brand)->forceFill([
            'store_id' => $this->store->id,
            'name' => 'Phase 9 Brand',
            'code' => 'BRD-P9',
            'is_active' => true,
        ])->save();

        $manifest = $this->backupService->fullTableManifest();
        $exported = $this->backupService->exportTablesToJson($manifest, $this->store->id, null);

        $this->assertNotEmpty($exported['brands']);
        $this->assertSame('BRD-P9', $exported['brands'][0]['code']);
        $this->assertArrayNotHasKey('admin_password', $exported['stores'][0]);
        $this->assertArrayNotHasKey('einvoice_password', $exported['stores'][0]);
        $this->assertArrayNotHasKey('gst_access_key', $exported['stores'][0]);
    }

    public function test_merge_tables_from_export_chunks_large_where_in_above_sqlite_999_limit(): void
    {
        $now = now()->subHour()->toDateTimeString();
        $rows = [];
        for ($i = 1; $i <= 1200; $i++) {
            $rows[] = [
                'id' => $i,
                'store_id' => $this->store->id,
                'name' => "Brand {$i}",
                'code' => "B-{$i}",
                'is_active' => 1,
                'created_at' => $now,
                'updated_at' => now()->toDateTimeString(),
            ];
        }

        // Seed 5 existing rows to verify chunked comparison works across > 999 incoming keys
        DB::table('brands')->insert(array_slice($rows, 0, 5));
        DB::table('brands')->insert(array_replace($rows[1099], ['name' => 'Newer local brand', 'updated_at' => now()->addHour()->toDateTimeString()]));

        DB::listen(function ($event): void {
            $this->assertLessThanOrEqual(999, count($event->bindings), 'Both key lookups and bulk writes must fit older SQLite limits.');
        });

        $result = $this->backupService->mergeTablesFromExport([
            'brands' => $rows,
        ]);

        $this->assertSame(1194, $result['tables']['brands']);
        $this->assertSame(1200, DB::table('brands')->count());
        $this->assertDatabaseHas('brands', ['id' => 1100, 'name' => 'Newer local brand']);
    }

    public function test_restore_tables_from_archive_detects_cross_store_id_conflict_in_batch(): void
    {
        $otherStore = Store::create([
            'name' => 'Other Store',
            'code' => 'STR-OTHER-P9',
            'is_active' => true,
        ]);

        $conflictingBrand = (new Brand)->forceFill([
            'store_id' => $otherStore->id,
            'name' => 'Other Brand',
            'code' => 'BRD-OTHER',
            'is_active' => true,
        ]);
        $conflictingBrand->save();

        $manifest = ['brands' => ['scope' => 'store_id']];
        $zipPath = $this->backupService->writeBackupArchive([
            'brands' => [[
                'id' => $conflictingBrand->id,
                'store_id' => $this->store->id,
                'name' => 'Colliding Brand',
                'code' => 'BRD-COLLIDE',
                'is_active' => true,
            ]],
        ], $manifest, 'phase9_collision_test');

        try {
            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessage('Archive record IDs conflict with another store.');
            $this->backupService->restoreTablesFromArchive($zipPath, ['brands'], $this->store->id, $this->store->id);
        } finally {
            @unlink($zipPath);
        }
    }

    public function test_export_restores_query_logging_state_even_when_export_fails(): void
    {
        DB::enableQueryLog();
        DB::flushQueryLog();
        $manifest = ['stores' => ['scope' => 'self_id']];
        try {
            $this->backupService->exportTablesToJson($manifest, $this->store->id, null);
            $this->assertTrue(DB::logging());
            $this->assertSame([], DB::getQueryLog());
            try {
                $this->backupService->exportTablesToJson(['roles' => ['scope' => 'store_id_or_company_id']], $this->store->id, null);
                $this->fail('An unsupported ownership scope must fail closed.');
            } catch (RuntimeException $e) {
                $this->assertStringContainsString('No supported store ownership', $e->getMessage());
            }
            $this->assertTrue(DB::logging());
        } finally {
            DB::disableQueryLog();
            DB::flushQueryLog();
        }
        $this->backupService->exportTablesToJson($manifest, $this->store->id, null);
        $this->assertFalse(DB::logging());
    }

    public function test_ten_thousand_directly_owned_rows_restore_with_twenty_ownership_reads(): void
    {
        $rows = [];
        for ($id = 1; $id <= 10000; $id++) {
            $rows[] = ['id' => $id, 'store_id' => $this->store->id, 'name' => 'Original '.$id, 'code' => 'P9-BULK-'.$id, 'is_active' => 1];
        }
        foreach (array_chunk($rows, 150) as $chunk) {
            DB::table('brands')->insert($chunk);
        }
        foreach ($rows as &$row) {
            $row['name'] = 'Restored '.$row['id'];
        }
        unset($row);
        $path = $this->backupService->writeBackupArchive(['brands' => $rows], ['brands' => ['scope' => 'store_id_or_company_id']], 'phase9_bulk_'.bin2hex(random_bytes(8)));
        $ownershipReads = 0;
        DB::listen(function ($event) use (&$ownershipReads): void {
            if (str_starts_with($event->sql, 'select') && str_contains($event->sql, 'from "brands"')) {
                $ownershipReads++;
            }
            $this->assertLessThanOrEqual(999, count($event->bindings));
        });
        try {
            $result = $this->backupService->restoreTablesFromArchive($path, ['brands'], $this->store->id, $this->store->id);
            $this->assertSame(10000, $result['restoredRows']);
            $this->assertSame(20, $ownershipReads);
            $this->assertDatabaseHas('brands', ['id' => 10000, 'name' => 'Restored 10000']);
        } finally {
            @unlink($path);
        }
    }

    public function test_super_admin_protection_is_batched_and_unconditional_for_unmanaged_restores(): void
    {
        $protected = User::factory()->create(['username' => 'p9-platform-admin', 'role' => 'super_admin']);
        $rows = [];
        for ($id = 100; $id < 1101; $id++) {
            $rows[] = ['id' => $id, 'role' => 'admin', 'name' => 'Legitimate '.$id, 'store_id' => $this->store->id];
        }
        $rows[] = ['id' => $protected->id, 'role' => 'admin', 'name' => 'Overwritten', 'store_id' => $this->store->id];
        $path = $this->backupService->writeBackupArchive(['users' => $rows], ['users' => ['scope' => 'store_id']], 'phase9_users_'.bin2hex(random_bytes(8)));
        $roleReads = 0;
        DB::listen(function ($event) use (&$roleReads): void {
            if (str_starts_with($event->sql, 'select') && str_contains($event->sql, 'from "users"') && in_array('super_admin', $event->bindings, true)) {
                $roleReads++;
            }
        });
        try {
            try {
                $this->backupService->restoreTablesFromArchive($path, null, null, null);
                $this->fail('A platform administrator ID must never be overwritten.');
            } catch (RuntimeException $e) {
                $this->assertStringContainsString('Platform administrators cannot be restored', $e->getMessage());
            }
            $this->assertSame(1, $roleReads);
            $this->assertDatabaseHas('users', ['id' => $protected->id, 'role' => 'super_admin']);
        } finally {
            @unlink($path);
        }
    }
}
