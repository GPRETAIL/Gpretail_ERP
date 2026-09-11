<?php

namespace App\Console\Commands;

use App\Services\PaginationService;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BenchmarkAppWideCommand extends Command
{
    protected $signature = 'pagination:audit-app
                            {--seed-dump : Populate dump records across Master and Transaction tables}
                            {--audit : Audit and profile query times across all modules}
                            {--cleanup : Remove all seeded benchmark records across all tables}';

    protected $description = 'App-wide test for master & transaction modules: query times, auto-switching, and EXPLAIN plans.';

    public function handle(PaginationService $paginationService): int
    {
        $this->info('===========================================================');
        $this->info(' GPRETAIL ERP — App-Wide Pagination & Performance Audit');
        $this->info('===========================================================');

        $database = DB::connection()->getDatabaseName();
        $this->line("Database: <comment>{$database}</comment>");

        if ($this->option('cleanup')) {
            return $this->cleanupAllBenchmarkData();
        }

        if ($this->option('seed-dump')) {
            $this->seedAllDumpData();
        }

        $this->runAppWideAudit($paginationService);

        return self::SUCCESS;
    }

    protected function cleanupAllBenchmarkData(): int
    {
        $this->info('Cleaning up benchmark records across all tables...');

        $tables = [
            'pos_sales' => 'invoice_no',
            'pos_returns' => 'return_no',
            'purchase_returns' => 'return_no',
            'direct_purchases' => 'purchase_no',
            'customer_orders' => 'order_no',
            'products' => 'code',
            'customers' => 'code',
            'suppliers' => 'code',
            'brands' => 'code',
            'categories' => 'code',
            'cash_register_sessions' => 'notes',
        ];

        foreach ($tables as $table => $col) {
            try {
                $count = DB::table($table)->where($col, 'like', 'BENCH-%')->delete();
                if ($count > 0) {
                    $this->line("• Cleaned {$count} records from <comment>{$table}</comment>");
                }
            } catch (\Throwable $e) {
                // Ignore if table or col doesn't exist
            }
        }

        $this->info('Cleanup completed.');
        return self::SUCCESS;
    }

    protected function seedAllDumpData(): void
    {
        $this->info('--- Seeding Unique Dump Data Across Master & Transaction Modules ---');

        $storeId = DB::table('stores')->value('id') ?? DB::table('stores')->insertGetId([
            'code' => 'STORE-001',
            'name' => 'Main Test Store',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $userId = DB::table('users')->value('id') ?? DB::table('users')->insertGetId([
            'store_id' => $storeId,
            'name' => 'Admin Test',
            'email' => 'admin_test@gpretail.com',
            'password' => bcrypt('secret'),
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 1. Brands (2,000 rows)
        $this->seedTable('brands', 2000, function ($i) {
            return [
                'name' => "Brand {$i}",
                'code' => "BENCH-BRD-{$i}-" . Str::random(4),
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        // 2. Categories (2,000 rows)
        $this->seedTable('categories', 2000, function ($i) {
            return [
                'name' => "Category {$i}",
                'code' => "BENCH-CAT-{$i}-" . Str::random(4),
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        // 3. Suppliers (2,000 rows)
        $this->seedTable('suppliers', 2000, function ($i) {
            return [
                'name' => "Supplier {$i}",
                'company_name' => "Company {$i} Pvt Ltd",
                'code' => "BENCH-SUP-{$i}-" . Str::random(4),
                'phone' => '9876' . str_pad((string)$i, 6, '0', STR_PAD_LEFT),
                'email' => "supplier{$i}@bench.com",
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        // 4. Customers (5,000 rows)
        $this->seedTable('customers', 5000, function ($i) {
            return [
                'name' => "Customer {$i}",
                'code' => "BENCH-CUST-{$i}-" . Str::random(4),
                'phone' => '9988' . str_pad((string)$i, 6, '0', STR_PAD_LEFT),
                'email' => "cust{$i}@bench.com",
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        // 5. Products (5,000 rows)
        $brandId = DB::table('brands')->value('id');
        $catId = DB::table('categories')->value('id');
        $this->seedTable('products', 5000, function ($i) use ($brandId, $catId) {
            return [
                'brand_id' => $brandId,
                'category_id' => $catId,
                'name' => "Product Item {$i}",
                'code' => "BENCH-PROD-{$i}-" . Str::random(4),
                'barcode' => "890" . str_pad((string)$i, 9, '0', STR_PAD_LEFT),
                'selling_price' => rand(50, 2000),
                'cost_price' => rand(30, 1500),
                'mrp' => rand(60, 2500),
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        // 6. Direct Purchases (5,000 rows)
        $supplierId = DB::table('suppliers')->value('id');
        $this->seedTable('direct_purchases', 5000, function ($i) use ($storeId, $supplierId) {
            return [
                'store_id' => $storeId,
                'company_id' => $storeId,
                'supplier_id' => $supplierId,
                'purchase_no' => "BENCH-PUR-{$i}-" . Str::random(4),
                'invoice_no' => "INV-SUP-{$i}",
                'purchase_date' => now()->subMinutes($i)->toDateString(),
                'total_amount' => rand(1000, 50000),
                'paid_amount' => rand(500, 50000),
                'status' => 'COMPLETED',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        // 7. Customer Orders (5,000 rows)
        $customerId = DB::table('customers')->value('id');
        $this->seedTable('customer_orders', 5000, function ($i) use ($storeId, $customerId) {
            return [
                'store_id' => $storeId,
                'customer_id' => $customerId,
                'order_no' => "BENCH-ORD-{$i}-" . Str::random(4),
                'order_date' => now()->subMinutes($i)->toDateString(),
                'total_amount' => rand(200, 10000),
                'status' => 'COMPLETED',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        // 8. POS Returns (5,000 rows)
        $saleId = DB::table('pos_sales')->value('id');
        $this->seedTable('pos_returns', 5000, function ($i) use ($storeId, $userId, $saleId) {
            return [
                'store_id' => $storeId,
                'created_by' => $userId,
                'pos_sale_id' => $saleId,
                'return_no' => "BENCH-RET-{$i}-" . Str::random(4),
                'return_date' => now()->subMinutes($i)->toDateString(),
                'total_refund' => rand(50, 1000),
                'status' => 'COMPLETED',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        // 9. Purchase Returns (5,000 rows)
        $this->seedTable('purchase_returns', 5000, function ($i) use ($storeId, $userId, $supplierId) {
            return [
                'store_id' => $storeId,
                'supplier_id' => $supplierId,
                'created_by' => $userId,
                'return_no' => "BENCH-PRET-{$i}-" . Str::random(4),
                'return_date' => now()->subMinutes($i)->toDateString(),
                'total_amount' => rand(500, 5000),
                'status' => 'COMPLETED',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        // 10. Cash Register Sessions (1,000 rows)
        $this->seedTable('cash_register_sessions', 1000, function ($i) use ($storeId, $userId) {
            return [
                'store_id' => $storeId,
                'user_id' => $userId,
                'opened_at' => now()->subDays($i)->toDateTimeString(),
                'closed_at' => now()->subDays($i)->addHours(8)->toDateTimeString(),
                'opening_cash' => 1000,
                'closing_cash' => rand(5000, 25000),
                'status' => 'CLOSED',
                'notes' => "BENCH-SESSION-{$i}",
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });
    }

    protected function seedTable(string $table, int $count, callable $rowFactory): void
    {
        $existing = DB::table($table)->count();
        $this->line("• Seeding {$count} records into <comment>{$table}</comment> (Current count: {$existing})...");

        $chunkSize = 1000;
        $chunks = (int) ceil($count / $chunkSize);

        for ($c = 0; $c < $chunks; $c++) {
            $batch = [];
            $currentChunk = min($chunkSize, $count - ($c * $chunkSize));
            for ($i = 0; $i < $currentChunk; $i++) {
                $batch[] = $rowFactory(($c * $chunkSize) + $i + 1);
            }
            DB::table($table)->insert($batch);
        }
    }

    protected function runAppWideAudit(PaginationService $paginationService): void
    {
        $this->newLine();
        $this->info('--- Auditing All Modules: Query Performance, Auto-Switching, & EXPLAIN ---');

        $modules = [
            // Master Data
            ['resource' => 'products', 'table' => 'products', 'category' => 'Master Data', 'scoped_col' => null],
            ['resource' => 'customers', 'table' => 'customers', 'category' => 'Master Data', 'scoped_col' => null],
            ['resource' => 'suppliers', 'table' => 'suppliers', 'category' => 'Master Data', 'scoped_col' => null],
            ['resource' => 'brands', 'table' => 'brands', 'category' => 'Master Data', 'scoped_col' => null],
            ['resource' => 'categories', 'table' => 'categories', 'category' => 'Master Data', 'scoped_col' => null],
            ['resource' => 'employees', 'table' => 'employees', 'category' => 'Master Data', 'scoped_col' => null],

            // Transaction Data
            ['resource' => 'pos_sales', 'table' => 'pos_sales', 'category' => 'Transactions', 'scoped_col' => 'store_id'],
            ['resource' => 'direct_purchases', 'table' => 'direct_purchases', 'category' => 'Transactions', 'scoped_col' => 'store_id'],
            ['resource' => 'customer_orders', 'table' => 'customer_orders', 'category' => 'Transactions', 'scoped_col' => 'store_id'],
            ['resource' => 'pos_returns', 'table' => 'pos_returns', 'category' => 'Transactions', 'scoped_col' => 'store_id'],
            ['resource' => 'purchase_returns', 'table' => 'purchase_returns', 'category' => 'Transactions', 'scoped_col' => 'store_id'],
            ['resource' => 'cash_register_sessions', 'table' => 'cash_register_sessions', 'category' => 'Transactions', 'scoped_col' => 'store_id'],
        ];

        $results = [];

        foreach ($modules as $mod) {
            $table = $mod['table'];
            $resource = $mod['resource'];
            $scopedCol = $mod['scoped_col'];

            $rowCount = DB::table($table)->count();

            $query = DB::table($table);
            if ($scopedCol) {
                $storeId = DB::table($table)->value($scopedCol) ?? 1;
                $query->where($scopedCol, $storeId);
            }

            // 1. Measure Offset Page 1
            $reqOffset = Request::create("/api/{$resource}", 'GET', ['page' => 1, 'limit' => 20]);
            $t0 = microtime(true);
            $resOffset = $paginationService->paginate(clone $query, $resource, $reqOffset, ['mode' => 'offset']);
            $offsetMs = round((microtime(true) - $t0) * 1000, 2);

            // 2. Measure Cursor Navigation
            $reqCursor = Request::create("/api/{$resource}", 'GET', ['limit' => 20]);
            $t0 = microtime(true);
            $resCursor = $paginationService->paginate(clone $query, $resource, $reqCursor, ['mode' => 'cursor']);
            $cursorMs = round((microtime(true) - $t0) * 1000, 2);

            // 3. Measure AUTO mode resolution
            $reqAuto = Request::create("/api/{$resource}", 'GET', ['limit' => 20]);
            $resAuto = $paginationService->paginate(clone $query, $resource, $reqAuto);
            $autoMode = $resAuto['pagination']['mode'];

            // 4. EXPLAIN query check
            $explainSql = "EXPLAIN SELECT * FROM {$table} " . ($scopedCol ? "WHERE {$scopedCol} = 1 " : "") . "ORDER BY id DESC LIMIT 20";
            try {
                $explainRows = DB::select($explainSql);
                $keyUsed = $explainRows[0]->key ?? 'NONE';
                $extra = $explainRows[0]->Extra ?? '';
                $hasFilesort = str_contains($extra, 'Using filesort') ? 'YES ⚠️' : 'NO ✅';
            } catch (\Throwable $e) {
                $keyUsed = 'ERROR';
                $hasFilesort = 'N/A';
            }

            $status = ($offsetMs < 50 && $cursorMs < 20) ? '🟢 FAST' : '🟡 OK';

            $results[] = [
                $mod['category'],
                $resource,
                number_format($rowCount),
                $autoMode,
                $offsetMs . ' ms',
                $cursorMs . ' ms',
                $keyUsed,
                $hasFilesort,
                $status,
            ];
        }

        $this->table(
            ['Type', 'Module', 'Rows', 'Auto Mode', 'Offset P1', 'Cursor', 'Index Used', 'Filesort?', 'Status'],
            $results
        );
    }
}
