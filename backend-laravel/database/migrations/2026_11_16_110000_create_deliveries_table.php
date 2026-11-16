<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sales > Delivery: what physically left the counter for a bill (a POS bill or a dealer invoice). The items are
 * checked against the bill at handover; a bill is delivered once. Stock is not touched: the sale already took it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id')->index();
            $table->string('source_type', 20); // pos_sale, dealer_invoice
            $table->unsignedBigInteger('source_id');
            $table->string('bill_no', 100);
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->string('status', 20); // delivered, short
            $table->decimal('expected_qty', 12, 3)->default(0);
            $table->decimal('delivered_qty', 12, 3)->default(0);
            $table->string('short_reason', 500)->nullable();
            $table->unsignedBigInteger('approval_request_id')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->unsignedBigInteger('delivered_by')->nullable();
            $table->timestamp('delivered_at');
            $table->timestamps();

            $table->unique(['source_type', 'source_id']);
            $table->index(['store_id', 'delivered_at']);
        });

        Schema::create('delivery_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained('deliveries')->cascadeOnDelete();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('variant_id')->nullable();
            $table->decimal('expected_qty', 12, 3);
            $table->decimal('delivered_qty', 12, 3);
            $table->json('scanned_barcodes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_items');
        Schema::dropIfExists('deliveries');
    }
};
