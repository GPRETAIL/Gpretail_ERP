<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Same record numbers on the cloud and on-prem (SyncIds): each on-prem server's id series slot, and a count of
 * synced writes whose rows could not all keep the source's ids.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            if (! Schema::hasColumn('store_local_nodes', 'id_slot')) {
                $table->unsignedSmallInteger('id_slot')->nullable()->unique();
                $table->unsignedInteger('id_drift_count')->default(0);
            }
        });
    }

    public function down(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            $table->dropUnique(['id_slot']);
            $table->dropColumn(['id_slot', 'id_drift_count']);
        });
    }
};
