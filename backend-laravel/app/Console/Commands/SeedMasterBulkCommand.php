<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Bulk-seeds the master-data tables (Brand, Tax, Supplier, Agent, Transport, Employee, Product) for
 * pagination/performance stress-testing at scale. MySQL/MariaDB only -- uses UUID_SHORT() for
 * per-row uniqueness, which SQLite (the CI test database) doesn't have, so this is deliberately
 * left untested like the existing pagination:benchmark command it mirrors.
 *
 * Strategy: insert a small varied batch via PHP first (so names/values actually differ), then
 * scale up to the target with fast in-database self-duplication (INSERT ... SELECT ... LIMIT),
 * regenerating each row's unique columns via UUID_SHORT() on the way -- millions of rows without
 * ever shipping row data back and forth over the PHP/DB connection.
 */
class SeedMasterBulkCommand extends Command
{
    protected $signature = 'master:seed-bulk
        {--count=1000000 : Target row count per table}
        {--only= : Comma-separated subset of tables (brands,taxes,suppliers,agents,transports,employees,products)}
        {--cleanup : Delete all seeded rows (code LIKE "SEED-%") instead of seeding}';

    protected $description = 'Bulk-seed unique stress-test data into master tables for pagination/performance testing.';

    private const TABLES = ['brands', 'taxes', 'suppliers', 'agents', 'transports', 'employees', 'products'];

    private const PREFIXES = [
        'brands' => 'SEED-BRD-',
        'taxes' => 'SEED-TAX-',
        'suppliers' => 'SEED-SUP-',
        'agents' => 'SEED-AGT-',
        'transports' => 'SEED-TRN-',
        'employees' => 'SEED-EMP-',
        'products' => 'SEED-PRD-',
    ];

    public function handle(): int
    {
        if (!in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            $this->error('This command relies on UUID_SHORT() and is MySQL/MariaDB-only.');
            return self::FAILURE;
        }

        if ($this->option('cleanup')) {
            return $this->cleanup();
        }

        $target = (int) $this->option('count');
        $onlyOpt = array_filter(array_map('trim', explode(',', (string) $this->option('only'))));
        $tables = $onlyOpt ? array_values(array_intersect(self::TABLES, $onlyOpt)) : self::TABLES;

        foreach ($tables as $table) {
            $this->seedTable($table, $target);
        }

        return self::SUCCESS;
    }

    private function cleanup(): int
    {
        foreach (self::TABLES as $table) {
            $prefix = self::PREFIXES[$table];
            $deleted = DB::table($table)->where('code', 'like', $prefix . '%')->delete();
            $this->info("{$table}: removed {$deleted} seeded rows.");
        }
        return self::SUCCESS;
    }

    private function seedTable(string $table, int $target): void
    {
        $prefix = self::PREFIXES[$table];
        $existing = DB::table($table)->where('code', 'like', $prefix . '%')->count();

        $this->newLine();
        $this->info("=== {$table} === (already have " . number_format($existing) . " seeded, target " . number_format($target) . ")");

        if ($existing >= $target) {
            $this->line('Already at or above target, skipping.');
            return;
        }

        $startTime = microtime(true);
        $bar = $this->output->createProgressBar($target);
        $bar->setProgress($existing);

        if ($existing === 0) {
            $initialBatch = min(5000, $target);
            $this->insertInitialBatch($table, $prefix, $initialBatch);
            $existing = $initialBatch;
            $bar->setProgress($existing);
        }

        while ($existing < $target) {
            $chunk = max(1, min($existing, $target - $existing, 50000));
            $this->duplicateChunk($table, $prefix, $chunk);
            $existing += $chunk;
            $bar->setProgress($existing);
        }

        $bar->finish();
        $this->newLine();
        $duration = round(microtime(true) - $startTime, 1);
        $this->info("{$table}: reached " . number_format($existing) . " seeded rows in {$duration}s.");
    }

    /** @return void */
    private function insertInitialBatch(string $table, string $prefix, int $count)
    {
        $method = 'batch' . ucfirst($table);
        $rows = $this->$method($prefix, $count);

        foreach (array_chunk($rows, 500) as $slice) {
            DB::table($table)->insert($slice);
        }
    }

