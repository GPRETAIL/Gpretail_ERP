<?php

namespace App\Services\Platform;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Runs one local<->cloud sync cycle: push this local install's queued writes up
 * to cloud, pull+apply whatever cloud queued for this store (writes accepted
 * directly by cloud during a failover window), then heartbeat. Driven by the
 * `sync:cycle` artisan command (installed via the local machine's own OS task
 * scheduler/cron -- a shop LAN box generally isn't inbound-reachable, so this
 * can't be triggered by an external pinger the way BackupController::scheduledRun
 * is) and by SyncController::runCycle() as an HTTP fallback for installs that do
 * have inbound access and prefer that.
 */
class SyncCycleService
{
    private const MAX_BATCH = 25;

    /** Pull batches per cycle, so catching up after an outage takes seconds, not minutes. */
    private const MAX_PULL_BATCHES = 8;

    /** Tries before a write that only ever gets a server error from the cloud is set aside as failed. */
    private const MAX_SERVER_ERROR_TRIES = 5;

    public const LOCK = 'sync:cycle';

    private const LAST_RESULT = 'sync:last-result';

    /** When idle, cloud changes are fetched and the heartbeat sent once a minute; after any activity, every cycle for 5 minutes. */
    private const IDLE_SECONDS = 60;

    private const BUSY_MINUTES = 5;

    private const REMOTE_DUE_AT = 'sync:remote-due-at';

    private const BUSY_UNTIL = 'sync:busy-until';

    /** @param  bool  $now  Sync now / Re-copy: everything, at once, even when paused or idle */
    public function run(bool $now = false): array
    {
        if (config('sync.node_role') !== 'local') {
            return ['ran' => false, 'reason' => 'This install is not configured as a local node (SYNC_NODE_ROLE=local).'];
        }

        $node = StoreLocalNode::where('enabled', true)->first();
        if (! $node) {
            return ['ran' => false, 'reason' => 'No enabled local-server configuration found.'];
        }

        if ($node->sync_paused && ! $now) {
            return ['ran' => false, 'paused' => true, 'reason' => 'Sync is paused on this server. Resume it in Configure Local Server.'];
        }

        $cloudApi = LocalNodeRegistration::cloudApiBase($node->cloud_server_url);
        if (! $cloudApi) {
            return ['ran' => false, 'reason' => 'sync.cloud_api_base_url is not configured.'];
        }

        $store = Store::find($node->store_id);
        $activation = PlatformActivation::current();
        if ($store && ($store->platform_store_id || $activation?->activated)) {
            $licence = app(StoreLicenceVerifier::class)->verify($store, $activation);
            if (! $licence['ok'] && $activation?->managed_by_cloud) {
                // This server's licence comes from its cloud in the heartbeat reply. Ask for it before giving up,
                // or a lapsed licence could never be replaced by its renewal.
                $this->sendHeartbeat($node, $cloudApi);
                $licence = app(StoreLicenceVerifier::class)->verify($store->refresh(), PlatformActivation::current());
            }
            if (! $licence['ok']) {
                return ['ran' => false, 'reason' => $licence['message'] ?? 'Store licence is invalid or expired.'];
            }
        }

        // One sync at a time: the 15-second job, Sync now and Re-copy share this lock.
        $lock = Cache::lock(self::LOCK, 900);
        if (! $lock->get()) {
            return ['ran' => false, 'busy' => true, 'reason' => 'A sync is already running. Try again in a moment.'];
        }
        try {
            $waiting = SyncOutboxEvent::where('store_id', $node->store_id)->where('status', 'pending')->count();
            if ($waiting > 0) {
                SyncProgress::start('sync', 'Syncing', $waiting);
            }
            // Writes made here go at once. The cloud's own changes, the heartbeat and the user list are fetched
            // once a minute when nothing is happening, and every cycle for a few minutes after any activity.
            $result = ['ran' => true, 'pushed' => $this->pushPendingWrites($node, $cloudApi),
                'pulled' => ['applied' => 0, 'failed' => 0, 'errors' => []], 'users' => null, 'heartbeat_ok' => null, 'remote' => false];
            $busy = (int) Cache::get(self::BUSY_UNTIL, 0) > now()->timestamp;
            if ($now || $waiting > 0 || $busy || (int) Cache::get(self::REMOTE_DUE_AT, 0) <= now()->timestamp) {
                $result['remote'] = true;
                $result['pulled'] = $this->pullAndApplyCloudWrites($node, $cloudApi);
                $heartbeat = $this->sendHeartbeat($node, $cloudApi);
                $result['heartbeat_ok'] = $heartbeat['ok'];
                // The cloud is the master for staff accounts; the counters sign in here with the same ones. Copied
                // when the cloud's list changed (or on Sync now), not every cycle.
                $version = $heartbeat['users_version'];
                if ($now || $version === null || $version !== $node->users_version) {
                    $result['users'] = app(LocalNodeRegistration::class)->copyUsers($node);
                    if ($result['users'] !== null && $version !== null) {
                        $node->forceFill(['users_version' => $version]);
                    }
                }
                Cache::put(self::REMOTE_DUE_AT, now()->addSeconds(self::IDLE_SECONDS)->timestamp, 3600);
            }
            if ($result['pushed']['sent'] > 0 || $result['pulled']['applied'] > 0) {
                Cache::put(self::BUSY_UNTIL, now()->addMinutes(self::BUSY_MINUTES)->timestamp, 3600);
            }
            $node->forceFill(['last_cycle_at' => now()])->save();
            Cache::forever(self::LAST_RESULT, ['at' => now()->toIso8601String()] + $result);

            return $result;
        } finally {
            SyncProgress::finish();
            // Counters waiting on the cloud see the new backlog at once, not up to 10 s later.
            Cache::forget(LocalNodeRegistration::STATE_CACHE_KEY);
            $lock->release();
        }
    }

