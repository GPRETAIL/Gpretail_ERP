<?php

namespace App\Services\Platform;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use App\Services\Backup\BackupService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The on-prem server's half of failover:
 * - connects to the cloud once, with a cloud admin's sign-in, and then pulls the store's data;
 * - keeps the store's users copied from the cloud (the cloud is the master for staff accounts);
 * - answers whether both sides are caught up, which counters need before leaving the cloud after an outage.
 */
class LocalNodeRegistration
{
    /** Tables whose rows mean this store already does business here; renumbering it is then unsafe. */
    private const BUSINESS_TABLES = ['pos_sales', 'pos_returns', 'products', 'stocks', 'stock_transactions', 'customers', 'purchase_invoices',
        'direct_purchases', 'dealer_invoices', 'inventory_entries', 'vouchers'];

    public const STATE_CACHE_KEY = 'sync:handshake-state';

    public function __construct(private BackupService $backup) {}

    public static function cloudApiBase(?string $url): string
    {
        $base = rtrim(trim((string) ($url ?: config('sync.cloud_api_base_url'))), '/');

        return $base === '' || str_ends_with($base, '/api') ? $base : $base.'/api';
    }

    public function connect(Store $store, array $input, string $backendUrl): StoreLocalNode
    {
        abort_unless(config('sync.node_role') === 'local', 409, 'Only an on-prem server (SYNC_NODE_ROLE=local) connects to the cloud.');
        $cloudApi = self::cloudApiBase($input['cloud_server_url']);

        try {
            $response = Http::acceptJson()->timeout(20)->post($cloudApi.'/sync/register-node', [
                'username' => $input['username'],
                'password' => $input['password'],
                'platform_store_id' => $store->platform_store_id !== null ? (string) $store->platform_store_id : null,
                'store_code' => $store->code,
                'counter_url' => $input['counter_url'],
            ]);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages(['cloud_server_url' => 'The cloud could not be reached at '.$cloudApi.'. Check the address and this server\'s internet connection.']);
        }
        if (! $response->successful()) {
            $message = $response->json('message') ?: collect($response->json('errors') ?? [])->flatten()->first() ?: 'The cloud refused the connection (HTTP '.$response->status().').';
            throw ValidationException::withMessages(['username' => $message]);
        }
        $cloudStoreId = (int) $response->json('data.store_id');
        abort_unless($cloudStoreId > 0 && $response->json('data.tenant_key') && $response->json('data.sync_token'), 502, 'The cloud sent an incomplete answer.');

        $store = $this->alignStoreId($store, $cloudStoreId);
        $node = StoreLocalNode::firstOrNew(['store_id' => $store->id]);
        // An on-prem install represents exactly one store.
        StoreLocalNode::where('store_id', '!=', $store->id)->update(['enabled' => false]);
        $node->fill([
            'tenant_key' => $response->json('data.tenant_key'),
            'sync_token' => $response->json('data.sync_token'),
            'enabled' => true,
            'local_server_url' => $backendUrl,
            'counter_url' => $input['counter_url'],
            'cloud_server_url' => rtrim($input['cloud_server_url'], '/'),
        ])->save();
        Cache::forget(self::STATE_CACHE_KEY);

        // Users first: the store's bills and records point at them.
        $this->copyUsers($node);
        $this->pullSnapshot($node);

        return $node->refresh();
    }

