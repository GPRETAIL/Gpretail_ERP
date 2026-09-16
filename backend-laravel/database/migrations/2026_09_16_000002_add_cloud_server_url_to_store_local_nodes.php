<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            if (! Schema::hasColumn('store_local_nodes', 'cloud_server_url')) {
                $table->string('cloud_server_url')->nullable()->after('local_server_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            if (Schema::hasColumn('store_local_nodes', 'cloud_server_url')) {
                $table->dropColumn('cloud_server_url');
            }
        });
    }
};
