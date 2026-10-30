<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['supplier_id' => 'suppliers', 'salesman_id' => 'employees', 'counter_id' => 'system_configurations', 'location_id' => 'system_configurations', 'city_id' => 'system_configurations'] as $column => $parent) {
            if (! Schema::hasColumn('customer_orders', $column)) {
                Schema::table('customer_orders', fn (Blueprint $table) => $table->foreignId($column)->nullable()->constrained($parent)->nullOnDelete());
            }
        }
        if (! Schema::hasColumn('customer_orders', 'discount_amount')) {
            Schema::table('customer_orders', fn (Blueprint $table) => $table->decimal('discount_amount', 15, 2)->default(0));
        }
        if (! Schema::hasColumn('customer_orders', 'net_amount')) {
            Schema::table('customer_orders', fn (Blueprint $table) => $table->decimal('net_amount', 15, 2)->default(0));
            DB::table('customer_orders')->update(['net_amount' => DB::raw('CASE WHEN total_amount > discount_amount THEN total_amount - discount_amount ELSE 0 END')]);
        }
        if (! Schema::hasColumn('customer_orders', 'payments')) {
            Schema::table('customer_orders', fn (Blueprint $table) => $table->json('payments')->nullable());
        }
        foreach (['brand_id', 'style_id', 'size_id', 'colour_id'] as $column) {
            if (! Schema::hasColumn('customer_order_items', $column)) {
                Schema::table('customer_order_items', fn (Blueprint $table) => $table->unsignedBigInteger($column)->nullable());
            }
        }
        foreach (['product_name', 'brand_name', 'style_name', 'size_name', 'colour_name', 'design_no'] as $column) {
            if (! Schema::hasColumn('customer_order_items', $column)) {
                Schema::table('customer_order_items', fn (Blueprint $table) => $table->string($column)->nullable());
            }
        }
    }

    public function down(): void
    {
        // Legacy installations may already own these columns. Retain their order data on rollback.
    }
};
