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

    public const LOCK = 'sync:cycle';

    private const LAST_RESULT = 'sync:last-result';

    public function run(): array
    {
        if (config('sync.node_role') !== 'local') {
            return ['ran' => false, 'reason' => 'This install is not configured as a local node (SYNC_NODE_ROLE=local).'];
        }

        $node = StoreLocalNode::where('enabled', true)->first();
        if (! $node) {
            return ['ran' => false, 'reason' => 'No enabled local-server configuration found.'];
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
            $result = [
                'ran' => true,
                'pushed' => $this->pushPendingWrites($node, $cloudApi),
                'pulled' => $this->pullAndApplyCloudWrites($node, $cloudApi),
                // The cloud is the master for staff accounts; the counters sign in here with the same ones.
                'users' => app(LocalNodeRegistration::class)->copyUsers($node),
                'heartbeat_ok' => $this->sendHeartbeat($node, $cloudApi),
            ];
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
                    $event->update(['status' => 'acked', 'synced_at' => now(), 'last_error' => null]);
                    $result['sent']++;
                    SyncProgress::update(['left' => max(0, (int) (SyncProgress::current()['left'] ?? 1) - 1)]);

                    continue;
                }

                // A 5xx means the cloud itself is unhealthy right now: the write stays queued for the next cycle,
                // and this cycle stops rather than try every remaining one. A 4xx is this write's own problem: it
                // is marked failed (Retry on the Configure Local Server page) and the rest keep going.
                $serverSide = $response->status() >= 500;
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
                } else {
                    $result['failed']++;
                    $result['errors'][] = ($event['method'] ?? '').' '.($event['path'] ?? '').': HTTP '.$localResponse->status().' '
                        .mb_substr((string) ($localResponse->json('message') ?? ''), 0, 200);
                }
            } catch (\Throwable $e) {
                Log::warning('sync:cycle failed applying a cloud-origin event locally', [
                    'event_id' => $event['id'] ?? null,
                    'error' => $e->getMessage(),
                ]);
                $result['failed']++;
                $result['errors'][] = ($event['method'] ?? '').' '.($event['path'] ?? '').': '.mb_substr($e->getMessage(), 0, 200);
            }
            SyncProgress::update(['left' => max(0, (int) (SyncProgress::current()['left'] ?? 1) - 1)]);
        }

        if ($ackIds) {
            Http::withHeaders($this->authHeaders($node))
                ->timeout(15)
                ->post($cloudApi.'/sync/outbound/ack', ['event_ids' => $ackIds]);
        }

        return $result;
    }

    private function sendHeartbeat(StoreLocalNode $node, string $cloudApi): bool
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

            return $response->successful();
        } catch (\Throwable $e) {
            return false;
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
