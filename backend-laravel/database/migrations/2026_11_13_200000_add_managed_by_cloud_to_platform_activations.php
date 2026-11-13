<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An on-prem server takes its activation and store licence from its cloud (Vynerix admin allows one installation
 * per company). Such an install is marked here and never calls Vynerix admin itself.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('platform_activations', 'managed_by_cloud')) {
            Schema::table('platform_activations', fn (Blueprint $table) => $table->boolean('managed_by_cloud')->default(false));
        }
    }

    public function down(): void
    {
        Schema::table('platform_activations', fn (Blueprint $table) => $table->dropColumn('managed_by_cloud'));
    }
};
