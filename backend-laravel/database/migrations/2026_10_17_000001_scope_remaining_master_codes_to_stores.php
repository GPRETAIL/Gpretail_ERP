<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remaining store-owned master tables whose `code` (and `sku` on products)
     * previously had global unique indexes instead of per-store composite uniqueness.
     */
    private const TABLE_OWNERSHIP = [
        'taxes' => 'store_id',
        'attribute_types' => 'store_id',
        'size_groups' => 'company_id',
        'products' => 'company_id',
    ];

    public function up(): void
    {
        $onlyStore = DB::table('stores')->count() === 1 ? DB::table('stores')->value('id') : null;

        foreach (self::TABLE_OWNERSHIP as $name => $ownerCol) {
            if (! Schema::hasTable($name) || ! Schema::hasColumn($name, $ownerCol)) {
                continue;
            }
            if ($onlyStore !== null) {
                DB::table($name)->whereNull($ownerCol)->update([$ownerCol => $onlyStore]);
            }
            if (DB::table($name)->select($ownerCol, 'code')->whereNotNull('code')->groupBy($ownerCol, 'code')->havingRaw('COUNT(*) > 1')->exists()) {
                throw new RuntimeException("Resolve duplicate {$name} codes within each store before migrating.");
            }
        }

        foreach (self::TABLE_OWNERSHIP as $name => $ownerCol) {
            if (! Schema::hasTable($name) || ! Schema::hasColumn($name, $ownerCol)) {
                continue;
            }
            $compositeIndex = "{$name}_{$ownerCol}_code_unique";
            $globalIndex = "{$name}_code_unique";

            if (! Schema::hasIndex($name, $compositeIndex)) {
                Schema::table($name, function (Blueprint $table) use ($ownerCol, $compositeIndex): void {
                    $table->unique([$ownerCol, 'code'], $compositeIndex);
                });
            }
            if (Schema::hasIndex($name, $globalIndex)) {
                Schema::table($name, function (Blueprint $table): void {
                    $table->dropUnique(['code']);
                });
            }
        }

        if (Schema::hasTable('products') && Schema::hasColumn('products', 'company_id')) {
            if (! Schema::hasIndex('products', 'products_company_id_sku_unique')) {
                Schema::table('products', function (Blueprint $table): void {
                    $table->unique(['company_id', 'sku'], 'products_company_id_sku_unique');
                });
            }
            if (Schema::hasIndex('products', 'products_sku_unique')) {
                Schema::table('products', function (Blueprint $table): void {
                    $table->dropUnique(['sku']);
                });
            }
        }
    }

    public function down(): void
    {
        foreach (self::TABLE_OWNERSHIP as $name => $ownerCol) {
            if (! Schema::hasTable($name)) {
                continue;
            }
            if (DB::table($name)->select('code')->whereNotNull('code')->groupBy('code')->havingRaw('COUNT(*) > 1')->exists()) {
                throw new RuntimeException("Cannot restore global {$name} code uniqueness while stores share codes.");
            }
        }

        foreach (self::TABLE_OWNERSHIP as $name => $ownerCol) {
            if (! Schema::hasTable($name)) {
                continue;
            }
            $compositeIndex = "{$name}_{$ownerCol}_code_unique";
            $globalIndex = "{$name}_code_unique";

            if (! Schema::hasIndex($name, $globalIndex)) {
                Schema::table($name, function (Blueprint $table): void {
                    $table->unique('code');
                });
            }
            if (Schema::hasIndex($name, $compositeIndex)) {
                Schema::table($name, function (Blueprint $table) use ($compositeIndex): void {
                    $table->dropUnique($compositeIndex);
                });
            }
        }

        if (Schema::hasTable('products')) {
            if (! Schema::hasIndex('products', 'products_sku_unique')) {
                Schema::table('products', function (Blueprint $table): void {
                    $table->unique('sku');
                });
            }
            if (Schema::hasIndex('products', 'products_company_id_sku_unique')) {
                Schema::table('products', function (Blueprint $table): void {
                    $table->dropUnique('products_company_id_sku_unique');
                });
            }
        }
    }
};
