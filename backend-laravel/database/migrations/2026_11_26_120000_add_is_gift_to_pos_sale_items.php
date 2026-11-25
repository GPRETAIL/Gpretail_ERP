<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A gift item is a line given free with a bill: it goes out of stock like any sale line but has no price. The Gift Issue
 * report reads these lines, so a cancelled bill (whose lines are removed) drops out of it by itself.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_sale_items', function (Blueprint $table) {
            $table->boolean('is_gift')->default(false)->after('subtotal');
            $table->index('is_gift');
        });
    }

    public function down(): void
    {
        Schema::table('pos_sale_items', function (Blueprint $table) {
            $table->dropIndex(['is_gift']);
            $table->dropColumn('is_gift');
        });
    }
};
