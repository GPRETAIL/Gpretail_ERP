<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * With Warehouse Customisation's "sell without stock" on, a sale can take more than is in stock. Each bill line
 * records how much of it was not covered by stock, so those sales can be listed and highlighted.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['pos_sale_items', 'dealer_invoice_items'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->decimal('short_qty', 12, 3)->default(0);
            });
        }
    }

    public function down(): void
    {
        foreach (['pos_sale_items', 'dealer_invoice_items'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('short_qty');
            });
        }
    }
};
