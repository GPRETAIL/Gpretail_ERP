<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A store notification can now be addressed to one user (e.g. "your sales approval was approved"); without a
 * user_id it stays visible to everyone in the store, as before.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('store_id');
            $table->index(['store_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('app_notifications', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'user_id']);
            $table->dropColumn('user_id');
        });
    }
};
