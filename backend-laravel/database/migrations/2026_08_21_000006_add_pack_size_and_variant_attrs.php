<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'pack_size')) {
                $table->integer('pack_size')->nullable()->after('selling_mode');
            }
        });

        Schema::table('product_variants', function (Blueprint $table) {
            if (!Schema::hasColumn('product_variants', 'brand_id')) {
                $table->unsignedBigInteger('brand_id')->nullable()->after('product_id');
            }
            if (!Schema::hasColumn('product_variants', 'color_id')) {
                $table->unsignedBigInteger('color_id')->nullable()->after('size_id');
            }
            if (!Schema::hasColumn('product_variants', 'design_no')) {
                $table->string('design_no')->nullable()->after('color_id');
            }
        });

        // Separate call: the unique index needs all three columns to already
        // exist, and SQLite/older MySQL can be picky about adding columns +
        // an index referencing them in the same ALTER.
        Schema::table('product_variants', function (Blueprint $table) {
            if (!$this->indexExists('product_variants', 'product_variants_variant_key_unique')) {
                $table->unique(
                    ['product_id', 'brand_id', 'size_id', 'color_id', 'design_no'],
                    'product_variants_variant_key_unique'
                );
            }
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            if ($this->indexExists('product_variants', 'product_variants_variant_key_unique')) {
                $table->dropUnique('product_variants_variant_key_unique');
            }
            if (Schema::hasColumn('product_variants', 'brand_id')) {
                $table->dropColumn('brand_id');
            }
            if (Schema::hasColumn('product_variants', 'color_id')) {
                $table->dropColumn('color_id');
            }
            if (Schema::hasColumn('product_variants', 'design_no')) {
                $table->dropColumn('design_no');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'pack_size')) {
                $table->dropColumn('pack_size');
            }
        });
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $rows = DB::select('SHOW INDEX FROM `' . $table . '` WHERE Key_name = ?', [$indexName]);

        return count($rows) > 0;
    }
};
