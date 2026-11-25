<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Gift vouchers, credit notes and coupons share one engine: a numbered amount with a balance and an expiry that a bill
 * can use as a payment.
 * - gift_credits: one row per voucher, credit note or coupon. Expiry is worked out from expires_on when it is read, so
 *   nothing has to run at night and nothing can drift between the on-prem server and the cloud.
 * - gift_credit_redemptions: each use on a bill. The balance on gift_credits is a cache of the amount less the uses
 *   that were not reversed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gift_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('kind', 20); // GIFT_VOUCHER, CREDIT_NOTE, COUPON
            $table->string('number', 80);
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->unsignedBigInteger('source_pos_return_id')->nullable(); // The return a credit note came from.
            $table->unsignedBigInteger('source_pos_sale_id')->nullable(); // The bill a coupon was issued on or a voucher was sold on.
            $table->date('issued_on');
            $table->date('expires_on')->nullable();
            $table->decimal('original_amount', 15, 2);
            $table->decimal('balance', 15, 2);
            $table->decimal('min_bill_amount', 15, 2)->nullable(); // Coupons: the smallest bill it can be used on.
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE, USED, CANCELLED
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->unique(['store_id', 'number']);
            $table->index(['store_id', 'kind', 'status']);
            $table->index('source_pos_return_id');
            $table->index('source_pos_sale_id');
        });

        Schema::create('gift_credit_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('gift_credit_id')->constrained('gift_credits')->cascadeOnDelete();
            $table->unsignedBigInteger('pos_sale_id')->index();
            $table->decimal('amount', 15, 2);
            $table->date('redeemed_on');
            $table->timestamp('reversed_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'redeemed_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gift_credit_redemptions');
        Schema::dropIfExists('gift_credits');
    }
};
