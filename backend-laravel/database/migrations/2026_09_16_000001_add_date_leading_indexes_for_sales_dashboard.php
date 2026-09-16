<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * pos_sales/pos_returns already have (store_id, date, id) composite indexes
     * (see 2026_09_11_000002_add_remaining_keyset_indexes.php), which MySQL/MariaDB
     * can't use for a pure date-range scan when store_id is unconstrained -- exactly
     * the case for the Sales dashboard tab's "All Stores" consolidated view (a
     * super_admin viewing every store at once). Without a date-leading index, that
     * view falls back to a full table scan (measured ~9s at pos_sales' current
     * 2.2M rows). These are additive, date-leading siblings of the existing
     * indexes -- store-scoped queries keep using the existing ones.
     */
    public function up(): void
    {
        if (Schema::hasTable('pos_sales')) {
            Schema::table('pos_sales', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('pos_sales'))->pluck('name');
                if (!$indexes->contains('idx_pos_sales_date_store_id')) {
                    $table->index(['sale_date', 'store_id', 'id'], 'idx_pos_sales_date_store_id');
                }
            });
        }

        if (Schema::hasTable('pos_returns')) {
            Schema::table('pos_returns', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('pos_returns'))->pluck('name');
                if (!$indexes->contains('idx_pos_returns_date_store_id')) {
                    $table->index(['return_date', 'store_id', 'id'], 'idx_pos_returns_date_store_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('pos_sales')) {
            Schema::table('pos_sales', function (Blueprint $table) {
                $existing = collect(Schema::getIndexes('pos_sales'))->pluck('name');
                if ($existing->contains('idx_pos_sales_date_store_id')) {
                    $table->dropIndex('idx_pos_sales_date_store_id');
                }
            });
        }

        if (Schema::hasTable('pos_returns')) {
            Schema::table('pos_returns', function (Blueprint $table) {
                $existing = collect(Schema::getIndexes('pos_returns'))->pluck('name');
                if ($existing->contains('idx_pos_returns_date_store_id')) {
                    $table->dropIndex('idx_pos_returns_date_store_id');
                }
            });
        }
    }
};
