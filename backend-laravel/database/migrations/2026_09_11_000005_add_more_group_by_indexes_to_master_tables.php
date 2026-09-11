<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Follow-up to 2026_09_11_000004: groupable_columns grew from a minimal starting set to
     * covering most of each master page's actual columns (a column with no server-side mapping
     * showed "no records" instead of falling back to anything, once client-side grouping was
     * removed entirely -- see GroupAggregationService). Indexes for the columns that gained a
     * mapping and didn't already have one.
     */
    private function tableIndexes(): array
    {
        return [
            'products' => [
                'idx_products_hsn_code' => ['hsn_code'],
                'idx_products_type' => ['type'],
                'idx_products_unit' => ['unit'],
                'idx_products_section' => ['section'],
                'idx_products_selling_mode' => ['selling_mode'],
            ],
            'brands' => [
                'idx_brands_name' => ['name'],
            ],
            'taxes' => [
                'idx_taxes_name' => ['name'],
            ],
            'transports' => [
                'idx_transports_name' => ['name'],
                'idx_transports_contact_person' => ['contact_person'],
            ],
            'suppliers' => [
                'idx_suppliers_name' => ['name'],
            ],
            'agents' => [
                'idx_agents_name' => ['name'],
            ],
            'employees' => [
                'idx_employees_name' => ['name'],
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
                    // hsn_code/type/unit/section/selling_mode only exist on products since a later
                    // migration added them -- guard in case this ever runs against an older schema.
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