    private function duplicateChunk(string $table, string $prefix, int $chunk): void
    {
        $sql = match ($table) {
            'brands' => "INSERT INTO brands (name, code, logo, description, is_active, created_at, updated_at)
                SELECT name, CONCAT(?, UUID_SHORT()), logo, description, is_active, NOW(), NOW()
                FROM brands WHERE code LIKE ? LIMIT {$chunk}",
            'taxes' => "INSERT INTO taxes (name, code, rate, type, cgst_rate, sgst_rate, igst_rate, is_active, created_at, updated_at)
                SELECT name, CONCAT(?, UUID_SHORT()), rate, type, cgst_rate, sgst_rate, igst_rate, is_active, NOW(), NOW()
                FROM taxes WHERE code LIKE ? LIMIT {$chunk}",
            'suppliers' => "INSERT INTO suppliers (name, company_name, code, email, phone, address, city, state, pincode, gstin, pan, opening_balance, current_balance, is_active, created_at, updated_at)
                SELECT name, company_name, CONCAT(?, UUID_SHORT()), email, phone, address, city, state, pincode, gstin, pan, opening_balance, current_balance, is_active, NOW(), NOW()
                FROM suppliers WHERE code LIKE ? LIMIT {$chunk}",
            'agents' => "INSERT INTO agents (name, code, email, phone, commission_rate, is_active, created_at, updated_at)
                SELECT name, CONCAT(?, UUID_SHORT()), email, phone, commission_rate, is_active, NOW(), NOW()
                FROM agents WHERE code LIKE ? LIMIT {$chunk}",
            'transports' => "INSERT INTO transports (name, code, phone, vehicle_no, contact_person, is_active, created_at, updated_at)
                SELECT name, CONCAT(?, UUID_SHORT()), phone, vehicle_no, contact_person, is_active, NOW(), NOW()
                FROM transports WHERE code LIKE ? LIMIT {$chunk}",
            'employees' => "INSERT INTO employees (store_id, department_id, designation_id, name, code, email, phone, address, salary, joining_date, is_active, created_at, updated_at)
                SELECT store_id, department_id, designation_id, name, CONCAT(?, UUID_SHORT()), email, phone, address, salary, joining_date, is_active, NOW(), NOW()
                FROM employees WHERE code LIKE ? LIMIT {$chunk}",
            'products' => "INSERT INTO products (category_id, brand_id, tax_id, size_group_id, name, code, sku, barcode, hsn_code, unit, cost_price, selling_price, mrp, min_stock, max_stock, description, image, is_active, created_at, updated_at)
                SELECT category_id, brand_id, tax_id, size_group_id, name, CONCAT(?, UUID_SHORT()), CONCAT('SEED-SKU-', UUID_SHORT()), CONCAT('SEED-BC-', UUID_SHORT()), hsn_code, unit, cost_price, selling_price, mrp, min_stock, max_stock, description, image, is_active, NOW(), NOW()
                FROM products WHERE code LIKE ? LIMIT {$chunk}",
        };

        DB::statement($sql, [$prefix, $prefix . '%']);
    }

    private function code(string $prefix, int $i): string
    {
        return $prefix . str_pad((string) $i, 7, '0', STR_PAD_LEFT);
    }

