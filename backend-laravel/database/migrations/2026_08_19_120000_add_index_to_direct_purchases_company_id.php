<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * company_id (added in 2026_08_19_000008_enhance_direct_purchases_table)
 * was a plain unsignedBigInteger with no index, despite being used in an
 * orWhere on every DirectPurchaseController::index() call
 * (store_id = ? OR company_id = ?) - forcing a table scan for that branch.
 * store_id already gets an index for free via foreignId()->constrained()
 * in the base table migration; this adds the matching one for company_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('direct_purchases', function (Blueprint $table) {
            $indexes = collect(Schema::getIndexes('direct_purchases'))->pluck('name');
            if (!$indexes->contains('direct_purchases_company_id_index')) {
                $table->index('company_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('direct_purchases', function (Blueprint $table) {
            $indexes = collect(Schema::getIndexes('direct_purchases'))->pluck('name');
            if ($indexes->contains('direct_purchases_company_id_index')) {
                $table->dropIndex(['company_id']);
            }
        });
    }
};