    /** What the last sync did, for the on-prem page: counts, and why changes could not be applied. */
    public static function lastResult(): ?array
    {
        return Cache::get(self::LAST_RESULT);
    }

    /** A synced write whose rows could not all keep the source's record numbers is counted and noted, not hidden. */
    private function driftNote(StoreLocalNode $node, Response $response): ?string
    {
        $tables = trim((string) $response->header('X-Sync-Id-Drift'));
        if ($tables === '') {
            return null;
        }
        $node->increment('id_drift_count');
        Log::warning('A synced write was saved with different record numbers', ['store' => $node->store_id, 'tables' => $tables]);

        return 'Saved, but with different record numbers on the other side for: '.$tables;
    }

    private function authHeaders(StoreLocalNode $node): array
    {
        return [
            'X-Tenant-Key' => $node->tenant_key,
            'X-Sync-Token' => $node->sync_token,
        ];
    }

    private function pushPendingWrites(StoreLocalNode $node, string $cloudApi): array
    {
        $result = ['sent' => 0, 'failed' => 0, 'stopped_early' => false];

        $events = SyncOutboxEvent::where('store_id', $node->store_id)
            ->where('status', 'pending')
            ->orderBy('id')
            ->limit(self::MAX_BATCH)
            ->get();

        foreach ($events as $event) {
            try {
                $response = Http::withHeaders(array_merge($this->authHeaders($node), [
                    'X-Sync-Replay' => '1',
                    'X-Sync-Actor' => (string) $event->actor_username,
                    'X-Company-Scope-Id' => (string) $event->store_id,
                    'Content-Type' => $event->headers['Content-Type'] ?? 'application/json',
                ]))->timeout(15)->send($event->method, $cloudApi.$event->path, [
                    'json' => $event->payload ?? [],
                ]);

                if ($response->successful() || $this->isIdempotentSuccess($event, $response)) {
                    $event->update(['status' => 'acked', 'synced_at' => now(), 'last_error' => $this->driftNote($node, $response)]);
                    $result['sent']++;
                    SyncProgress::update(['left' => max(0, (int) (SyncProgress::current()['left'] ?? 1) - 1)]);

                    continue;
                }

                // A 5xx means the cloud itself is unhealthy right now: the write stays queued for the next cycle,
                // and this cycle stops rather than try every remaining one. A 4xx is this write's own problem: it
                // is marked failed (Retry on the Configure Local Server page) and the rest keep going.
                // A write that keeps getting a 5xx is its own problem after all: after a few tries it is marked
                // failed too, so one bad write can't hold up everything queued behind it.
                $serverSide = $response->status() >= 500 && $event->attempts + 1 < self::MAX_SERVER_ERROR_TRIES;
                $event->update([
                    'status' => $serverSide ? 'pending' : 'failed',
                    'attempts' => $event->attempts + 1,
                    'last_error' => "HTTP {$response->status()}: ".mb_substr($response->body(), 0, 500),
                ]);
                if ($serverSide) {
                    $result['stopped_early'] = true;
                    break;
                }
                $result['failed']++;
            } catch (\Throwable $e) {
                // The cloud could not be reached (internet down): nothing was saved there, so it stays queued.
                $event->update([
                    'attempts' => $event->attempts + 1,
                    'last_error' => mb_substr($e->getMessage(), 0, 500),
                ]);
                $result['stopped_early'] = true;
                break;
            }
        }

        return $result;
    }

