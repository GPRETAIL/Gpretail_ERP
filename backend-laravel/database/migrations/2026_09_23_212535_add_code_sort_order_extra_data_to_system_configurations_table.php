<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('system_configurations', function (Blueprint $table) {
            $table->string('code')->nullable()->after('config_key');
            $table->integer('sort_order')->default(0)->after('code');
            $table->json('extra_data')->nullable()->after('sort_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('system_configurations', function (Blueprint $table) {
            $table->dropColumn(['code', 'sort_order', 'extra_data']);
        });
    }
};
