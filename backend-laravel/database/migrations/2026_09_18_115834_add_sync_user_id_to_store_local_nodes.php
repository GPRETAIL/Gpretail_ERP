<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            $table->foreignId('sync_user_id')->nullable()->after('sync_token')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sync_user_id');
        });
    }
};
