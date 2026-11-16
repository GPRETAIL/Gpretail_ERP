<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dealer invoices can be paid on the spot (cash, card, UPI, bank, cheque; split or part, the rest on credit), and
 * dues are collected later with a Dealer Receipt allocated to the dealer's open invoices.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dealer_invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dealer_invoice_id')->constrained('dealer_invoices')->cascadeOnDelete();
            $table->string('mode', 10); // CASH, CARD, UPI, BANK, CHEQUE
            $table->decimal('amount', 14, 2);
            $table->string('reference_no', 100)->nullable();
            $table->unsignedBigInteger('card_type_id')->nullable();
            $table->unsignedBigInteger('upi_provider_id')->nullable();
            $table->date('cheque_date')->nullable();
            $table->timestamps();
        });

        Schema::create('dealer_receipts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id')->index();
            $table->string('receipt_no', 100)->unique();
            $table->unsignedBigInteger('customer_id')->index();
            $table->date('receipt_date');
            $table->string('mode', 10);
            $table->decimal('amount', 14, 2);
            $table->string('reference_no', 100)->nullable();
            $table->date('cheque_date')->nullable();
            $table->string('notes', 500)->nullable();
            $table->string('status', 12)->default('COMPLETED'); // COMPLETED, CANCELLED
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('dealer_receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dealer_receipt_id')->constrained('dealer_receipts')->cascadeOnDelete();
            $table->unsignedBigInteger('dealer_invoice_id')->index();
            $table->decimal('amount', 14, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dealer_receipt_items');
        Schema::dropIfExists('dealer_receipts');
        Schema::dropIfExists('dealer_invoice_payments');
    }
};
