<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The live POS Sale/Return frontend (split cash/card/upi tender, credit
 * sales, IGST, per-line salesman attribution, applied-return-credit,
 * return reasons) was built against columns that were never added to
 * pos_sales/pos_sale_items/pos_payments/pos_returns/pos_return_items -
 * every real checkout 422s today. This adds the missing columns so
 * PosSaleController/PosReturnController can persist what the UI actually
 * sends.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_sales', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_sales', 'is_credit')) {
                $table->boolean('is_credit')->default(false)->after('payment_mode');
            }
            if (!Schema::hasColumn('pos_sales', 'igst')) {
                $table->boolean('igst')->default(false)->after('is_credit');
            }
            if (!Schema::hasColumn('pos_sales', 'place_of_supply_state_id')) {
                $table->unsignedBigInteger('place_of_supply_state_id')->nullable()->after('igst');
            }
            if (!Schema::hasColumn('pos_sales', 'applied_pos_return_id')) {
                $table->unsignedBigInteger('applied_pos_return_id')->nullable()->after('place_of_supply_state_id');
            }
        });

        Schema::table('pos_sale_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_sale_items', 'tax_name')) {
                $table->string('tax_name')->nullable()->after('tax_amount');
            }
            if (!Schema::hasColumn('pos_sale_items', 'tax_type')) {
                $table->string('tax_type')->nullable()->after('tax_name');
            }
            if (!Schema::hasColumn('pos_sale_items', 'cost_price')) {
                $table->decimal('cost_price', 15, 2)->nullable()->after('tax_type');
            }
            if (!Schema::hasColumn('pos_sale_items', 'sales_man_id')) {
                $table->unsignedBigInteger('sales_man_id')->nullable()->after('cost_price');
            }
            if (!Schema::hasColumn('pos_sale_items', 'sales_man_name')) {
                $table->string('sales_man_name')->nullable()->after('sales_man_id');
            }
        });

        Schema::table('pos_payments', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_payments', 'card_type_id')) {
                $table->unsignedBigInteger('card_type_id')->nullable()->after('reference_no');
            }
            if (!Schema::hasColumn('pos_payments', 'upi_provider_id')) {
                $table->unsignedBigInteger('upi_provider_id')->nullable()->after('card_type_id');
            }
        });

        Schema::table('pos_returns', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_returns', 'return_reason_id')) {
                $table->unsignedBigInteger('return_reason_id')->nullable()->after('refund_mode');
            }
            if (!Schema::hasColumn('pos_returns', 'return_reason_name')) {
                $table->string('return_reason_name')->nullable()->after('return_reason_id');
            }
            if (!Schema::hasColumn('pos_returns', 'standalone')) {
                $table->boolean('standalone')->default(false)->after('return_reason_name');
            }
            if (!Schema::hasColumn('pos_returns', 'credit_applied_to_sale_id')) {
                $table->unsignedBigInteger('credit_applied_to_sale_id')->nullable()->after('standalone');
            }
            if (!Schema::hasColumn('pos_returns', 'credit_applied_at')) {
                $table->timestamp('credit_applied_at')->nullable()->after('credit_applied_to_sale_id');
            }
        });

        Schema::table('pos_return_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_return_items', 'tax_rate')) {
                $table->decimal('tax_rate', 8, 2)->nullable()->after('refund_price');
            }
            if (!Schema::hasColumn('pos_return_items', 'tax_amount')) {
                $table->decimal('tax_amount', 15, 2)->nullable()->after('tax_rate');
            }
            if (!Schema::hasColumn('pos_return_items', 'cost_price')) {
                $table->decimal('cost_price', 15, 2)->nullable()->after('tax_amount');
            }
            if (!Schema::hasColumn('pos_return_items', 'discount')) {
                $table->decimal('discount', 15, 2)->nullable()->after('cost_price');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pos_sales', function (Blueprint $table) {
            foreach (['is_credit', 'igst', 'place_of_supply_state_id', 'applied_pos_return_id'] as $col) {
                if (Schema::hasColumn('pos_sales', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('pos_sale_items', function (Blueprint $table) {
            foreach (['tax_name', 'tax_type', 'cost_price', 'sales_man_id', 'sales_man_name'] as $col) {
                if (Schema::hasColumn('pos_sale_items', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('pos_payments', function (Blueprint $table) {
            foreach (['card_type_id', 'upi_provider_id'] as $col) {
                if (Schema::hasColumn('pos_payments', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('pos_returns', function (Blueprint $table) {
            foreach (['return_reason_id', 'return_reason_name', 'standalone', 'credit_applied_to_sale_id', 'credit_applied_at'] as $col) {
                if (Schema::hasColumn('pos_returns', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('pos_return_items', function (Blueprint $table) {
            foreach (['tax_rate', 'tax_amount', 'cost_price', 'discount'] as $col) {
                if (Schema::hasColumn('pos_return_items', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
