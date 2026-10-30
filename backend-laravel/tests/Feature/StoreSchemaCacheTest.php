<?php

namespace Tests\Feature;

use App\Services\StoreSchema;
use Illuminate\Cache\ArrayStore;
use Illuminate\Cache\Repository;
use Illuminate\Database\MySqlConnection;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StoreSchemaCacheTest extends TestCase
{
    use RefreshDatabase;

    public function test_mysql_metadata_uses_two_scoped_reads_and_preserves_composite_keys_and_rules(): void
    {
        $connection = $this->mysqlMetadataConnection();
        $connection->shouldReceive('selectFromWriteConnection')->once()
            ->with(\Mockery::on(fn ($sql) => str_contains($sql, 'information_schema.key_column_usage') && ! str_contains($sql, ' join ')), ['archive_db', 'tenant_lines'])
            ->andReturn([
                (object) ['constraint_name' => 'line_parent', 'column_name' => 'parent_id', 'ordinal_position' => 1, 'referenced_table_schema' => 'archive_db', 'referenced_table_name' => 'tenant_parents', 'referenced_column_name' => 'id'],
                (object) ['constraint_name' => 'line_parent', 'column_name' => 'store_id', 'ordinal_position' => 2, 'referenced_table_schema' => 'archive_db', 'referenced_table_name' => 'tenant_parents', 'referenced_column_name' => 'store_id'],
            ]);
        $connection->shouldReceive('selectFromWriteConnection')->once()
            ->with(\Mockery::on(fn ($sql) => str_contains($sql, 'information_schema.referential_constraints') && ! str_contains($sql, ' join ')), ['archive_db', 'tenant_lines'])
            ->andReturn([(object) ['constraint_name' => 'line_parent', 'update_rule' => 'CASCADE', 'delete_rule' => 'RESTRICT']]);
        $this->assertSame([[
            'name' => 'line_parent', 'columns' => ['parent_id', 'store_id'],
            'foreign_schema' => 'archive_db', 'foreign_table' => 'tenant_parents',
            'foreign_columns' => ['id', 'store_id'], 'on_update' => 'cascade', 'on_delete' => 'restrict',
        ]], (new StoreSchema)->foreignKeys('archive_db.lines', 'metadata_probe'));
    }

    public function test_mysql_table_without_foreign_keys_uses_connection_database_and_prefix(): void
    {
        $connection = $this->mysqlMetadataConnection();
        $connection->shouldReceive('selectFromWriteConnection')->once()
            ->with(\Mockery::on(fn ($sql) => str_contains($sql, 'information_schema.key_column_usage')), ['tenant_db', 'tenant_lines'])
            ->andReturn([]);
        $this->assertSame([], (new StoreSchema)->foreignKeys('lines', 'metadata_probe'));
    }

    public function test_missing_mysql_constraint_rules_fail_closed(): void
    {
        $connection = $this->mysqlMetadataConnection();
        $connection->shouldReceive('selectFromWriteConnection')->once()
            ->with(\Mockery::on(fn ($sql) => str_contains($sql, 'information_schema.key_column_usage')), ['tenant_db', 'tenant_lines'])
            ->andReturn([(object) ['constraint_name' => 'missing_rule']]);
        $connection->shouldReceive('selectFromWriteConnection')->once()
            ->with(\Mockery::on(fn ($sql) => str_contains($sql, 'information_schema.referential_constraints')), ['tenant_db', 'tenant_lines'])
            ->andReturn([]);
        $this->expectException(\UnexpectedValueException::class);
        (new StoreSchema)->foreignKeys('lines', 'metadata_probe');
    }

    private function mysqlMetadataConnection(): MySqlConnection
    {
        config(['store_scope.schema_cache_enabled' => false]);
        $connection = \Mockery::mock(MySqlConnection::class)->makePartial();
        $connection->shouldReceive('getName')->andReturn('metadata_probe');
        $connection->shouldReceive('getConfig')->andReturn(null);
        $connection->shouldReceive('getDriverName')->andReturn('mysql');
        $connection->shouldReceive('getDatabaseName')->andReturn('tenant_db');
        $connection->shouldReceive('getTablePrefix')->andReturn('tenant_');
        DB::shouldReceive('connection')->with('metadata_probe')->andReturn($connection);

        return $connection;
    }

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