    /**
     * 409 is what bootstrap/app.php's UniqueConstraintViolationException render
     * hook returns -- a reliable, environment-independent signal (unlike scraping
     * the response body for SQL error text, which only appears with APP_DEBUG=true
     * and would silently stop working in production).
     */
    private function isIdempotentSuccess(SyncOutboxEvent $event, Response $response): bool
    {
        $status = $response->status();

        if ($event->method === 'DELETE' && $status === 404) {
            return true;
        }

        return $status === 409;
    }

    private function pullAndApplyCloudWrites(StoreLocalNode $node, string $cloudApi): array
    {
        $result = ['applied' => 0, 'failed' => 0, 'errors' => []];
        for ($batch = 0; $batch < self::MAX_PULL_BATCHES; $batch++) {
            $round = $this->pullBatch($node, $cloudApi);
            $result['applied'] += $round['applied'];
            $result['failed'] += $round['failed'];
            $result['errors'] = array_slice(array_merge($result['errors'], $round['errors']), 0, 5);
            // Stop when the cloud has nothing more, or when this batch could not all be applied (it comes back first).
            if ($round['fetched'] < self::MAX_BATCH || $round['failed'] > 0) {
                break;
            }
        }

        return $result;
    }

    private function pullBatch(StoreLocalNode $node, string $cloudApi): array
    {
        $result = ['applied' => 0, 'failed' => 0, 'fetched' => 0, 'errors' => []];

        try {
            $response = Http::withHeaders($this->authHeaders($node))
                ->timeout(15)
                ->get($cloudApi.'/sync/outbound/next', ['limit' => self::MAX_BATCH]);
        } catch (\Throwable) {
            return $result;
        }

        if (! $response->successful()) {
            return $result;
        }

        $events = $response->json('data.events') ?? [];
        $result['fetched'] = count($events);
        $failed = [];
        if ($events) {
            $progress = SyncProgress::current();
            $progress
                ? SyncProgress::update(['left' => (int) ($progress['left'] ?? 0) + count($events)])
                : SyncProgress::start('sync', 'Syncing', count($events));
        }
        $ackIds = [];
        $localBase = $this->localBaseUrl($node);

        foreach ($events as $event) {
            try {
                $localResponse = Http::withHeaders(array_merge($this->authHeaders($node), [
                    'X-Sync-Replay' => '1',
                    'X-Sync-Actor' => (string) ($event['actor_username'] ?? ''),
                    'X-Company-Scope-Id' => (string) $node->store_id,
                    'Content-Type' => $event['headers']['Content-Type'] ?? 'application/json',
                ]))->timeout(15)->send($event['method'], $localBase.'/api'.$event['path'], [
                    'json' => $event['payload'] ?? [],
                ]);

                if ($localResponse->successful()) {
                    $ackIds[] = $event['id'];
                    $result['applied']++;
                    $this->driftNote($node, $localResponse);
                } else {
                    $result['failed']++;
                    $result['errors'][] = $error = ($event['method'] ?? '').' '.($event['path'] ?? '').': HTTP '.$localResponse->status().' '
                        .mb_substr((string) ($localResponse->json('message') ?? ''), 0, 200);
                    $failed[] = ['id' => $event['id'], 'error' => $error];
                }
            } catch (\Throwable $e) {
                Log::warning('sync:cycle failed applying a cloud-origin event locally', [
                    'event_id' => $event['id'] ?? null,
                    'error' => $e->getMessage(),
                ]);
                $result['failed']++;
                $result['errors'][] = $error = ($event['method'] ?? '').' '.($event['path'] ?? '').': '.mb_substr($e->getMessage(), 0, 200);
                $failed[] = ['id' => $event['id'] ?? 0, 'error' => $error];
            }
            SyncProgress::update(['left' => max(0, (int) (SyncProgress::current()['left'] ?? 1) - 1)]);
        }

        if ($ackIds || $failed) {
            // The cloud also hears what could not be applied here, so a write that never can be is set aside
            // there after a few tries instead of keeping this server "catching up" for ever.
            Http::withHeaders($this->authHeaders($node))
                ->timeout(15)
                ->post($cloudApi.'/sync/outbound/ack', ['event_ids' => $ackIds, 'failed' => $failed]);
        }

        return $result;
    }

