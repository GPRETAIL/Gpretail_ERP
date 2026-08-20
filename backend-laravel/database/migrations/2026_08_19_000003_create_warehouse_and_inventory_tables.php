<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stocks table
        Schema::create('stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('quantity', 15, 3)->default(0);
            $table->decimal('allocated_quantity', 15, 3)->default(0);
            $table->decimal('available_quantity', 15, 3)->default(0);
            $table->string('location_bin', 100)->nullable();
            $table->timestamps();

            $table->unique(['store_id', 'product_id', 'variant_id']);
        });

        // Stock Transactions
        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('reference_type', 50); // PURCHASE, SALE, TRANSFER, ADJUSTMENT, RETURN
            $table->unsignedBigInteger('reference_id')->nullable()->index();
            $table->string('type', 10); // IN, OUT
            $table->decimal('quantity', 15, 3);
            $table->decimal('before_qty', 15, 3)->default(0);
            $table->decimal('after_qty', 15, 3)->default(0);
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Barcodes
        Schema::create('barcodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('barcode', 100)->unique();
            $table->string('batch_no', 100)->nullable();
            $table->decimal('mrp', 15, 2)->default(0);
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->integer('printed_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Inventory Entries (Opening Stock / Adjustments)
        Schema::create('inventory_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('entry_no')->unique();
            $table->date('entry_date');
            $table->string('type', 50)->default('ADJUSTMENT'); // OPENING, ADJUSTMENT
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('status', 50)->default('COMPLETED');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Inventory Entry Items
        Schema::create('inventory_entry_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_entry_id')->constrained('inventory_entries')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('total_price', 15, 2)->default(0);
            $table->timestamps();
        });

        // Direct Purchases
        Schema::create('direct_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('purchase_no')->unique();
            $table->date('purchase_date');
            $table->string('invoice_no')->nullable();
            $table->decimal('total_qty', 15, 3)->default(0);
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->string('payment_status', 50)->default('UNPAID');
            $table->string('status', 50)->default('COMPLETED');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Direct Purchase Items
        Schema::create('direct_purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('direct_purchase_id')->constrained('direct_purchases')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->foreignId('tax_id')->nullable()->constrained('taxes')->nullOnDelete();
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('total_price', 15, 2)->default(0);
            $table->timestamps();
        });

        // Physical Stock Audits
        Schema::create('physical_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('audit_no')->unique();
            $table->date('audit_date');
            $table->string('status', 50)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Physical Stock Audit Items
        Schema::create('physical_stock_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('physical_stock_id')->constrained('physical_stocks')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('system_qty', 15, 3)->default(0);
            $table->decimal('counted_qty', 15, 3)->default(0);
            $table->decimal('difference_qty', 15, 3)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Stock Outward / Inter-store Transfers
        Schema::create('stock_outwards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('target_store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('outward_no')->unique();
            $table->date('outward_date');
            $table->string('status', 50)->default('PENDING'); // PENDING, DISPATCHED, RECEIVED
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Stock Outward Items
        Schema::create('stock_outward_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_outward_id')->constrained('stock_outwards')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_outward_items');
        Schema::dropIfExists('stock_outwards');
        Schema::dropIfExists('physical_stock_items');
        Schema::dropIfExists('physical_stocks');
        Schema::dropIfExists('direct_purchase_items');
        Schema::dropIfExists('direct_purchases');
        Schema::dropIfExists('inventory_entry_items');
        Schema::dropIfExists('inventory_entries');
        Schema::dropIfExists('barcodes');
        Schema::dropIfExists('stock_transactions');
        Schema::dropIfExists('stocks');
    }
};
