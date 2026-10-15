<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLES = [
        'brands', 'categories', 'attribute_types', 'attribute_values', 'taxes', 'tax_slabs',
        'suppliers', 'agents', 'transports', 'products', 'product_variants', 'customers',
        'hr_departments', 'hr_designations',
    ];

    public function up(): void
    {
        $onlyStore = DB::table('stores')->count() === 1 ? DB::table('stores')->value('id') : null;
        foreach (self::TABLES as $name) {
            // Existing company_id is a store ownership column in this legacy schema.
            if (! Schema::hasTable($name)) {
                continue;
            }
            $ownership = Schema::hasColumn($name, 'company_id') ? 'company_id' : 'store_id';
            if (! Schema::hasColumn($name, $ownership)) {
                Schema::table($name, function (Blueprint $table): void {
                    $table->unsignedBigInteger('store_id')->nullable()->index();
                });
            }
            // Only an unambiguous single-store installation can adopt old global masters.
            // Multi-store historical rows remain unassigned for explicit reconciliation.
            if ($onlyStore !== null) {
                DB::table($name)->whereNull($ownership)->update([$ownership => $onlyStore]);
            }
        }
    }

    public function down(): void
    {
        // Ownership assignments are business data. Use a forward migration to undo deliberately.
    }
};
