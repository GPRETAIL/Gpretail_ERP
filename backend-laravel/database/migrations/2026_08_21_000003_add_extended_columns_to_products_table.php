<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'company_id')) {
                $table->unsignedBigInteger('company_id')->nullable()->after('size_group_id');
            }
            if (!Schema::hasColumn('products', 'purchase_tax_id')) {
                $table->unsignedBigInteger('purchase_tax_id')->nullable()->after('company_id');
            }
            if (!Schema::hasColumn('products', 'sales_tax_id')) {
                $table->unsignedBigInteger('sales_tax_id')->nullable()->after('purchase_tax_id');
            }
            if (!Schema::hasColumn('products', 'type')) {
                $table->string('type', 50)->nullable()->after('sales_tax_id');
            }
            if (!Schema::hasColumn('products', 'section')) {
                $table->string('section', 100)->nullable()->after('type');
            }
            if (!Schema::hasColumn('products', 'selling_mode')) {
                $table->string('selling_mode', 50)->nullable()->after('section');
            }
            if (!Schema::hasColumn('products', 'barcode_mode')) {
                $table->string('barcode_mode', 50)->nullable()->after('selling_mode');
            }
            if (!Schema::hasColumn('products', 'barcode_source')) {
                $table->string('barcode_source', 50)->nullable()->after('barcode_mode');
            }
            if (!Schema::hasColumn('products', 'discount_mode')) {
                $table->string('discount_mode', 100)->nullable()->after('barcode_source');
            }
            if (!Schema::hasColumn('products', 'discount_mode_value')) {
                $table->decimal('discount_mode_value', 10, 2)->nullable()->after('discount_mode');
            }
            if (!Schema::hasColumn('products', 'margin_min')) {
                $table->decimal('margin_min', 10, 2)->nullable()->after('discount_mode_value');
            }
            if (!Schema::hasColumn('products', 'margin_max')) {
                $table->decimal('margin_max', 10, 2)->nullable()->after('margin_min');
            }
            if (!Schema::hasColumn('products', 'stock_holding_period')) {
                $table->string('stock_holding_period', 50)->nullable()->after('margin_max');
            }
            if (!Schema::hasColumn('products', 'purchase_plan_mode')) {
                $table->string('purchase_plan_mode', 50)->nullable()->after('stock_holding_period');
            }
            if (!Schema::hasColumn('products', 'expected_gender')) {
                $table->string('expected_gender', 50)->nullable()->after('purchase_plan_mode');
            }
            if (!Schema::hasColumn('products', 'dumping')) {
                $table->boolean('dumping')->default(false)->after('expected_gender');
            }
            if (!Schema::hasColumn('products', 'dumping_value')) {
                $table->string('dumping_value', 100)->nullable()->after('dumping');
            }
            if (!Schema::hasColumn('products', 'cess')) {
                $table->boolean('cess')->default(false)->after('dumping_value');
            }
            if (!Schema::hasColumn('products', 'cess_value')) {
                $table->decimal('cess_value', 10, 2)->nullable()->after('cess');
            }
            if (!Schema::hasColumn('products', 'daily_price')) {
                $table->boolean('daily_price')->default(false)->after('cess_value');
            }
            if (!Schema::hasColumn('products', 'daily_price_value')) {
                $table->string('daily_price_value', 100)->nullable()->after('daily_price');
            }
            if (!Schema::hasColumn('products', 'is_core')) {
                $table->boolean('is_core')->default(false)->after('daily_price_value');
            }
            if (!Schema::hasColumn('products', 'is_core_value')) {
                $table->string('is_core_value', 100)->nullable()->after('is_core');
            }
            if (!Schema::hasColumn('products', 'exclude_reward')) {
                $table->boolean('exclude_reward')->default(false)->after('is_core_value');
            }
            if (!Schema::hasColumn('products', 'auto_po')) {
                $table->boolean('auto_po')->default(false)->after('exclude_reward');
            }
            if (!Schema::hasColumn('products', 'auto_po_value')) {
                $table->string('auto_po_value', 100)->nullable()->after('auto_po');
            }
            if (!Schema::hasColumn('products', 'purchase_entry_attributes')) {
                $table->json('purchase_entry_attributes')->nullable()->after('auto_po_value');
            }
            if (!Schema::hasColumn('products', 'created_by')) {
                $table->string('created_by', 100)->nullable()->after('purchase_entry_attributes');
            }
            if (!Schema::hasColumn('products', 'updated_by')) {
                $table->string('updated_by', 100)->nullable()->after('created_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'company_id',
                'purchase_tax_id',
                'sales_tax_id',
                'type',
                'section',
                'selling_mode',
                'barcode_mode',
                'barcode_source',
                'discount_mode',
                'discount_mode_value',
                'margin_min',
                'margin_max',
                'stock_holding_period',
                'purchase_plan_mode',
                'expected_gender',
                'dumping',
                'dumping_value',
                'cess',
                'cess_value',
                'daily_price',
                'daily_price_value',
                'is_core',
                'is_core_value',
                'exclude_reward',
                'auto_po',
                'auto_po_value',
                'purchase_entry_attributes',
                'created_by',
                'updated_by',
            ]);
        });
    }
};