    /**
     * The on-prem store must carry the cloud's store number, because synced writes name it. A fresh install
     * is renumbered to match; one that already holds business data is refused.
     */
    private function alignStoreId(Store $store, int $cloudId): Store
    {
        if ($store->id === $cloudId) {
            return $store;
        }
        if (Store::whereKey($cloudId)->exists()) {
            throw ValidationException::withMessages(['store' => "Another store here already uses the cloud's store number {$cloudId}. Reinstall this server's database before connecting."]);
        }
        foreach (self::BUSINESS_TABLES as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'store_id') && DB::table($table)->where('store_id', $store->id)->exists()) {
                throw ValidationException::withMessages(['store' => "This server already has {$table} for store number {$store->id}, but the cloud calls it {$cloudId}. Connect a fresh install, or reinstall this server's database."]);
            }
        }

        $oldId = $store->id;
        Schema::disableForeignKeyConstraints();
        try {
            DB::transaction(function () use ($oldId, $cloudId) {
                foreach (Schema::getTableListing(schemaQualified: false) as $table) {
                    if ($table !== 'stores' && Schema::hasColumn($table, 'store_id')) {
                        DB::table($table)->where('store_id', $oldId)->update(['store_id' => $cloudId]);
                    }
                }
                DB::table('stores')->where('id', $oldId)->update(['id' => $cloudId]);
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        return Store::findOrFail($cloudId);
    }

    public function pullSnapshot(StoreLocalNode $node): int
    {
        @set_time_limit(600);
        $response = Http::withHeaders($this->nodeHeaders($node))->timeout(300)
            ->get(self::cloudApiBase($node->cloud_server_url).'/sync/catch-up-export');
        if (! $response->successful()) {
            throw ValidationException::withMessages(['cloud_server_url' => 'Connected, but the store data could not be copied from the cloud (HTTP '.$response->status().'). It will be retried by the sync job.']);
        }
        $result = self::mergeSnapshot($this->backup, $response->json('data.tables') ?? []);
        self::continueNumbering($node->store_id, $response->json('data.counters') ?? []);
        $node->forceFill(['last_catch_up_at' => now()])->save();

        return (int) $result['mergedRows'];
    }

    /**
     * Merges a cloud snapshot of the store. It can name people this server doesn't have (a former cashier, the
     * cloud's sync user), so references are not checked while it is applied: the cloud is the source.
     */
    public static function mergeSnapshot(BackupService $backup, array $tables): array
    {
        Schema::disableForeignKeyConstraints();
        try {
            return $backup->mergeTablesFromExport($tables);
        } finally {
            Schema::enableForeignKeyConstraints();
        }
    }

    /** Raises this server's document counters to at least the cloud's, never lowering one. */
    public static function continueNumbering(int $storeId, array $counters): void
    {
        foreach ($counters as $counter) {
            $key = ['store_id' => $storeId, 'prefix' => (string) $counter['prefix'], 'period' => (string) $counter['period'], 'origin' => (string) ($counter['origin'] ?? 'normal')];
            $current = DB::table('document_number_counters')->where($key)->value('last_seq');
            if ($current === null) {
                DB::table('document_number_counters')->insert($key + ['last_seq' => (int) $counter['last_seq'], 'created_at' => now(), 'updated_at' => now()]);
            } elseif ((int) $counter['last_seq'] > (int) $current) {
                DB::table('document_number_counters')->where($key)->update(['last_seq' => (int) $counter['last_seq'], 'updated_at' => now()]);
            }
        }
    }

    /**
     * Copies the store's users from the cloud: same username, password and permissions. A copied user who is
     * no longer on the cloud list is switched off and signed out. Users made only on this server are untouched.
     */
    public function copyUsers(StoreLocalNode $node): ?int
    {
        try {
            $response = Http::withHeaders($this->nodeHeaders($node))->timeout(15)
                ->get(self::cloudApiBase($node->cloud_server_url).'/sync/users');
        } catch (\Throwable) {
            return null;
        }
        if (! $response->successful()) {
            return null;
        }
        $rows = $response->json('data.users');
        if (! is_array($rows)) {
            return null; // Never treat a malformed answer as "everyone was removed".
        }
        $seen = [];

        DB::transaction(function () use ($rows, $node, &$seen) {
            foreach ($rows as $row) {
                if (empty($row['username']) || ($row['role'] ?? '') === 'sync_system') {
                    continue;
                }
                $cloudId = (int) $row['id'];
                $user = User::where('cloud_user_id', $cloudId)->first()
                    ?? User::where('username', $row['username'])->first()
                    ?? ($row['email'] ? User::whereRaw('LOWER(email) = ?', [strtolower($row['email'])])->first() : null)
                    ?? new User;
                if (! $user->exists && ! User::whereKey($cloudId)->exists()) {
                    $user->id = $cloudId; // Same number on both sides wherever it is free.
                }
                $hash = (string) ($row['password'] ?? '');
                $user->forceFill(collect($row)->except(['id', 'password'])->all() + ['cloud_user_id' => $cloudId]);
                if (! $user->exists) {
                    $user->password = Str::random(64); // Replaced by the cloud's hash just below.
                }
                if ($user->isDirty()) {
                    $user->save(); // Model events sign the user out when the role or access changed.
                }
                // The cloud's hash is copied as is (the "hashed" cast would refuse a different bcrypt cost).
                if ($hash !== '' && $user->getRawOriginal('password') !== $hash) {
                    DB::table('users')->where('id', $user->id)->update(['password' => $hash]);
                    $user->tokens()->delete();
                }
                if ($user->store_id !== $node->store_id && ! ($user->store_id === null && in_array($user->role, ['admin', 'super_admin'], true))) {
                    $user->assignedStores()->syncWithoutDetaching([$node->store_id]);
                }
                $seen[] = $user->id;
            }
            User::whereNotNull('cloud_user_id')->whereNotIn('id', $seen)->where('is_active', true)->get()
                ->each(fn (User $gone) => $gone->forceFill(['is_active' => false])->save());
        });
        $node->forceFill(['last_users_sync_at' => now(), 'users_synced' => count($seen)])->save();

        return count($seen);
    }

    /**
     * Whether both sides are caught up, for counters waiting on the cloud to come back:
     * - ready: nothing left to pull or push;
     * - catching_up: the cloud holds writes this server hasn't applied yet, or this server has unsent writes;
     * - cloud_unreachable: nothing reachable to wait for, so this server is used.
     * Cached for 10 seconds: every counter asks every 5 seconds.
     */
    public function handshakeState(StoreLocalNode $node): array
    {
        return Cache::remember(self::STATE_CACHE_KEY, 10, function () use ($node) {
            $localBacklog = SyncOutboxEvent::where('store_id', $node->store_id)->where('status', 'pending')->count();
            try {
                $response = Http::withHeaders($this->nodeHeaders($node))->timeout(3)
                    ->get(self::cloudApiBase($node->cloud_server_url).'/sync/outbound/count');
                $cloudBacklog = $response->successful() ? (int) $response->json('data.pending') : null;
            } catch (\Throwable) {
                $cloudBacklog = null;
            }
            $state = $cloudBacklog === null ? 'cloud_unreachable' : ($cloudBacklog + $localBacklog > 0 ? 'catching_up' : 'ready');

            return ['state' => $state, 'cloud_backlog' => $cloudBacklog, 'local_backlog' => $localBacklog];
        });
    }

    private function nodeHeaders(StoreLocalNode $node): array
    {
        return ['X-Tenant-Key' => $node->tenant_key, 'X-Sync-Token' => $node->sync_token, 'Accept' => 'application/json'];
    }
}
