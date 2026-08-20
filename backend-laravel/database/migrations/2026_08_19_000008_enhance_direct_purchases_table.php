<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('direct_purchases', function (Blueprint $table) {
            if (!Schema::hasColumn('direct_purchases', 'company_id')) {
                $table->unsignedBigInteger('company_id')->nullable()->after('store_id');
            }
            if (!Schema::hasColumn('direct_purchases', 'company_name')) {
                $table->string('company_name')->nullable()->after('company_id');
            }
            if (!Schema::hasColumn('direct_purchases', 'supplier_name')) {
                $table->string('supplier_name')->nullable()->after('supplier_id');
            }
            if (!Schema::hasColumn('direct_purchases', 'purchase_type')) {
                $table->string('purchase_type')->default('textile')->after('purchase_no');
            }
            if (!Schema::hasColumn('direct_purchases', 'po_no')) {
                $table->string('po_no')->nullable()->after('purchase_type');
            }
            if (!Schema::hasColumn('direct_purchases', 'transport_id')) {
                $table->unsignedBigInteger('transport_id')->nullable()->after('po_no');
            }
            if (!Schema::hasColumn('direct_purchases', 'transport_name')) {
                $table->string('transport_name')->nullable()->after('transport_id');
            }
            if (!Schema::hasColumn('direct_purchases', 'lr_no')) {
                $table->string('lr_no')->nullable()->after('transport_name');
            }
            if (!Schema::hasColumn('direct_purchases', 'lr_date')) {
                $table->date('lr_date')->nullable()->after('lr_no');
            }
            if (!Schema::hasColumn('direct_purchases', 'bundles')) {
                $table->integer('bundles')->default(0)->after('lr_date');
            }
            if (!Schema::hasColumn('direct_purchases', 'retail_location')) {
                $table->string('retail_location')->nullable()->after('bundles');
            }
            if (!Schema::hasColumn('direct_purchases', 'invoice_date')) {
                $table->date('invoice_date')->nullable()->after('invoice_no');
            }
            if (!Schema::hasColumn('direct_purchases', 'igst')) {
                $table->boolean('igst')->default(false)->after('invoice_date');
            }
            if (!Schema::hasColumn('direct_purchases', 'i_discount')) {
                $table->boolean('i_discount')->default(false)->after('igst');
            }
            if (!Schema::hasColumn('direct_purchases', 'tax_type_id')) {
                $table->unsignedBigInteger('tax_type_id')->nullable()->after('i_discount');
            }
            if (!Schema::hasColumn('direct_purchases', 'tax_type_name')) {
                $table->string('tax_type_name')->nullable()->after('tax_type_id');
            }
            if (!Schema::hasColumn('direct_purchases', 'tax_value')) {
                $table->decimal('tax_value', 15, 2)->default(0)->after('tax_type_name');
            }
            if (!Schema::hasColumn('direct_purchases', 'tax_discount')) {
                $table->decimal('tax_discount', 15, 2)->default(0)->after('tax_value');
            }
            if (!Schema::hasColumn('direct_purchases', 'tax_lines')) {
                $table->json('tax_lines')->nullable()->after('tax_discount');
            }
            if (!Schema::hasColumn('direct_purchases', 'bill_value')) {
                $table->decimal('bill_value', 15, 2)->default(0)->after('tax_lines');
            }
            if (!Schema::hasColumn('direct_purchases', 'other_charges')) {
                $table->decimal('other_charges', 15, 2)->default(0)->after('bill_value');
            }
            if (!Schema::hasColumn('direct_purchases', 'bill_tax')) {
                $table->decimal('bill_tax', 15, 2)->default(0)->after('other_charges');
            }
            if (!Schema::hasColumn('direct_purchases', 'pur_discount_perc')) {
                $table->decimal('pur_discount_perc', 8, 2)->default(0)->after('bill_tax');
            }
            if (!Schema::hasColumn('direct_purchases', 'pur_discount')) {
                $table->decimal('pur_discount', 15, 2)->default(0)->after('pur_discount_perc');
            }
            if (!Schema::hasColumn('direct_purchases', 'total')) {
                $table->decimal('total', 15, 2)->default(0)->after('pur_discount');
            }
            if (!Schema::hasColumn('direct_purchases', 'invoice_workflow_status')) {
                $table->string('invoice_workflow_status')->default('invoice_completed')->after('total');
            }
        });

        Schema::table('direct_purchase_items', function (Blueprint $table) {
            if (!Schema::hasColumn('direct_purchase_items', 's_no')) {
                $table->integer('s_no')->default(1)->after('direct_purchase_id');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'product_name')) {
                $table->string('product_name')->nullable()->after('product_id');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'brand_id')) {
                $table->unsignedBigInteger('brand_id')->nullable()->after('product_name');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'brand_name')) {
                $table->string('brand_name')->nullable()->after('brand_id');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'size')) {
                $table->string('size')->nullable()->after('brand_name');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'color_id')) {
                $table->unsignedBigInteger('color_id')->nullable()->after('size');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'color_name')) {
                $table->string('color_name')->nullable()->after('color_id');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'design_no')) {
                $table->string('design_no')->nullable()->after('color_name');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'hsn_code')) {
                $table->string('hsn_code')->nullable()->after('design_no');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'qty')) {
                $table->decimal('qty', 15, 3)->default(0)->after('quantity');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'cost')) {
                $table->decimal('cost', 15, 2)->default(0)->after('cost_price');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'margin_perc')) {
                $table->decimal('margin_perc', 8, 2)->default(0)->after('cost');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'price')) {
                $table->decimal('price', 15, 2)->default(0)->after('margin_perc');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'amount')) {
                $table->decimal('amount', 15, 2)->default(0)->after('price');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'jump_change_price')) {
                $table->boolean('jump_change_price')->default(false)->after('amount');
            }
            if (!Schema::hasColumn('direct_purchase_items', 'jump_details')) {
                $table->json('jump_details')->nullable()->after('jump_change_price');
            }
        });
    }

    public function down(): void
    {
    }
};
