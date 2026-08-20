<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('barcodes', function (Blueprint $table) {
            // Source tracking — which warehouse workflow created this barcode
            $table->unsignedBigInteger('direct_purchase_id')->nullable()->after('variant_id');
            $table->unsignedBigInteger('direct_purchase_item_id')->nullable()->after('direct_purchase_id');
            $table->unsignedBigInteger('inventory_entry_id')->nullable()->after('direct_purchase_item_id');
            $table->unsignedBigInteger('inventory_item_id')->nullable()->after('inventory_entry_id');
            $table->integer('jump_detail_index')->nullable()->after('inventory_item_id');

            // Additional pricing fields used on barcode stickers
            $table->decimal('discount_perc', 8, 2)->default(0)->after('selling_price');
            $table->decimal('final_price', 15, 2)->default(0)->after('discount_perc');
            $table->string('code_type', 20)->default('barcode')->after('final_price'); // 'barcode' or 'code' (QR)
            $table->string('product_name', 255)->nullable()->after('code_type');
            $table->string('size', 100)->nullable()->after('product_name');
            $table->string('design_no', 100)->nullable()->after('size');
            $table->string('color_name', 100)->nullable()->after('design_no');

            // Indexes for common query patterns
            $table->index('direct_purchase_id');
            $table->index('inventory_entry_id');
            $table->index('inventory_item_id');
        });
    }

    public function down(): void
    {
        Schema::table('barcodes', function (Blueprint $table) {
            $table->dropIndex(['direct_purchase_id']);
            $table->dropIndex(['inventory_entry_id']);
            $table->dropIndex(['inventory_item_id']);
            $table->dropColumn([
                'direct_purchase_id',
                'direct_purchase_item_id',
                'inventory_entry_id',
                'inventory_item_id',
                'jump_detail_index',
                'discount_perc',
                'final_price',
                'code_type',
                'product_name',
                'size',
                'design_no',
                'color_name',
            ]);
        });
    }
};
