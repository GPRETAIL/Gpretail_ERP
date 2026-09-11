<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * config/pagination.php declares cursor mode for 21 resources; the two prior keyset-index
     * migrations only covered 9 of them. Most of the rest turned out not to need a new index at
     * all -- pos_old_sales shares pos_sales' table (already indexed), and transport_entries,
     * barcodes, physical_stocks and sales_approvals are never scoped by store_id in their
     * controllers, so their existing primary-key index is already sufficient for a keyset
     * `WHERE id < ? ORDER BY id DESC` query. invoices, audit_logs and attendance aren't
     * referenced by any controller's paginate() call at all (dead config entries).
     *
     * That leaves exactly three real gaps: purchase_invoices, inventory_entries, and
     * dealer_invoices are all store-scoped (`->where('store_id', ...)`) and cursor-paginated
     * with no supporting index, so every page was a full table scan + filesort.
     */
    public function up(): void
    {
        if (Schema::hasTable('purchase_invoices')) {
            Schema::table('purchase_invoices', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('purchase_invoices'))->pluck('name');

                if (!$indexes->contains('idx_purchase_invoices_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_purchase_invoices_store_id');
                }
                if (!$indexes->contains('idx_purchase_invoices_store_date_id')) {
                    $table->index(['store_id', 'invoice_date', 'id'], 'idx_purchase_invoices_store_date_id');
                }
            });
        }

        if (Schema::hasTable('inventory_entries')) {
            Schema::table('inventory_entries', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('inventory_entries'))->pluck('name');

                if (!$indexes->contains('idx_inventory_entries_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_inventory_entries_store_id');
                }
                if (!$indexes->contains('idx_inventory_entries_store_date_id')) {
                    $table->index(['store_id', 'entry_date', 'id'], 'idx_inventory_entries_store_date_id');
                }
            });
        }

        if (Schema::hasTable('dealer_invoices')) {
            Schema::table('dealer_invoices', function (Blueprint $table) {
                $indexes = collect(Schema::getIndexes('dealer_invoices'))->pluck('name');

                if (!$indexes->contains('idx_dealer_invoices_store_id')) {
                    $table->index(['store_id', 'id'], 'idx_dealer_invoices_store_id');
                }
                if (!$indexes->contains('idx_dealer_invoices_store_date_id')) {
                    $table->index(['store_id', 'invoice_date', 'id'], 'idx_dealer_invoices_store_date_id');
                }
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'purchase_invoices' => ['idx_purchase_invoices_store_id', 'idx_purchase_invoices_store_date_id'],
            'inventory_entries' => ['idx_inventory_entries_store_id', 'idx_inventory_entries_store_date_id'],
            'dealer_invoices'   => ['idx_dealer_invoices_store_id', 'idx_dealer_invoices_store_date_id'],
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
