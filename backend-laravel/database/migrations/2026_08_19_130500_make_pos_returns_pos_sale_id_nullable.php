<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A "standalone" POS return (a barcode-scanned return with no originating
 * sale) has nothing to put in pos_sale_id - but the column was created
 * NOT NULL, so PosReturnController::store() couldn't actually save one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_returns', function (Blueprint $table) {
            $table->unsignedBigInteger('pos_sale_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('pos_returns', function (Blueprint $table) {
            $table->unsignedBigInteger('pos_sale_id')->nullable(false)->change();
        });
    }
};
