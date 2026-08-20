<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * DirectPurchaseController used to call StockService::adjust() the moment
 * a purchase was saved, regardless of workflow stage - so goods became
 * sellable before barcodes existed or anyone had confirmed the receiving
 * workflow was done. Stock is now deferred until a purchase genuinely
 * reaches "Completed" (invoice_workflow_status=invoice_completed + real
 * barcodes generated). This column tracks whether that has happened yet,
 * so destroy() knows whether there's anything to reverse and update()
 * knows not to double-apply on a later edit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('direct_purchases', function (Blueprint $table) {
            if (!Schema::hasColumn('direct_purchases', 'stock_applied')) {
                $table->boolean('stock_applied')->default(false)->after('invoice_workflow_status');
            }
        });

        // Existing rows already had their stock applied unconditionally on
        // create under the old behavior - this reflects that reality, not
        // a stock change.
        DB::table('direct_purchases')->update(['stock_applied' => true]);
    }

    public function down(): void
    {
        Schema::table('direct_purchases', function (Blueprint $table) {
            if (Schema::hasColumn('direct_purchases', 'stock_applied')) {
                $table->dropColumn('stock_applied');
            }
        });
    }
};
