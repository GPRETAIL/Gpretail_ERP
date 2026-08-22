<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ConfigurationController::getCounters() used to be 100% hardcoded (two
 * fake counters baked into PHP, never read from the database at all),
 * even though the generic Configuration master page (Sales > Masters >
 * Configuration, type=COUNTER/LOCATION) already writes real rows into
 * system_configurations for exactly this purpose. Seeds real starting
 * data so the "Assign a Counter" dialog and any Location dropdown have
 * something real to show immediately, without leaving the store with an
 * empty list right after the hardcoded stub is removed.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $exists = fn (string $key) => DB::table('system_configurations')->where('key', $key)->exists();

        if (!$exists('counter')) {
            DB::table('system_configurations')->insert([
                ['key' => 'counter', 'config_key' => 'counter', 'value' => 'Counter 01 - Main Terminal', 'config_value' => 'Counter 01 - Main Terminal', 'group' => 'counter', 'group_name' => 'counter', 'created_at' => $now, 'updated_at' => $now],
                ['key' => 'counter', 'config_key' => 'counter', 'value' => 'Counter 02 - Express Checkout', 'config_value' => 'Counter 02 - Express Checkout', 'group' => 'counter', 'group_name' => 'counter', 'created_at' => $now, 'updated_at' => $now],
            ]);
        }

        if (!$exists('location')) {
            DB::table('system_configurations')->insert([
                ['key' => 'location', 'config_key' => 'location', 'value' => 'Main Warehouse Floor', 'config_value' => 'Main Warehouse Floor', 'group' => 'location', 'group_name' => 'location', 'created_at' => $now, 'updated_at' => $now],
                ['key' => 'location', 'config_key' => 'location', 'value' => 'Mezzanine Storage', 'config_value' => 'Mezzanine Storage', 'group' => 'location', 'group_name' => 'location', 'created_at' => $now, 'updated_at' => $now],
            ]);
        }
    }

    public function down(): void
    {
        DB::table('system_configurations')->where('key', 'counter')->delete();
        DB::table('system_configurations')->where('key', 'location')->delete();
    }
};
