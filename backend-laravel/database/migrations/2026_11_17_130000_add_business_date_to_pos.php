<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Billing after cash closing: a counter whose day is closed bills on the next business date. The bill keeps the real
 * time in billed_at; cash sessions remember the business date they count; a manually chosen date is kept per counter.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_sales', function (Blueprint $table) {
            $table->timestamp('billed_at')->nullable()->after('sale_date');
        });
        Schema::table('pos_returns', function (Blueprint $table) {
            $table->timestamp('billed_at')->nullable()->after('return_date');
        });
        Schema::table('cash_register_sessions', function (Blueprint $table) {
            $table->date('business_date')->nullable()->after('opened_at');
        });
        Schema::create('counter_billing_dates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('counter_id')->nullable();
            $table->date('business_date');
            $table->unsignedBigInteger('set_by')->nullable();
            $table->timestamp('set_at')->nullable();
            $table->timestamps();
            $table->unique(['store_id', 'counter_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('counter_billing_dates');
        Schema::table('cash_register_sessions', fn (Blueprint $table) => $table->dropColumn('business_date'));
        Schema::table('pos_returns', fn (Blueprint $table) => $table->dropColumn('billed_at'));
        Schema::table('pos_sales', fn (Blueprint $table) => $table->dropColumn('billed_at'));
    }
};
