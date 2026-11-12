<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A cash register session is one counter's drawer from Cash Opening to Cash Closing: who opened and closed
 * it, the counted notes at each end, and the cash position worked out at closing (see CashRegisterService).
 * POS returns record their counter so cash refunds come out of the right drawer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_register_sessions', function (Blueprint $table) {
            $table->unsignedBigInteger('counter_id')->nullable()->after('user_id')->index();
            $table->unsignedBigInteger('location_id')->nullable()->after('counter_id');
            $table->unsignedBigInteger('paid_by_employee_id')->nullable()->after('location_id');
            $table->unsignedBigInteger('cashier_employee_id')->nullable()->after('paid_by_employee_id');
            $table->unsignedBigInteger('received_by_employee_id')->nullable()->after('cashier_employee_id');
            $table->json('opening_denominations')->nullable()->after('opening_cash');
            $table->json('closing_denominations')->nullable()->after('closing_cash');
            $table->decimal('counter_expenses', 15, 2)->default(0)->after('closing_denominations');
            $table->decimal('cash_sales', 15, 2)->nullable()->after('counter_expenses');
            $table->decimal('cash_refunds', 15, 2)->nullable()->after('cash_sales');
            $table->unsignedInteger('closing_no')->nullable()->after('status');
            $table->index(['store_id', 'counter_id', 'status']);
            $table->unique(['store_id', 'closing_no']);
        });

        Schema::table('pos_returns', function (Blueprint $table) {
            $table->unsignedBigInteger('counter_id')->nullable()->after('store_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('pos_returns', function (Blueprint $table) {
            $table->dropIndex(['counter_id']);
            $table->dropColumn('counter_id');
        });

        Schema::table('cash_register_sessions', function (Blueprint $table) {
            $table->dropUnique(['store_id', 'closing_no']);
            $table->dropIndex(['store_id', 'counter_id', 'status']);
            $table->dropIndex(['counter_id']);
            $table->dropColumn([
                'counter_id', 'location_id', 'paid_by_employee_id', 'cashier_employee_id', 'received_by_employee_id',
                'opening_denominations', 'closing_denominations', 'counter_expenses', 'cash_sales', 'cash_refunds', 'closing_no',
            ]);
        });
    }
};
