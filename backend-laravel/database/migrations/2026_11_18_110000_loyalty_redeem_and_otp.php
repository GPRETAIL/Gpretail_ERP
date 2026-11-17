<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Loyalty phase 2a: redeeming points at POS.
 * - loyalty_transactions: the store, why a row was written, and for points coming in (EARN, BONUS, RESTORE,
 *   ADJUST_IN) when they expire and how many are still unused (spent oldest first). `points` stays a positive size;
 *   the type says which way it went, `balance_after` the customer's balance.
 * - stores: the ₹ value of a redeemed point, the most of a bill points may pay, whether redeeming needs an OTP.
 * - loyalty_otps: one-time passwords the customer receives to approve a redemption.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('store_id')->nullable()->after('id')->index();
            $table->string('source', 20)->nullable()->after('type');
            $table->unsignedBigInteger('pos_return_id')->nullable()->after('pos_sale_id')->index();
            $table->string('reason', 255)->nullable()->after('amount');
            $table->date('expires_at')->nullable()->after('reason');
            $table->integer('remaining')->default(0)->after('expires_at');
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->boolean('loyalty_enabled')->default(true);
            $table->decimal('loyalty_redeem_value', 10, 2)->default(1); // ₹ one point is worth when redeemed
            $table->decimal('loyalty_max_redeem_percent', 5, 2)->default(50); // most of a bill points may pay
            $table->boolean('loyalty_otp_required')->default(true);
        });

        Schema::create('loyalty_otps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('channel', 12); // sms, whatsapp, email
            $table->string('sent_to', 120);
            $table->string('code_hash', 64);
            $table->unsignedInteger('points');
            $table->decimal('amount', 15, 2)->default(0);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->string('token_hash', 64)->nullable()->index();
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->unsignedBigInteger('pos_sale_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['customer_id', 'created_at']);
        });

        // Existing rows: their store from the customer; the customer's current balance spread over their earnings,
        // newest first (what is left of the oldest was spent first), each expiring after the store's window.
        DB::table('loyalty_transactions as t')->join('customers as c', 'c.id', '=', 't.customer_id')
            ->whereNull('t.store_id')->select('t.id', 'c.store_id')->orderBy('t.id')
            ->chunk(500, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('loyalty_transactions')->where('id', $row->id)->update(['store_id' => $row->store_id, 'source' => DB::raw("CASE WHEN pos_sale_id IS NULL THEN 'adjustment' ELSE 'pos_sale' END")]);
                }
            });
        $windows = DB::table('stores')->pluck('loyalty_redeem_window_months', 'id');
        DB::table('customers')->where('loyalty_points', '>', 0)->select('id', 'store_id', 'loyalty_points')->orderBy('id')
            ->chunk(500, function ($customers) use ($windows) {
                foreach ($customers as $customer) {
                    $left = (int) $customer->loyalty_points;
                    $months = (int) ($windows[$customer->store_id] ?? 12) ?: 12;
                    $earnings = DB::table('loyalty_transactions')->where('customer_id', $customer->id)->where('type', 'EARN')
                        ->orderByDesc('id')->get(['id', 'points', 'created_at']);
                    foreach ($earnings as $earn) {
                        $keep = min($left, (int) $earn->points);
                        $expires = $earn->created_at ? date('Y-m-d', strtotime($earn->created_at." +{$months} months")) : null;
                        DB::table('loyalty_transactions')->where('id', $earn->id)->update(['remaining' => $keep, 'expires_at' => $expires]);
                        $left -= $keep;
                    }
                    if ($left > 0) {
                        // A balance with no earning behind it (old imports, hand edits): keep it as one opening row.
                        DB::table('loyalty_transactions')->insert(['store_id' => $customer->store_id, 'customer_id' => $customer->id, 'type' => 'ADJUST_IN',
                            'source' => 'adjustment', 'points' => $left, 'amount' => 0, 'reason' => 'Opening balance', 'remaining' => $left,
                            'expires_at' => date('Y-m-d', strtotime("+{$months} months")), 'balance_after' => (int) $customer->loyalty_points,
                            'created_at' => now(), 'updated_at' => now()]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_otps');
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['loyalty_enabled', 'loyalty_redeem_value', 'loyalty_max_redeem_percent', 'loyalty_otp_required']);
        });
        Schema::table('loyalty_transactions', function (Blueprint $table) {
            $table->dropIndex(['store_id']);
            $table->dropIndex(['pos_return_id']);
            $table->dropColumn(['store_id', 'source', 'pos_return_id', 'reason', 'expires_at', 'remaining']);
        });
    }
};
