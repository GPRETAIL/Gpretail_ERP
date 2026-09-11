<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Same rationale as 2026_09_11_000004/000005, extended from the 7 master pages to the
     * sales/CRM/warehouse pages that just gained server-side Group By (config('pagination.resources.
     * {resource}.groupable_columns')). Only columns that GroupAggregationService now groups by and
     * that don't already have an index (most FK columns already do via foreignId()->constrained()).
     */
    private function tableIndexes(): array
    {
        return [
            'customers' => [
                'idx_customers_customer_type' => ['customer_type'],
                'idx_customers_gender' => ['gender'],
                'idx_customers_supply_type' => ['supply_type'],
                'idx_customers_city' => ['city'],
                'idx_customers_state' => ['state'],
                'idx_customers_is_active' => ['is_active'],
            ],
            'sales_approvals' => [
                'idx_sales_approvals_status' => ['status'],
            ],
            'customer_orders' => [
                'idx_customer_orders_status' => ['status'],
                'idx_customer_orders_supplier_id' => ['supplier_id'],
            ],
            'direct_purchases' => [
                'idx_direct_purchases_company_name' => ['company_name'],
                'idx_direct_purchases_supplier_name' => ['supplier_name'],
                'idx_direct_purchases_status' => ['status'],
                'idx_direct_purchases_transport_name' => ['transport_name'],
            ],
        ];
    }

    public function up(): void
    {
        foreach ($this->tableIndexes() as $table => $indexes) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table, $indexes) {
                $existing = collect(Schema::getIndexes($table))->pluck('name');
                $columns = collect(Schema::getColumnListing($table));
                foreach ($indexes as $name => $indexColumns) {
                    if ($existing->contains($name)) {
                        continue;
                    }
                    if (collect($indexColumns)->diff($columns)->isNotEmpty()) {
                        continue;
                    }
                    $blueprint->index($indexColumns, $name);
                }
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tableIndexes() as $table => $indexes) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table, $indexes) {
                $existing = collect(Schema::getIndexes($table))->pluck('name');
                foreach (array_keys($indexes) as $name) {
                    if ($existing->contains($name)) {
                        $blueprint->dropIndex($name);
                    }
                }
            });
        }
    }
};
