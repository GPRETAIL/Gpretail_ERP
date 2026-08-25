<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            if (! Schema::hasColumn('store_local_nodes', 'last_catch_up_at')) {
                $table->timestamp('last_catch_up_at')->nullable()->after('last_health_check_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            if (Schema::hasColumn('store_local_nodes', 'last_catch_up_at')) {
                $table->dropColumn('last_catch_up_at');
            }
        });
    }
};
