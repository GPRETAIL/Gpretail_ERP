<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('stores')->count() === 1) {
            DB::table('employees')->whereNull('store_id')->update(['store_id' => DB::table('stores')->value('id')]);
        }
    }

    public function down(): void
    {
        // Store ownership is business data and must not be removed by rollback.
    }
};
