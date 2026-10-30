<?php

namespace App\Services;

use Illuminate\Database\Connection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Shared metadata only: never cache a user, store selection or ownership result. */
class StoreSchema
{
    private array $metadata = [];

    private array $revisions = [];

    public function columns(string $table, ?string $connection = null): array
    {
        return $this->read('columns', $table, $connection);
    }

    public function foreignKeys(string $table, ?string $connection = null): array
    {
        return $this->read('foreignKeys', $table, $connection);
    }

    private function read(string $kind, string $table, ?string $connection): array
    {
        $db = DB::connection($connection);
        $identity = hash('sha256', json_encode([$db->getName(), $db->getConfig('driver'), $db->getConfig('host'), $db->getConfig('port'), $db->getConfig('unix_socket'), $db->getDatabaseName()]));
        $key = $identity.':'.$kind.':'.$table;
        if (isset($this->metadata[$key])) {
            return $this->metadata[$key];
        }
        $load = fn () => $kind === 'columns'
            ? Schema::connection($connection)->getColumnListing($table)
            : $this->loadForeignKeys($db, $table);

        // Unit tests alter schemas directly; always inspect their current schema.
        // HTTP/production caches use a cheap migration-history query per connection
        // per request, so migrate/rollback invalidates before ownership is evaluated.
        if (! config('store_scope.schema_cache_enabled', ! app()->runningUnitTests())) {
            return $this->metadata[$key] = $load();
        }
        $revision = $this->revisions[$identity] ??= hash('sha256', $db->table('migrations')->orderBy('id')->get(['migration', 'batch'])->toJson());
        $cacheKey = 'store-schema:v1:'.$revision.':'.$key;
        try {
            // A file cache avoids adding database-cache queries to each POS read.
            $value = Cache::store('file')->remember($cacheKey, 3600, $load);
        } catch (\Exception) {
            // A non-writable cache must never disable store isolation.
            $value = $load();
        }

        return $this->metadata[$key] = $value;
    }

    private function loadForeignKeys(Connection $db, string $table): array
    {
        $schema = $db->getSchemaBuilder();
        if (! in_array($db->getDriverName(), ['mysql', 'mariadb'], true)) {
            return $schema->getForeignKeys($table);
        }

        [$database, $table] = $schema->parseSchemaAndTable($table);
        $bindings = [$database ?? $db->getDatabaseName(), $db->getTablePrefix().$table];
        // Joining these virtual tables can scan the hosting server's catalogue
        // even for one tenant table. Separate bounded reads preserve all metadata.
        $keys = $db->selectFromWriteConnection(
            'select constraint_name, column_name, ordinal_position, referenced_table_schema, referenced_table_name, referenced_column_name '
            .'from information_schema.key_column_usage where table_schema = ? and table_name = ? '
            .'and referenced_table_name is not null order by constraint_name, ordinal_position', $bindings,
        );
        if ($keys === []) {
            return [];
        }
        $rules = array_column($db->selectFromWriteConnection(
            'select constraint_name, update_rule, delete_rule from information_schema.referential_constraints '
            .'where constraint_schema = ? and table_name = ?', $bindings,
        ), null, 'constraint_name');
        $foreignKeys = [];
        foreach ($keys as $key) {
            $name = $key->constraint_name;
            if (! isset($rules[$name])) {
                throw new \UnexpectedValueException('Foreign-key metadata changed during inspection.');
            }
            $foreignKeys[$name] ??= [
                'name' => $name, 'columns' => [],
                'foreign_schema' => $key->referenced_table_schema,
                'foreign_table' => $key->referenced_table_name,
                'foreign_columns' => [],
                'on_update' => strtolower($rules[$name]->update_rule),
                'on_delete' => strtolower($rules[$name]->delete_rule),
            ];
            $foreignKeys[$name]['columns'][] = $key->column_name;
            $foreignKeys[$name]['foreign_columns'][] = $key->referenced_column_name;
        }

        return array_values($foreignKeys);
    }
}
