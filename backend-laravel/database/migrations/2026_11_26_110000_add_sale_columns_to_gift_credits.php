<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A gift voucher is sold at the counter: how it was paid for, at which counter (so its cash reaches that counter's drawer),
 * who it was sold to, and, if it was cancelled, when, by whom and why.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gift_credits', function (Blueprint $table) {
            $table->string('payment_mode', 20)->nullable()->after('min_bill_amount'); // CASH, CARD or UPI (vouchers only)
            $table->string('payment_reference', 100)->nullable()->after('payment_mode');
            $table->unsignedBigInteger('counter_id')->nullable()->after('payment_reference');
            $table->string('buyer_name', 120)->nullable()->after('counter_id');
            $table->string('buyer_phone', 30)->nullable()->after('buyer_name');
            $table->timestamp('cancelled_at')->nullable()->after('status');
            $table->unsignedBigInteger('cancelled_by')->nullable()->after('cancelled_at');
            $table->string('cancel_reason', 255)->nullable()->after('cancelled_by');
        });
    }

    public function down(): void
    {
        Schema::table('gift_credits', function (Blueprint $table) {
            $table->dropColumn(['payment_mode', 'payment_reference', 'counter_id', 'buyer_name', 'buyer_phone', 'cancelled_at', 'cancelled_by', 'cancel_reason']);
        });
    }
};
