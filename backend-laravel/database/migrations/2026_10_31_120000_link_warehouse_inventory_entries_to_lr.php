<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The LR workflow (LR entry -> invoice -> inventory entry -> barcodes) had no stored link from an
 * invoice or inventory entry back to its LR, and inventory entries could not hold the warehouse
 * form at all. Invoices kept the LR only inside master_details, so they are backfilled from it.
 */
return new class extends Migration
{
    private const ENTRY_LINKS = ['transport_entry_id', 'invoice_id', 'supplier_id', 'product_id', 'brand_id', 'pattern_id', 'style_id',
        'fit_id', 'sleeve_id', 'type_id', 'material_id', 'color_id', 'tax_id'];

    public function up(): void
    {
        Schema::table('inventory_entries', function (Blueprint $table) {
            foreach (self::ENTRY_LINKS as $column) {
                $table->unsignedBigInteger($column)->nullable();
            }
            $table->json('master_details')->nullable();
            $table->index(['store_id', 'transport_entry_id']);
            $table->index('invoice_id');
        });
        Schema::table('inventory_entry_items', function (Blueprint $table) {
            $table->unsignedInteger('s_no')->nullable();
            $table->string('size', 100)->nullable();
            $table->string('design_no', 100)->nullable();
            $table->json('master_details')->nullable();
        });
        Schema::table('purchase_invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('transport_entry_id')->nullable();
            $table->index(['store_id', 'transport_entry_id']);
        });

        DB::table('purchase_invoices')->whereNotNull('master_details')->orderBy('id')->each(function ($invoice) {
            $lr = json_decode($invoice->master_details, true)['transport_entry_id'] ?? null;
            if (is_numeric($lr)) {
                DB::table('purchase_invoices')->where('id', $invoice->id)->update(['transport_entry_id' => (int) $lr]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchase_invoices', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'transport_entry_id']);
            $table->dropColumn('transport_entry_id');
        });
        Schema::table('inventory_entry_items', function (Blueprint $table) {
            $table->dropColumn(['s_no', 'size', 'design_no', 'master_details']);
        });
        Schema::table('inventory_entries', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'transport_entry_id']);
            $table->dropIndex(['invoice_id']);
            $table->dropColumn([...self::ENTRY_LINKS, 'master_details']);
        });
    }
};
