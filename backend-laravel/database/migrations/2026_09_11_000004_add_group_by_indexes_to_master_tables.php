<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Indexes for the columns GroupAggregationService's groupable_columns map actually exposes
     * (see config/pagination.php). products is already covered by
     * 2026_08_20_002004_add_performance_indexes_to_products_table -- not touched here.
     */
    private function tableIndexes(): array
    {
        return [
            'brands' => [
                'idx_brands_is_active' => ['is_active'],
            ],
            'taxes' => [
                'idx_taxes_is_active' => ['is_active'],
                'idx_taxes_type' => ['type'],
            ],
            'transports' => [
                'idx_transports_is_active' => ['is_active'],
            ],
            'suppliers' => [
                'idx_suppliers_is_active' => ['is_active'],
                'idx_suppliers_state' => ['state'],
                'idx_suppliers_city' => ['city'],
            ],
            'agents' => [
                'idx_agents_is_active' => ['is_active'],
            ],
            'employees' => [
                'idx_employees_is_active' => ['is_active'],
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
                foreach ($indexes as $name => $columns) {
                    if (!$existing->contains($name)) {
                        $blueprint->index($columns, $name);
                    }
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
