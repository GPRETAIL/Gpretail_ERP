<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tracks exactly which physical barcode a POS line came from, so a PIECE
 * sale can deactivate that specific unit (it's sold, stop it scanning
 * again) and a return can reactivate it - without this, there was no way
 * to tell which Barcode row a cart line was ever scanned from.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_sale_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_sale_items', 'barcode_id')) {
                $table->foreignId('barcode_id')->nullable()->after('variant_id')->constrained('barcodes')->nullOnDelete();
            }
        });

        Schema::table('pos_return_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_return_items', 'barcode_id')) {
                $table->foreignId('barcode_id')->nullable()->after('variant_id')->constrained('barcodes')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('pos_sale_items', function (Blueprint $table) {
            if (Schema::hasColumn('pos_sale_items', 'barcode_id')) {
                $table->dropConstrainedForeignId('barcode_id');
            }
        });

        Schema::table('pos_return_items', function (Blueprint $table) {
            if (Schema::hasColumn('pos_return_items', 'barcode_id')) {
                $table->dropConstrainedForeignId('barcode_id');
            }
        });
    }
};
