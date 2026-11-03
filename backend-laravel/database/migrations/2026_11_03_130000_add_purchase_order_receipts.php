<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Receiving against a purchase order: a direct purchase names the PO it delivers, each PO line keeps how much has
 * arrived, and an order closed because everything arrived (not by hand) reopens if a receipt is taken back.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('direct_purchases', function (Blueprint $table) {
            $table->foreignId('purchase_order_id')->nullable()->after('po_no')->constrained('purchase_orders')->nullOnDelete();
        });
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->decimal('received_qty', 15, 3)->default(0)->after('quantity');
        });
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->string('close_reason', 10)->nullable()->after('closed_at'); // RECEIVED or MANUAL
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', fn (Blueprint $table) => $table->dropColumn('close_reason'));
        Schema::table('purchase_order_items', fn (Blueprint $table) => $table->dropColumn('received_qty'));
        Schema::table('direct_purchases', fn (Blueprint $table) => $table->dropConstrainedForeignId('purchase_order_id'));
    }
};
