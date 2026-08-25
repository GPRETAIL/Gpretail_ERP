<?php

namespace App\Services;

use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use Illuminate\Http\Client\Response;
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

    public function run(): array
    {
        if (config('sync.node_role') !== 'local') {
            return ['ran' => false, 'reason' => 'This install is not configured as a local node (SYNC_NODE_ROLE=local).'];
        }

        $node = StoreLocalNode::where('enabled', true)->first();
        if (! $node) {
            return ['ran' => false, 'reason' => 'No enabled local-server configuration found.'];
        }

        $cloudApi = rtrim((string) config('sync.cloud_api_base_url'), '/');
        if (! $cloudApi) {
            return ['ran' => false, 'reason' => 'sync.cloud_api_base_url is not configured.'];
        }

        return [
            'ran' => true,
            'pushed' => $this->pushPendingWrites($node, $cloudApi),
            'pulled' => $this->pullAndApplyCloudWrites($node, $cloudApi),
            'heartbeat_ok' => $this->sendHeartbeat($node, $cloudApi),
        ];
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
                    'X-Company-Scope-Id' => (string) $event->store_id,
                    'Content-Type' => $event->headers['Content-Type'] ?? 'application/json',
                ]))->timeout(15)->send($event->method, $cloudApi.$event->path, [
                    'json' => $event->payload ?? [],
                ]);

                if ($response->successful() || $this->isIdempotentSuccess($event, $response)) {
                    $event->update(['status' => 'acked', 'synced_at' => now(), 'last_error' => null]);
                    $result['sent']++;

                    continue;
                }

                $event->update([
                    'status' => 'failed',
                    'attempts' => $event->attempts + 1,
                    'last_error' => "HTTP {$response->status()}: ".mb_substr($response->body(), 0, 500),
                ]);
                $result['failed']++;

                // A validation-style 4xx is this event's own problem -- skip it and keep
                // draining the rest. A 5xx likely means cloud itself is unhealthy right
                // now, so stop this cycle rather than fail every remaining event in order.
                if ($response->status() >= 500) {
                    $result['stopped_early'] = true;
                    break;
                }
            } catch (\Throwable $e) {
                $event->update([
                    'status' => 'failed',
                    'attempts' => $event->attempts + 1,
                    'last_error' => $e->getMessage(),
                ]);
                $result['failed']++;
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
        $result = ['applied' => 0, 'failed' => 0];

        $response = Http::withHeaders($this->authHeaders($node))
            ->timeout(15)
            ->get($cloudApi.'/sync/outbound/next', ['limit' => self::MAX_BATCH]);

        if (! $response->successful()) {
            return $result;
        }

        $events = $response->json('data.events') ?? [];
        $ackIds = [];
        $localBase = rtrim(url('/'), '/');

        foreach ($events as $event) {
            try {
                $localResponse = Http::withHeaders([
                    'X-Sync-Replay' => '1',
                    'X-Company-Scope-Id' => (string) $node->store_id,
                    'Content-Type' => $event['headers']['Content-Type'] ?? 'application/json',
                ])->timeout(15)->send($event['method'], $localBase.'/api'.$event['path'], [
                    'json' => $event['payload'] ?? [],
                ]);

                if ($localResponse->successful()) {
                    $ackIds[] = $event['id'];
                    $result['applied']++;
                } else {
                    $result['failed']++;
                }
            } catch (\Throwable $e) {
                Log::warning('sync:cycle failed applying a cloud-origin event locally', [
                    'event_id' => $event['id'] ?? null,
                    'error' => $e->getMessage(),
                ]);
                $result['failed']++;
            }
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
                'local_healthy' => true,
                'advertised_local_server_url' => $node->advertised_local_server_url,
            ]);

            return $response->successful();
        } catch (\Throwable $e) {
            return false;
        }
    }
}
