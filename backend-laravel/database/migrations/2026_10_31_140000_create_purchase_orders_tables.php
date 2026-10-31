<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Purchase orders, per store. The reorder engine drafts them (grouped by supplier) when stock falls
 * to an item's Auto PO / Re-Order minimum; a buyer reviews and approves. Nothing is sent automatically.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->uuid('uuid')->unique();
            $table->string('po_no')->unique();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->date('po_date');
            $table->date('expected_date')->nullable();
            $table->string('status', 20)->default('DRAFT'); // DRAFT, APPROVED, CLOSED, CANCELLED
            $table->string('source', 10)->default('MANUAL'); // AUTO (reorder engine) or MANUAL
            $table->text('notes')->nullable();
            $table->decimal('total_qty', 15, 3)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'store_id']);
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->decimal('amount', 15, 2)->default(0);
            // What the reorder engine saw when it suggested this line (blank for manual lines).
            $table->decimal('stock_at_order', 15, 3)->nullable();
            $table->decimal('reorder_min', 15, 3)->nullable();
            $table->decimal('reorder_max', 15, 3)->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
    }
};
