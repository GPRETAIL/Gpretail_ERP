<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Purchase Invoices
        Schema::create('purchase_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('transport_id')->nullable()->constrained('transports')->nullOnDelete();
            $table->string('invoice_no')->unique();
            $table->date('invoice_date');
            $table->string('supplier_invoice_no')->nullable();
            $table->date('supplier_invoice_date')->nullable();
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('round_off', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->string('payment_status', 50)->default('UNPAID');
            $table->string('status', 50)->default('PENDING'); // PENDING, APPROVED, REJECTED
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Purchase Invoice Items
        Schema::create('purchase_invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_invoice_id')->constrained('purchase_invoices')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('rate', 15, 2)->default(0);
            $table->foreignId('tax_id')->nullable()->constrained('taxes')->nullOnDelete();
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->timestamps();
        });

        // Goods Receipt Notes (GRN)
        Schema::create('grns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('purchase_invoice_id')->nullable()->constrained('purchase_invoices')->nullOnDelete();
            $table->string('grn_no')->unique();
            $table->date('grn_date');
            $table->string('status', 50)->default('RECEIVED');
            $table->text('notes')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // GRN Items
        Schema::create('grn_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grn_id')->constrained('grns')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('received_qty', 15, 3);
            $table->decimal('accepted_qty', 15, 3);
            $table->decimal('rejected_qty', 15, 3)->default(0);
            $table->string('rejection_reason')->nullable();
            $table->timestamps();
        });

        // Purchase Returns
        Schema::create('purchase_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('purchase_invoice_id')->nullable()->constrained('purchase_invoices')->nullOnDelete();
            $table->string('return_no')->unique();
            $table->date('return_date');
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->string('reason')->nullable();
            $table->string('status', 50)->default('COMPLETED');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Purchase Return Items
        Schema::create('purchase_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_return_id')->constrained('purchase_returns')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('rate', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->timestamps();
        });

        // Transport Entries
        Schema::create('transport_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transport_id')->constrained('transports')->cascadeOnDelete();
            $table->string('lr_no', 100)->unique();
            $table->date('lr_date');
            $table->string('source')->nullable();
            $table->string('destination')->nullable();
            $table->integer('packages_count')->default(1);
            $table->decimal('weight_kg', 10, 2)->default(0);
            $table->decimal('freight_charges', 15, 2)->default(0);
            $table->string('status', 50)->default('IN_TRANSIT');
            $table->timestamps();
        });

        // Transport Issues
        Schema::create('transport_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transport_entry_id')->constrained('transport_entries')->cascadeOnDelete();
            $table->string('issue_no')->unique();
            $table->date('issue_date');
            $table->string('recipient_name')->nullable();
            $table->string('status', 50)->default('ISSUED');
            $table->timestamps();
        });

        // Transport Receipts
        Schema::create('transport_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transport_entry_id')->constrained('transport_entries')->cascadeOnDelete();
            $table->string('receipt_no')->unique();
            $table->date('receipt_date');
            $table->string('received_by_name')->nullable();
            $table->string('status', 50)->default('RECEIVED');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_receipts');
        Schema::dropIfExists('transport_issues');
        Schema::dropIfExists('transport_entries');
        Schema::dropIfExists('purchase_return_items');
        Schema::dropIfExists('purchase_returns');
        Schema::dropIfExists('grn_items');
        Schema::dropIfExists('grns');
        Schema::dropIfExists('purchase_invoice_items');
        Schema::dropIfExists('purchase_invoices');
    }
};
