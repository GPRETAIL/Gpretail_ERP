<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add composite keyset indexes for remaining transaction tables to guarantee O(1)
     * seek performance and zero filesort under heavy multi-million row scale.
     */
    public function up(): void
    {
        // 1. customer_orders
        if (Schema::hasTable('customer_orders')) {
            Schema::table('customer_orders', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('customer_orders'))->pluck('name');
                if (!$indexes->contains('idx_customer_orders_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_customer_orders_store_id');
                }
                if (!$indexes->contains('idx_customer_orders_store_date_id')) {
                    $table->index(['store_id', 'order_date', 'id'], 'idx_customer_orders_store_date_id');
                }
            });
        }

        // 2. pos_returns
        if (Schema::hasTable('pos_returns')) {
            Schema::table('pos_returns', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('pos_returns'))->pluck('name');
                if (!$indexes->contains('idx_pos_returns_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_pos_returns_store_id');
                }
                if (!$indexes->contains('idx_pos_returns_store_date_id')) {
                    $table->index(['store_id', 'return_date', 'id'], 'idx_pos_returns_store_date_id');
                }
            });
        }

        // 3. purchase_returns
        if (Schema::hasTable('purchase_returns')) {
            Schema::table('purchase_returns', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('purchase_returns'))->pluck('name');
                if (!$indexes->contains('idx_purchase_returns_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_purchase_returns_store_id');
                }
                if (!$indexes->contains('idx_purchase_returns_store_date_id')) {
                    $table->index(['store_id', 'return_date', 'id'], 'idx_purchase_returns_store_date_id');
                }
            });
        }

        // 4. supplier_payments
        if (Schema::hasTable('supplier_payments')) {
            Schema::table('supplier_payments', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('supplier_payments'))->pluck('name');
                if (!$indexes->contains('idx_supplier_payments_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_supplier_payments_store_id');
                }
            });
        }

        // 5. stock_outwards
        if (Schema::hasTable('stock_outwards')) {
            Schema::table('stock_outwards', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('stock_outwards'))->pluck('name');
                if (!$indexes->contains('idx_stock_outwards_source_store_id')) {
                    $table->index(['source_store_id', 'id'], 'idx_stock_outwards_source_store_id');
                }
            });
        }

        // 6. cash_register_sessions
        if (Schema::hasTable('cash_register_sessions')) {
            Schema::table('cash_register_sessions', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('cash_register_sessions'))->pluck('name');
                if (!$indexes->contains('idx_cash_sessions_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_cash_sessions_store_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'customer_orders' => ['idx_customer_orders_store_id', 'idx_customer_orders_store_date_id'],
            'pos_returns' => ['idx_pos_returns_store_id', 'idx_pos_returns_store_date_id'],
            'purchase_returns' => ['idx_purchase_returns_store_id', 'idx_purchase_returns_store_date_id'],
            'supplier_payments' => ['idx_supplier_payments_store_id'],
            'stock_outwards' => ['idx_stock_outwards_source_store_id'],
            'cash_register_sessions' => ['idx_cash_sessions_store_id'],
        ];

        foreach ($tables as $table => $indexes) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $tableBlueprint) use ($table, $indexes) {
                    $existing = collect(Schema::getIndexes($table))->pluck('name');
                    foreach ($indexes as $idx) {
                        if ($existing->contains($idx)) {
                            $tableBlueprint->dropIndex($idx);
                        }
                    }
                });
            }
        }
    }
};
