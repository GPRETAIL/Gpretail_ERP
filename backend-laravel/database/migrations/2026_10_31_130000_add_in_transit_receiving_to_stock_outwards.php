<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Store-to-store transfers become dispatch -> in transit -> receive. Earlier transfers credited the
 * target store the moment they were saved, so they are recorded as fully received, as of then.
 *
 * Stores never see each other's masters, so a line carries a snapshot of what was sent (name, code,
 * size, design, brand, colour, prices) and, once received, the receiving store's own product and
 * variant it was booked to. Barcodes printed by the receiving store link back to the line.
 *
 * Each transfer also gets a UUID key (like the POS checkoutKey): the dispatch screen sends it, so a
 * retried or replayed dispatch finds the same transfer instead of moving stock twice, and receive/
 * cancel address it by key, which stays the same on a store's local server and in the cloud.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_outwards', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->unique();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->unsignedBigInteger('received_by')->nullable();
            $table->text('receive_notes')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->index(['status', 'target_store_id']);
        });
        Schema::table('stock_outward_items', function (Blueprint $table) {
            foreach (['product_name', 'product_code', 'sku', 'product_barcode', 'selling_mode', 'hsn_code', 'unit', 'size', 'design_no', 'brand_name', 'brand_code', 'color_name', 'tax_name'] as $column) {
                $table->string($column)->nullable();
            }
            $table->decimal('mrp', 15, 2)->nullable();
            $table->decimal('selling_price', 15, 2)->nullable();
            $table->decimal('received_qty', 15, 3)->nullable();
            $table->decimal('damaged_qty', 15, 3)->default(0);
            $table->string('receive_note', 255)->nullable();
            $table->unsignedBigInteger('received_product_id')->nullable();
            $table->unsignedBigInteger('received_variant_id')->nullable();
        });
        Schema::table('barcodes', function (Blueprint $table) {
            $table->unsignedBigInteger('stock_outward_id')->nullable()->index();
            $table->unsignedBigInteger('stock_outward_item_id')->nullable()->index();
        });

        DB::table('stock_outwards')->update(['status' => 'RECEIVED', 'dispatched_at' => DB::raw('created_at'), 'received_at' => DB::raw('created_at')]);
        DB::table('stock_outwards')->whereNull('uuid')->orderBy('id')->each(fn ($row) => DB::table('stock_outwards')->where('id', $row->id)->update(['uuid' => (string) Str::uuid7()]));
        // Old lines were booked to the source product in the target store; keep that for reversals.
        DB::table('stock_outward_items')->update(['received_qty' => DB::raw('quantity'), 'received_product_id' => DB::raw('product_id'), 'received_variant_id' => DB::raw('variant_id')]);
    }

    public function down(): void
    {
        Schema::table('barcodes', function (Blueprint $table) {
            $table->dropIndex(['stock_outward_id']);
            $table->dropIndex(['stock_outward_item_id']);
            $table->dropColumn(['stock_outward_id', 'stock_outward_item_id']);
        });
        Schema::table('stock_outward_items', function (Blueprint $table) {
            $table->dropColumn(['product_name', 'product_code', 'sku', 'product_barcode', 'selling_mode', 'hsn_code', 'unit', 'size', 'design_no', 'brand_name', 'brand_code',
                'color_name', 'tax_name', 'mrp', 'selling_price', 'received_qty', 'damaged_qty', 'receive_note', 'received_product_id', 'received_variant_id']);
        });
        Schema::table('stock_outwards', function (Blueprint $table) {
            $table->dropIndex(['status', 'target_store_id']);
            $table->dropUnique(['uuid']);
            $table->dropColumn(['uuid', 'dispatched_at', 'received_at', 'received_by', 'receive_notes', 'cancelled_at']);
        });
    }
};
