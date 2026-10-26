<?php

namespace App\Services;

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
            : Schema::connection($connection)->getForeignKeys($table);

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
}