    /** @return array{ok: bool, users_version: ?string} */
    private function sendHeartbeat(StoreLocalNode $node, string $cloudApi): array
    {
        try {
            $response = Http::withHeaders($this->authHeaders($node))->timeout(10)->post($cloudApi.'/sync/heartbeat', [
                'local_healthy' => $this->localServerHealthy($node),
                'advertised_local_server_url' => $node->advertised_local_server_url,
                'counter_url' => $node->counter_url,
            ]);
            if ($response->successful()) {
                // Licence renewals and status changes made on the cloud side arrive here.
                app(LocalNodeRegistration::class)->refreshIdentity($node, $response->json('data.identity'));
            }

            return ['ok' => $response->successful(), 'users_version' => $response->successful() ? $response->json('data.users_version') : null];
        } catch (\Throwable $e) {
            return ['ok' => false, 'users_version' => null];
        }
    }

    /**
     * Where this store's local backend answers: the address it advertises to the store's devices, else the
     * saved local server address. APP_URL is only the last resort: on a store install it is often the
     * default (http://localhost:8000) while the backend runs elsewhere, e.g. on port 8080.
     */
    private function localBaseUrl(StoreLocalNode $node): string
    {
        $base = trim((string) ($node->advertised_local_server_url ?: $node->local_server_url)) ?: url('/');

        return (string) preg_replace('~/api/?$~', '', rtrim($base, '/'));
    }

    private function localServerHealthy(StoreLocalNode $node): bool
    {
        // An HTTP-triggered cycle is already running inside the responding backend.
        // A CLI worker can remain alive after that backend stops, so its heartbeat
        // must separately verify the local HTTP server and paired connector identity.
        if (! app()->runningInConsole()) {
            return true;
        }

        try {
            $response = Http::timeout(3)->get($this->localBaseUrl($node).'/api/connector/web-config');

            return $response->successful()
                && $response->json('data.enabled') === true
                && hash_equals($node->tenant_key, (string) $response->json('data.tenant_key'));
        } catch (\Throwable) {
            return false;
        }
    }
}
