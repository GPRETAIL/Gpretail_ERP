<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add composite keyset indexes for high-volume transaction tables to ensure
     * deterministic, zero-offset traversal without filesort.
     */
    public function up(): void
    {
        // 1. pos_sales
        if (Schema::hasTable('pos_sales')) {
            Schema::table('pos_sales', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('pos_sales'))->pluck('name');

                if (!$indexes->contains('idx_pos_sales_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_pos_sales_store_id');
                }
                if (!$indexes->contains('idx_pos_sales_store_date_id')) {
                    $table->index(['store_id', 'sale_date', 'id'], 'idx_pos_sales_store_date_id');
                }
            });
        }

        // 2. direct_purchases
        if (Schema::hasTable('direct_purchases')) {
            Schema::table('direct_purchases', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('direct_purchases'))->pluck('name');

                if (!$indexes->contains('idx_direct_purchases_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_direct_purchases_store_id');
                }
                if (!$indexes->contains('idx_direct_purchases_company_id_id')) {
                    $table->index(['company_id', 'id'], 'idx_direct_purchases_company_id_id');
                }
            });
        }

        // 3. stock_transactions
        if (Schema::hasTable('stock_transactions')) {
            Schema::table('stock_transactions', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('stock_transactions'))->pluck('name');

                if (!$indexes->contains('idx_stock_trans_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_stock_trans_store_id');
                }
                if (!$indexes->contains('idx_stock_trans_store_created_id')) {
                    $table->index(['store_id', 'created_at', 'id'], 'idx_stock_trans_store_created_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pos_sales')) {
            Schema::table('pos_sales', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('pos_sales'))->pluck('name');
                if ($indexes->contains('idx_pos_sales_store_id')) {
                    $table->dropIndex('idx_pos_sales_store_id');
                }
                if ($indexes->contains('idx_pos_sales_store_date_id')) {
                    $table->dropIndex('idx_pos_sales_store_date_id');
                }
            });
        }

        if (Schema::hasTable('direct_purchases')) {
            Schema::table('direct_purchases', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('direct_purchases'))->pluck('name');
                if ($indexes->contains('idx_direct_purchases_store_id')) {
                    $table->dropIndex('idx_direct_purchases_store_id');
                }
                if ($indexes->contains('idx_direct_purchases_company_id_id')) {
                    $table->dropIndex('idx_direct_purchases_company_id_id');
                }
            });
        }

        if (Schema::hasTable('stock_transactions')) {
            Schema::table('stock_transactions', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('stock_transactions'))->pluck('name');
                if ($indexes->contains('idx_stock_trans_store_id')) {
                    $table->dropIndex('idx_stock_trans_store_id');
                }
                if ($indexes->contains('idx_stock_trans_store_created_id')) {
                    $table->dropIndex('idx_stock_trans_store_created_id');
                }
            });
        }
    }
};
