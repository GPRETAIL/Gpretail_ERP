<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cash Register Sessions
        Schema::create('cash_register_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->decimal('opening_cash', 15, 2)->default(0);
            $table->decimal('closing_cash', 15, 2)->nullable();
            $table->decimal('expected_cash', 15, 2)->nullable();
            $table->decimal('difference', 15, 2)->nullable();
            $table->string('status', 50)->default('OPEN'); // OPEN, CLOSED
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // POS Sales
        Schema::create('pos_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('cash_session_id')->nullable()->constrained('cash_register_sessions')->nullOnDelete();
            $table->unsignedBigInteger('customer_id')->nullable()->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('invoice_no')->unique();
            $table->timestamp('sale_date');
            $table->integer('total_items')->default(0);
            $table->decimal('total_qty', 15, 3)->default(0);
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('round_off', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('change_amount', 15, 2)->default(0);
            $table->string('payment_mode', 50)->default('CASH'); // CASH, CARD, UPI, SPLIT, CREDIT
            $table->string('status', 50)->default('COMPLETED'); // COMPLETED, CANCELLED, RETURNED
            $table->timestamps();
        });

        // POS Sale Items
        Schema::create('pos_sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pos_sale_id')->constrained('pos_sales')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_mrp', 15, 2)->default(0);
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('tax_rate', 8, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->timestamps();
        });

        // POS Payments (Split tender support)
        Schema::create('pos_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pos_sale_id')->constrained('pos_sales')->cascadeOnDelete();
            $table->string('payment_mode', 50); // CASH, CARD, UPI, CREDIT
            $table->decimal('amount', 15, 2);
            $table->string('reference_no', 100)->nullable();
            $table->timestamps();
        });

        // POS Returns
        Schema::create('pos_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('pos_sale_id')->constrained('pos_sales')->cascadeOnDelete();
            $table->unsignedBigInteger('customer_id')->nullable()->index();
            $table->string('return_no')->unique();
            $table->timestamp('return_date');
            $table->decimal('total_refund', 15, 2)->default(0);
            $table->string('refund_mode', 50)->default('CASH');
            $table->string('status', 50)->default('COMPLETED');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // POS Return Items
        Schema::create('pos_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pos_return_id')->constrained('pos_returns')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('refund_price', 15, 2)->default(0);
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->timestamps();
        });

        // Dealer Invoices
        Schema::create('dealer_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->unsignedBigInteger('customer_id')->nullable()->index();
            $table->string('invoice_no')->unique();
            $table->date('invoice_date');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->string('status', 50)->default('COMPLETED');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Dealer Invoice Items
        Schema::create('dealer_invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dealer_invoice_id')->constrained('dealer_invoices')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('price', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->timestamps();
        });

        // Sales on Approval
        Schema::create('sales_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->unsignedBigInteger('customer_id')->nullable()->index();
            $table->string('approval_no')->unique();
            $table->date('approval_date');
            $table->date('valid_until')->nullable();
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->string('status', 50)->default('PENDING'); // PENDING, APPROVED, RETURNED
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Sales Approval Items
        Schema::create('sales_approval_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_approval_id')->constrained('sales_approvals')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('price', 15, 2)->default(0);
            $table->string('status', 50)->default('PENDING');
            $table->timestamps();
        });

        // Settlements & Daily Batches
        Schema::create('settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('batch_no')->unique();
            $table->date('settlement_date');
            $table->decimal('total_sales', 15, 2)->default(0);
            $table->decimal('cash_total', 15, 2)->default(0);
            $table->decimal('card_total', 15, 2)->default(0);
            $table->decimal('upi_total', 15, 2)->default(0);
            $table->decimal('credit_total', 15, 2)->default(0);
            $table->foreignId('settled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settlements');
        Schema::dropIfExists('sales_approval_items');
        Schema::dropIfExists('sales_approvals');
        Schema::dropIfExists('dealer_invoice_items');
        Schema::dropIfExists('dealer_invoices');
        Schema::dropIfExists('pos_return_items');
        Schema::dropIfExists('pos_returns');
        Schema::dropIfExists('pos_payments');
        Schema::dropIfExists('pos_sale_items');
        Schema::dropIfExists('pos_sales');
        Schema::dropIfExists('cash_register_sessions');
    }
};
