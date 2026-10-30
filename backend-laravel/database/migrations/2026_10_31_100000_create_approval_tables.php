<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per (store, role). A store with no rows has approvals switched off, so
        // existing installations keep today's behaviour until an administrator enables limits.
        Schema::create('approval_limits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('role', 40);
            $table->decimal('max_discount_percent', 5, 2)->nullable()->comment('null = unlimited');
            $table->decimal('max_refund_amount', 12, 2)->nullable()->comment('null = unlimited');
            $table->boolean('allow_no_receipt_refund')->default(false);
            $table->timestamps();
            $table->unique(['store_id', 'role']);
        });

        Schema::create('approval_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('action', 30); // pos_discount | pos_refund
            $table->string('status', 20)->default('pending'); // pending|approved|rejected|cancelled|used
            $table->string('channel', 10)->default('remote'); // remote | pin
            $table->foreignId('requested_by')->constrained('users');
            $table->foreignId('decided_by')->nullable()->constrained('users');
            $table->decimal('requested_percent', 6, 2)->nullable();
            $table->decimal('approved_percent', 6, 2)->nullable();
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('reason_code', 40)->nullable();
            $table->string('note', 500)->nullable();
            $table->string('decision_note', 500)->nullable();
            $table->json('payload')->nullable();
            $table->string('token_hash', 64)->nullable()->unique();
            $table->timestamp('decided_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->unsignedBigInteger('pos_sale_id')->nullable();
            $table->unsignedBigInteger('pos_return_id')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'status', 'action']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('approval_pin_hash')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('approval_pin_hash'));
        Schema::dropIfExists('approval_requests');
        Schema::dropIfExists('approval_limits');
    }
};
