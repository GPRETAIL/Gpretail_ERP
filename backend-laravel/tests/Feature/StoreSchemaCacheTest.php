<?php

namespace Tests\Feature;

use App\Services\StoreSchema;
use Illuminate\Cache\ArrayStore;
use Illuminate\Cache\Repository;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StoreSchemaCacheTest extends TestCase
{
    use RefreshDatabase;

    public function test_metadata_is_shared_between_requests_and_invalidates_on_migration_and_rollback(): void
    {
        config(['store_scope.schema_cache_enabled' => true]);
        Cache::shouldReceive('store')->with('file')->andReturn(new Repository(new ArrayStore));
        Schema::create('pos_schema_probe', fn (Blueprint $table) => $table->id());
        $metadataQueries = 0;
        DB::listen(function ($event) use (&$metadataQueries) {
            if (str_contains(strtolower($event->sql), 'pragma_table_xinfo')) {
                $metadataQueries++;
            }
        });
        $this->assertSame(['id'], (new StoreSchema)->columns('pos_schema_probe'));
        $first = $metadataQueries;
        $this->assertGreaterThan(0, $first);
        $this->assertSame(['id'], (new StoreSchema)->columns('pos_schema_probe'));
        $this->assertSame($first, $metadataQueries);
        Schema::table('pos_schema_probe', fn (Blueprint $table) => $table->unsignedBigInteger('store_id')->nullable());
        DB::table('migrations')->insert(['migration' => '2099_pos_schema_probe', 'batch' => 999]);
        $this->assertContains('store_id', (new StoreSchema)->columns('pos_schema_probe'));
        Schema::table('pos_schema_probe', fn (Blueprint $table) => $table->dropColumn('store_id'));
        DB::table('migrations')->where('migration', '2099_pos_schema_probe')->delete();
        $this->assertSame(['id'], (new StoreSchema)->columns('pos_schema_probe'));
        Schema::drop('pos_schema_probe');
    }

    public function test_unavailable_cache_falls_back_to_current_database_metadata(): void
    {
        config(['store_scope.schema_cache_enabled' => true]);
        Cache::shouldReceive('store')->with('file')->andThrow(new \RuntimeException('Cache unavailable'));
        $this->assertContains('store_id', (new StoreSchema)->columns('pos_sales'));
        $this->assertNotEmpty((new StoreSchema)->foreignKeys('pos_sale_items'));
    }
}
