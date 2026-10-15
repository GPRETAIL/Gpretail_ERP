<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLES = ['suppliers', 'transports', 'agents', 'employees', 'hr_departments', 'hr_designations'];

    public function up(): void
    {
        // Preflight every table before MySQL's non-transactional index changes.
        foreach (self::TABLES as $name) {
            if (DB::table($name)->whereNull('store_id')->exists()
                || DB::table($name)->whereNotNull('store_id')->whereNotExists(function ($query) use ($name): void {
                    $query->selectRaw('1')->from('stores')->whereColumn('stores.id', $name.'.store_id');
                })->exists()) {
                throw new RuntimeException("Reconcile {$name} store ownership before migrating code uniqueness.");
            }
            if (DB::table($name)->select('store_id', 'code')->groupBy('store_id', 'code')->havingRaw('COUNT(*) > 1')->exists()) {
                throw new RuntimeException("Resolve duplicate {$name} codes within each store before migrating.");
            }
        }
        foreach (self::TABLES as $name) {
            if (! Schema::hasIndex($name, $name.'_store_id_code_unique')) {
                Schema::table($name, function (Blueprint $table): void {
                    $table->unique(['store_id', 'code']);
                });
            }
            if (Schema::hasIndex($name, $name.'_code_unique')) {
                Schema::table($name, function (Blueprint $table): void {
                    $table->dropUnique(['code']);
                });
            }
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $name) {
            if (DB::table($name)->select('code')->groupBy('code')->havingRaw('COUNT(*) > 1')->exists()) {
                throw new RuntimeException("Cannot restore global {$name} code uniqueness while stores share codes. Use a forward migration.");
            }
        }
        foreach (self::TABLES as $name) {
            if (! Schema::hasIndex($name, $name.'_code_unique')) {
                Schema::table($name, function (Blueprint $table): void {
                    $table->unique('code');
                });
            }
            if (Schema::hasIndex($name, $name.'_store_id_code_unique')) {
                Schema::table($name, function (Blueprint $table): void {
                    $table->dropUnique(['store_id', 'code']);
                });
            }
        }
    }
};
