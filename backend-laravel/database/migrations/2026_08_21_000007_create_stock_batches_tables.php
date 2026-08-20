<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FIFO sell-through ledger for PACK/CUT variants: a shared barcode covers a
 * variant forever (never reissued per purchase), but suppliers still need
 * to know how much of a specific invoice has sold vs. remains. Each
 * receiving event (Direct Purchase, Purchase Invoice, Inventory Entry) that
 * adds PACK/CUT stock creates one batch here; every OUT movement depletes
 * the oldest open batch(es) first. PIECE doesn't need this - its per-unit
 * `barcodes` rows already carry `direct_purchase_id` for exact traceability.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('reference_type', 50);
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->decimal('received_qty', 15, 3);
            $table->decimal('remaining_qty', 15, 3);
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->timestamp('received_at');
            $table->timestamps();

            $table->index(['variant_id', 'store_id', 'received_at']);
            $table->index(['reference_type', 'reference_id']);
        });

        Schema::create('stock_batch_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_batch_id')->constrained('stock_batches')->cascadeOnDelete();
            $table->foreignId('stock_transaction_id')->constrained('stock_transactions')->cascadeOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_batch_allocations');
        Schema::dropIfExists('stock_batches');
    }
};
