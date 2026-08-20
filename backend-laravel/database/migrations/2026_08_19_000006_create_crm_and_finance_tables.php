<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Customers table
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('phone', 50)->nullable()->index();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('pincode', 20)->nullable();
            $table->string('gstin', 50)->nullable();
            $table->decimal('credit_limit', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->integer('loyalty_points')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Customer Orders
        Schema::create('customer_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('order_no')->unique();
            $table->date('order_date');
            $table->date('delivery_date')->nullable();
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('advance_paid', 15, 2)->default(0);
            $table->decimal('balance_due', 15, 2)->default(0);
            $table->string('status', 50)->default('PENDING'); // PENDING, PROCESSING, READY, DELIVERED, CANCELLED
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Customer Order Items
        Schema::create('customer_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_order_id')->constrained('customer_orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('price', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->timestamps();
        });

        // Loyalty Transactions
        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->unsignedBigInteger('pos_sale_id')->nullable()->index();
            $table->string('type', 20); // EARN, REDEEM, ADJUSTMENT
            $table->integer('points');
            $table->decimal('amount', 15, 2)->default(0);
            $table->integer('balance_after')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Credit Ledgers
        Schema::create('credit_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('reference_type', 50); // SALE, PAYMENT, ADJUSTMENT
            $table->unsignedBigInteger('reference_id')->nullable()->index();
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->string('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Supplier Payments
        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('payment_no')->unique();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('payment_mode', 50)->default('BANK_TRANSFER');
            $table->string('reference_no', 100)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Supplier Payment Items
        Schema::create('supplier_payment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_payment_id')->constrained('supplier_payments')->cascadeOnDelete();
            $table->unsignedBigInteger('purchase_invoice_id')->nullable()->index();
            $table->decimal('amount_paid', 15, 2);
            $table->timestamps();
        });

        // General Ledgers
        Schema::create('general_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('account_type', 50); // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
            $table->string('account_name', 100);
            $table->string('reference_type', 50)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('general_ledgers');
        Schema::dropIfExists('supplier_payment_items');
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('credit_ledgers');
        Schema::dropIfExists('loyalty_transactions');
        Schema::dropIfExists('customer_order_items');
        Schema::dropIfExists('customer_orders');
        Schema::dropIfExists('customers');
    }
};
