<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Sales > Bill Reprint: every reprint of a sales document, who printed it, which copy and why. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bill_prints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('doc_type', 20); // pos_sale, pos_return, dealer_invoice, dealer_return, dealer_receipt, customer_order
            $table->unsignedBigInteger('doc_id');
            $table->string('doc_no', 80)->nullable();
            $table->string('copy_label', 60)->nullable();
            $table->string('reason', 255)->nullable();
            $table->string('channel', 12)->default('print'); // print, share
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('approval_request_id')->nullable();
            $table->timestamp('printed_at');
            $table->timestamps();
            $table->index(['store_id', 'doc_type', 'doc_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bill_prints');
    }
};
