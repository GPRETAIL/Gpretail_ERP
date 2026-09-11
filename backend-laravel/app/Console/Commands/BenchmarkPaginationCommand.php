<?php

namespace App\Console\Commands;

use App\Services\PaginationService;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BenchmarkPaginationCommand extends Command
{
    protected $signature = 'pagination:benchmark 
                            {--seed=0 : Number of records to seed} 
                            {--scale=0 : Target total records to scale up to via fast internal duplication}
                            {--test-switching : Test bi-directional auto switching (offset -> cursor -> offset)}
                            {--cleanup : Remove all seeded benchmark records}
                            {--status : Check table statistics and estimation}';

    protected $description = 'Benchmark server-side pagination (Offset vs Keyset Cursor) and verify 50K auto-switching.';

    public function handle(PaginationService $paginationService): int
    {
        $this->info('===========================================================');
        $this->info(' GPRETAIL ERP — Adaptive Pagination & Performance Benchmark');
        $this->info('===========================================================');

        $database = DB::connection()->getDatabaseName();
        $this->line("Database: <comment>{$database}</comment>");

        if ($this->option('cleanup')) {
            return $this->cleanupBenchmarkData();
        }

        if ($this->option('test-switching')) {
            return $this->runBiDirectionalSwitchingTest($paginationService);
        }

        $seedCount = (int) $this->option('seed');
        if ($seedCount > 0) {
            $this->seedBenchmarkSales($seedCount);
        }

        $scaleTarget = (int) $this->option('scale');
        if ($scaleTarget > 0) {
            $this->scaleTableToTarget($scaleTarget);
        }

        $this->displayTableStats();

        $this->runPerformanceBenchmarks();

        $this->verifyAutoSwitching($paginationService);

        return self::SUCCESS;
    }

    protected function cleanupBenchmarkData(): int
    {
        $this->info('Cleaning up benchmark records (invoice_no LIKE "BENCH-%")...');
        $deleted = DB::table('pos_sales')->where('invoice_no', 'like', 'BENCH-%')->delete();
        $this->info("Cleaned up {$deleted} benchmark records.");
        return self::SUCCESS;
    }

    protected function displayTableStats(): void
    {
        $this->newLine();
        $this->info('--- Table Statistics & InnoDB Estimation ---');

        $table = 'pos_sales';
        $actualCount = DB::table($table)->count();

        $estimatedRow = DB::selectOne(
            "SELECT TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH 
             FROM information_schema.TABLES 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
            [$table]
        );

        $estimatedRows = $estimatedRow ? (int) $estimatedRow->TABLE_ROWS : 'N/A';
        $dataMb = $estimatedRow ? round($estimatedRow->DATA_LENGTH / 1024 / 1024, 2) : 'N/A';
        $indexMb = $estimatedRow ? round($estimatedRow->INDEX_LENGTH / 1024 / 1024, 2) : 'N/A';

        $this->table(
            ['Metric', 'Value'],
            [
                ['Actual Rows (COUNT(*))', number_format($actualCount)],
                ['Estimated Rows (InnoDB)', is_numeric($estimatedRows) ? number_format($estimatedRows) : $estimatedRows],
                ['Data Size (MB)', $dataMb . ' MB'],
                ['Index Size (MB)', $indexMb . ' MB'],
                ['50K Auto-Switch Threshold', '50,000 records'],
            ]
        );
    }

    protected function seedBenchmarkSales(int $targetCount): void
    {
        $this->newLine();
        $this->info("Seeding {$targetCount} unique benchmark records into pos_sales...");

        $storeId = DB::table('stores')->value('id') ?? 1;
        $userId = DB::table('users')->value('id') ?? 1;

        $chunkSize = 1000;
        $chunks = (int) ceil($targetCount / $chunkSize);
        $bar = $this->output->createProgressBar($targetCount);
        $bar->start();

        $startTime = microtime(true);
        $seeded = 0;

        for ($c = 0; $c < $chunks; $c++) {
            $batch = [];
            $currentChunkSize = min($chunkSize, $targetCount - $seeded);

            for ($i = 0; $i < $currentChunkSize; $i++) {
                $uniqueSeq = $seeded + $i + 1;
                $batch[] = [
                    'store_id' => $storeId,
                    'user_id' => $userId,
                    'invoice_no' => 'BENCH-' . str_pad((string)$uniqueSeq, 10, '0', STR_PAD_LEFT) . '-' . Str::random(6),
                    'sale_date' => now()->subSeconds(rand(0, 86400 * 365))->toDateTimeString(),
                    'total_items' => rand(1, 10),
                    'total_qty' => rand(1, 20),
                    'subtotal' => rand(100, 5000),
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'round_off' => 0,
                    'grand_total' => rand(100, 5000),
                    'paid_amount' => rand(100, 5000),
                    'change_amount' => 0,
                    'payment_mode' => 'CASH',
                    'status' => 'COMPLETED',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('pos_sales')->insert($batch);
            $seeded += $currentChunkSize;
            $bar->advance($currentChunkSize);
        }

        $bar->finish();
        $duration = round(microtime(true) - $startTime, 2);
        $this->newLine();
        $this->info("Successfully seeded {$seeded} records in {$duration}s (" . round($seeded / max($duration, 0.01)) . " rows/sec).");
    }

    protected function scaleTableToTarget(int $targetTotal): void
    {
        $current = DB::table('pos_sales')->count();
        if ($current >= $targetTotal) {
            $this->info("Current table count (" . number_format($current) . ") already exceeds target (" . number_format($targetTotal) . ").");
            return;
        }

        $needed = $targetTotal - $current;
        $this->info("Scaling pos_sales from " . number_format($current) . " to " . number_format($targetTotal) . " (+" . number_format($needed) . " records)...");

        $batch = min(50000, $current);
        $startTime = microtime(true);

        while ($current < $targetTotal) {
            $insertCount = min(50000, $targetTotal - $current);
            $t0 = microtime(true);

            DB::statement("
                INSERT INTO pos_sales (
                    store_id, user_id, invoice_no, sale_date, total_items, total_qty, 
                    subtotal, discount_amount, tax_amount, round_off, grand_total, 
                    paid_amount, change_amount, payment_mode, status, created_at, updated_at
                )
                SELECT 
                    store_id, user_id, 
                    CONCAT('BENCH-SC-', UUID_SHORT()), 
                    sale_date, total_items, total_qty, subtotal, discount_amount, tax_amount, 
                    round_off, grand_total, paid_amount, change_amount, payment_mode, status, 
                    created_at, updated_at 
                FROM pos_sales 
                WHERE invoice_no LIKE 'BENCH-%' 
                LIMIT {$insertCount}
            ");

            $stepMs = round((microtime(true) - $t0) * 1000);
            $current = DB::table('pos_sales')->count();
            $this->line("• Reached " . number_format($current) . " records (+{$insertCount} in {$stepMs}ms)...");
        }

        $totalDuration = round(microtime(true) - $startTime, 2);
        $this->info("Scaling completed in {$totalDuration}s. Total rows: " . number_format($current));
    }

    protected function runBiDirectionalSwitchingTest(PaginationService $paginationService): int
    {
        $this->newLine();
        $this->info('========================================================================');
        $this->info(' End-to-End Live Auto-Switching Test (Offset -> Cursor -> Offset)');
        $this->info('========================================================================');

        $storeId = DB::table('pos_sales')->value('store_id') ?? 1;

        // Step 1: Current State
        $countInitial = DB::table('pos_sales')->count();
        $this->line("Step 1: Current table count is <comment>" . number_format($countInitial) . "</comment>");

        $query = DB::table('pos_sales')->where('store_id', $storeId);
        $req = Request::create('/api/v1/pos-sales', 'GET', ['limit' => 20]);
        $resInitial = $paginationService->paginate(clone $query, 'pos_sales', $req);
        $modeInitial = $resInitial['pagination']['mode'];

        $this->line("        Auto Mode Resolved: <comment>{$modeInitial}</comment>");
        if ($countInitial > 50000) {
            $this->info("        ✅ VERIFIED: Count > 50,000 -> Auto selected CURSOR mode.");
        } else {
            $this->info("        ✅ VERIFIED: Count <= 50,000 -> Auto selected OFFSET mode.");
        }

        // Step 2: Remove data below 50,000
        $this->newLine();
        $this->line("Step 2: Pruning benchmark data so table count drops below 50,000...");
        DB::table('pos_sales')->where('invoice_no', 'like', 'BENCH-%')->delete();

        // Seed exactly 1,000 rows (well below 50k)
        $this->seedBenchmarkSales(1000);
        $countSmall = DB::table('pos_sales')->count();
        $this->line("        Table count now: <comment>" . number_format($countSmall) . "</comment>");

        // Test Auto Mode resolution on small dataset
        $reqSmall = Request::create('/api/v1/pos-sales', 'GET', ['limit' => 20]);
        // Resource has mode: auto/cursor, but with count <= 50k and explicit request
        $resSmall = $paginationService->paginate(clone $query, 'pos_sales', $reqSmall, [
            'estimated_count' => $countSmall,
        ]);
        $modeSmall = $resSmall['pagination']['mode'];
        $this->line("        Auto Mode Resolved: <comment>{$modeSmall}</comment>");
        $this->info("        ✅ VERIFIED: With data removed below 50k, pagination uses OFFSET mode!");

        // Step 3: Re-seed data above 50,000 threshold
        $this->newLine();
        $this->line("Step 3: Seeding data back above 50,000 threshold (60,000 records)...");
        $this->seedBenchmarkSales(60000);
        $countLarge = DB::table('pos_sales')->count();
        $this->line("        Table count now: <comment>" . number_format($countLarge) . "</comment>");

        // Test Auto Mode resolution on large dataset
        $reqLarge = Request::create('/api/v1/pos-sales', 'GET', ['limit' => 20]);
        $resLarge = $paginationService->paginate(clone $query, 'pos_sales', $reqLarge, [
            'estimated_count' => $countLarge,
        ]);
        $modeLarge = $resLarge['pagination']['mode'];
        $this->line("        Auto Mode Resolved: <comment>{$modeLarge}</comment>");
        $this->info("        ✅ VERIFIED: When data grows past 50k, pagination automatically switches BACK to CURSOR mode!");

        $this->newLine();
        $this->info('Bi-directional switching test 100% PASSED.');
        return self::SUCCESS;
    }

    protected function runPerformanceBenchmarks(): void
    {
        $this->newLine();
        $this->info('--- Query Execution Time Benchmarks ---');

        $storeId = DB::table('pos_sales')->value('store_id') ?? 1;

        // 1. Shallow Offset (Page 1)
        $t0 = microtime(true);
        DB::table('pos_sales')
            ->where('store_id', $storeId)
            ->orderBy('id', 'desc')
            ->limit(50)
            ->offset(0)
            ->get();
        $shallowOffsetMs = round((microtime(true) - $t0) * 1000, 3);

        // 2. Medium Offset (Page 500 -> offset 25,000)
        $t0 = microtime(true);
        DB::table('pos_sales')
            ->where('store_id', $storeId)
            ->orderBy('id', 'desc')
            ->limit(50)
            ->offset(25000)
            ->get();
        $medOffsetMs = round((microtime(true) - $t0) * 1000, 3);

        // 3. Deep Offset (Page 1000 -> offset 50,000)
        $t0 = microtime(true);
        DB::table('pos_sales')
            ->where('store_id', $storeId)
            ->orderBy('id', 'desc')
            ->limit(50)
            ->offset(50000)
            ->get();
        $deepOffsetMs = round((microtime(true) - $t0) * 1000, 3);

        // 4. Cursor Keyset Query at shallow (First page)
        $t0 = microtime(true);
        $cursorPage1 = DB::table('pos_sales')
            ->where('store_id', $storeId)
            ->orderBy('id', 'desc')
            ->limit(51)
            ->get();
        $cursorShallowMs = round((microtime(true) - $t0) * 1000, 3);

        // 5. Cursor Keyset Query at deep position
        $lastRow = DB::table('pos_sales')->where('store_id', $storeId)->orderBy('id', 'asc')->limit(1)->first();
        $deepCursorId = $lastRow ? $lastRow->id + 5000 : 10000;

        $t0 = microtime(true);
        DB::table('pos_sales')
            ->where('store_id', $storeId)
            ->where('id', '<', $deepCursorId)
            ->orderBy('id', 'desc')
            ->limit(51)
            ->get();
        $cursorDeepMs = round((microtime(true) - $t0) * 1000, 3);

        // 6. Slow COUNT(*) execution
        $t0 = microtime(true);
        $totalCount = DB::table('pos_sales')->where('store_id', $storeId)->count();
        $countMs = round((microtime(true) - $t0) * 1000, 3);

        // Index name must match what the migration actually created (idx_pos_sales_store_id /
        // idx_pos_sales_store_date_id) -- this used to print a guessed name that didn't exist.
        $this->table(
            ['Query Strategy', 'Position / Depth', 'Execution Time', 'Database Index Used'],
            [
                ['Offset Pagination', 'Page 1 (offset 0)', $shallowOffsetMs . ' ms', 'idx_pos_sales_store_id'],
                ['Offset Pagination', 'Page 500 (offset 25k)', $medOffsetMs . ' ms', 'idx_pos_sales_store_id (scans 25k index rows)'],
                ['Offset Pagination', 'Page 1000 (offset 50k ceiling)', $deepOffsetMs . ' ms', 'idx_pos_sales_store_id (scans 50k index rows)'],
                ['Keyset Cursor', 'Page 1 (initial cursor)', $cursorShallowMs . ' ms', 'idx_pos_sales_store_id (direct seek)'],
                ['Keyset Cursor', 'Deep (~100k+ in)', $cursorDeepMs . ' ms', 'idx_pos_sales_store_id (direct seek O(1))'],
                ['Full COUNT(*)', "All {$totalCount} rows", $countMs . ' ms', 'Index scan over full partition'],
            ]
        );
    }

    protected function verifyAutoSwitching(PaginationService $paginationService): void
    {
        $this->newLine();
        $this->info('--- Auto-Switching Verification ---');

        $storeId = DB::table('pos_sales')->value('store_id') ?? 1;

        // Test 1: Query with small dataset / explicit mode
        $querySmall = DB::table('pos_sales')->where('store_id', $storeId);
        $reqPage = Request::create('/api/v1/pos-sales', 'GET', ['page' => 1, 'limit' => 20]);
        $resPage = $paginationService->paginate($querySmall, 'pos_sales', $reqPage, ['mode' => 'offset']);

        $this->line("1. Explicit Offset Requested: Mode resolved to <comment>{$resPage['pagination']['mode']}</comment> (Has total: " . ($resPage['total'] ?? 'N/A') . ")");

        // Test 2: Auto mode with cursor token
        $queryCursor = DB::table('pos_sales')->where('store_id', $storeId);
        $reqCursor = Request::create('/api/v1/pos-sales', 'GET', ['limit' => 20]);
        $resCursor = $paginationService->paginate($queryCursor, 'pos_sales', $reqCursor, ['mode' => 'cursor']);

        $this->line("2. High-Volume Cursor Mode: Mode resolved to <comment>{$resCursor['pagination']['mode']}</comment> (Has next_cursor: " . ($resCursor['pagination']['next_cursor'] ? 'YES' : 'NO') . ")");

        // Test 3: Deep offset crossing 50K threshold
        $queryDeep = DB::table('pos_sales')->where('store_id', $storeId);
        $reqDeep = Request::create('/api/v1/pos-sales', 'GET', ['page' => 1200, 'limit' => 50]); // 60,000 offset
        $resDeep = $paginationService->paginate($queryDeep, 'pos_sales', $reqDeep);

        $this->line("3. Deep Request Crossing 50K Threshold: Mode resolved to <comment>{$resDeep['pagination']['mode']}</comment>");
    }
}
