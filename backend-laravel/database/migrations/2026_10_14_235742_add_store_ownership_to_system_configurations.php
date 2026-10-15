<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('system_configurations', function (Blueprint $table) {
            Schema::table('system_configurations', fn (Blueprint $table) => $table->foreignId('store_id')->nullable()->constrained('stores')->restrictOnDelete());
            $stores = DB::table('stores')->pluck('id');
            if ($stores->count() === 1) {
                DB::table('system_configurations')->whereNull('store_id')->update(['store_id' => $stores->first()]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('system_configurations', function (Blueprint $table) {
            Schema::table('system_configurations', fn (Blueprint $table) => $table->dropConstrainedForeignId('store_id'));
        });
    }
};