    private function batchBrands(string $prefix, int $count): array
    {
        $words1 = ['Apex', 'Nova', 'Zenith', 'Crown', 'Prime', 'Stellar', 'Global', 'Metro', 'Union', 'Pinnacle', 'Orbit', 'Vertex', 'Everest', 'Falcon', 'Horizon'];
        $words2 = ['Traders', 'Retail', 'Industries', 'Enterprises', 'Mart', 'Group', 'Corp', 'Distributors', 'Wholesale', 'Brands'];
        $rows = [];
        for ($i = 1; $i <= $count; $i++) {
            $name = $words1[$i % count($words1)] . ' ' . $words2[intdiv($i, count($words1)) % count($words2)];
            $rows[] = [
                'name' => $name,
                'code' => $this->code($prefix, $i),
                'logo' => null,
                'description' => null,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        return $rows;
    }

    private function batchTaxes(string $prefix, int $count): array
    {
        $rates = [0, 5, 12, 18, 28];
        $types = ['EXCLUSIVE', 'INCLUSIVE'];
        $rows = [];
        for ($i = 1; $i <= $count; $i++) {
            $rate = $rates[$i % count($rates)];
            $rows[] = [
                'name' => "GST {$rate}%",
                'code' => $this->code($prefix, $i),
                'rate' => $rate,
                'type' => $types[$i % count($types)],
                'cgst_rate' => round($rate / 2, 2),
                'sgst_rate' => round($rate / 2, 2),
                'igst_rate' => $rate,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        return $rows;
    }

    private function batchSuppliers(string $prefix, int $count): array
    {
        $names = ['Sri Lakshmi', 'Sai Ram', 'Balaji', 'Annapurna', 'Ganesh', 'Shree', 'Krishna', 'Vinayaga', 'Murugan', 'Amman'];
        $suffixes = ['Traders', 'Agencies', 'Enterprises', 'Distributors', 'Wholesale'];
        $cities = [['Chennai', 'Tamil Nadu', '600001'], ['Bengaluru', 'Karnataka', '560001'], ['Coimbatore', 'Tamil Nadu', '641001'], ['Hyderabad', 'Telangana', '500001'], ['Mumbai', 'Maharashtra', '400001']];
        $rows = [];
        for ($i = 1; $i <= $count; $i++) {
            $name = $names[$i % count($names)] . ' ' . $suffixes[intdiv($i, count($names)) % count($suffixes)];
            [$city, $state, $pincode] = $cities[$i % count($cities)];
            $rows[] = [
                'name' => $name,
                'company_name' => $name . ' Pvt Ltd',
                'code' => $this->code($prefix, $i),
                'email' => 'supplier' . $i . '@example.com',
                'phone' => '9' . str_pad((string) (100000000 + $i), 9, '0', STR_PAD_LEFT),
                'address' => "{$i}, Main Road",
                'city' => $city,
                'state' => $state,
                'pincode' => $pincode,
                'gstin' => null,
                'pan' => null,
                'opening_balance' => 0,
                'current_balance' => 0,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        return $rows;
    }

    private function batchAgents(string $prefix, int $count): array
    {
        $first = ['Arun', 'Bala', 'Chitra', 'Deepa', 'Elango', 'Farida', 'Gopal', 'Hema', 'Iniya', 'Jaya'];
        $last = ['Kumar', 'Raj', 'Priya', 'Suresh', 'Devi', 'Nathan', 'Murthy', 'Sekar', 'Rani', 'Vel'];
        $rows = [];
        for ($i = 1; $i <= $count; $i++) {
            $name = $first[$i % count($first)] . ' ' . $last[intdiv($i, count($first)) % count($last)];
            $rows[] = [
                'name' => $name,
                'code' => $this->code($prefix, $i),
                'email' => 'agent' . $i . '@example.com',
                'phone' => '9' . str_pad((string) (200000000 + $i), 9, '0', STR_PAD_LEFT),
                'commission_rate' => round(fmod($i, 10) + 1, 2),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        return $rows;
    }

    private function batchTransports(string $prefix, int $count): array
    {
        $names = ['Speed', 'Reliable', 'Swift', 'Safe', 'National', 'Express', 'City', 'Royal', 'Star', 'Om'];
        $suffixes = ['Logistics', 'Cargo', 'Transport', 'Movers', 'Carriers'];
        $rows = [];
        for ($i = 1; $i <= $count; $i++) {
            $name = $names[$i % count($names)] . ' ' . $suffixes[intdiv($i, count($names)) % count($suffixes)];
            $rows[] = [
                'name' => $name,
                'code' => $this->code($prefix, $i),
                'phone' => '9' . str_pad((string) (300000000 + $i), 9, '0', STR_PAD_LEFT),
                'vehicle_no' => 'TN' . str_pad((string) (($i % 99) + 1), 2, '0', STR_PAD_LEFT) . 'AB' . str_pad((string) $i, 4, '0', STR_PAD_LEFT),
                'contact_person' => $names[($i + 3) % count($names)],
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        return $rows;
    }

    private function batchEmployees(string $prefix, int $count): array
    {
        $first = ['Arjun', 'Bhavani', 'Chandra', 'Divya', 'Eswar', 'Fathima', 'Ganesh', 'Harini', 'Ilamathi', 'Jeeva'];
        $last = ['Kumar', 'Raj', 'Priya', 'Suresh', 'Devi', 'Nathan', 'Murthy', 'Sekar', 'Rani', 'Vel'];
        $rows = [];
        for ($i = 1; $i <= $count; $i++) {
            $name = $first[$i % count($first)] . ' ' . $last[intdiv($i, count($first)) % count($last)];
            $rows[] = [
                'store_id' => null,
                'department_id' => null,
                'designation_id' => null,
                'name' => $name,
                'code' => $this->code($prefix, $i),
                'email' => 'employee' . $i . '@example.com',
                'phone' => '9' . str_pad((string) (400000000 + $i), 9, '0', STR_PAD_LEFT),
                'address' => "{$i}, Staff Colony",
                'salary' => 15000 + ($i % 50) * 1000,
                'joining_date' => now()->subDays($i % 3650)->toDateString(),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        return $rows;
    }

    private function batchProducts(string $prefix, int $count): array
    {
        $adjectives = ['Premium', 'Classic', 'Deluxe', 'Standard', 'Economy', 'Super', 'Royal', 'Fresh', 'Pure', 'Original'];
        $nouns = ['Rice', 'Oil', 'Soap', 'Biscuit', 'Milk', 'Sugar', 'Salt', 'Tea', 'Coffee', 'Detergent', 'Shampoo', 'Toothpaste', 'Noodles', 'Juice', 'Snacks'];
        $units = ['PCS', 'KG', 'LTR', 'BOX', 'PKT'];
        $rows = [];
        for ($i = 1; $i <= $count; $i++) {
            $name = $adjectives[$i % count($adjectives)] . ' ' . $nouns[intdiv($i, count($adjectives)) % count($nouns)];
            $cost = 10 + ($i % 500);
            $rows[] = [
                'category_id' => null,
                'brand_id' => null,
                'tax_id' => null,
                'size_group_id' => null,
                'name' => $name,
                'code' => $this->code($prefix, $i),
                'sku' => 'SEED-SKU-' . str_pad((string) $i, 7, '0', STR_PAD_LEFT),
                'barcode' => 'SEED-BC-' . str_pad((string) $i, 7, '0', STR_PAD_LEFT),
                'hsn_code' => null,
                'unit' => $units[$i % count($units)],
                'cost_price' => $cost,
                'selling_price' => round($cost * 1.2, 2),
                'mrp' => round($cost * 1.35, 2),
                'min_stock' => 0,
                'max_stock' => 1000,
                'description' => null,
                'image' => null,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        return $rows;
    }
}
