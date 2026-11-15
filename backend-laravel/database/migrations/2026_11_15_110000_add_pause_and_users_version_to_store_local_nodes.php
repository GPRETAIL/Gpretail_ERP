<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** On-prem sync: a Pause switch, and the version of the cloud's user list last copied (copy only on change). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            if (! Schema::hasColumn('store_local_nodes', 'sync_paused')) {
                $table->boolean('sync_paused')->default(false);
                $table->string('users_version', 64)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            $table->dropColumn(['sync_paused', 'users_version']);
        });
    }
};
