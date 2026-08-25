<?php

namespace App\Http\Middleware;

use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Queues a copy of every successful mutating API write into sync_outbox, so
 * SyncCycleService can later push it to the other side (local -> cloud, or
 * cloud -> local when cloud accepted a direct write during a store's failover
 * window). See DocumentNumberService::resolve() for how a document number
 * minted on the original request survives being replayed later without
 * re-minting and colliding with itself.
 */
class CaptureSyncOutbox
{
    /**
     * Administrative bulk-import endpoints can mint many document numbers in a
     * single request; DocumentNumberService::resolve()'s replay-stash only tracks
     * one number per prefix per request, so replaying one of these could re-mint
     * different numbers than the original run actually used. Simplest safe choice:
     * never queue these for replay rather than risk duplicate/renumbered data.
     */
    private const EXCLUDED_PATH_FRAGMENTS = [
        'auth/',
        'sync/',
        'local-server-config',
        'connector/',
        '/bulk',
        '/import',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $this->maybeCapture($request, $response);

        return $response;
    }

    private function maybeCapture(Request $request, Response $response): void
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return;
        }

        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            return;
        }

        // A request already being replayed must never be re-queued -- that would
        // loop the same write back and forth between local and cloud forever.
        if ($request->header('X-Sync-Replay') === '1') {
            return;
        }

        $path = '/'.ltrim(preg_replace('#^api/#', '', $request->path()), '/');
        foreach (self::EXCLUDED_PATH_FRAGMENTS as $fragment) {
            if (str_contains($path, $fragment)) {
                return;
            }
        }

        $storeId = (int) ($request->header('X-Company-Scope-Id') ?: 1);
        $role = config('sync.node_role');

        if ($role === 'local') {
            $shouldQueue = true;
        } elseif ($role === 'cloud') {
            $shouldQueue = StoreLocalNode::where('store_id', $storeId)->where('enabled', true)->exists();
        } else {
            $shouldQueue = false;
        }

        if (! $shouldQueue) {
            return;
        }

        $payload = $request->except(['password', 'password_confirmation']);

        $mintedNumbers = $request->attributes->get('_mintedDocumentNumbers', []);
        if ($mintedNumbers) {
            $payload['_syncDocumentNumbers'] = $mintedNumbers;
        }

        SyncOutboxEvent::create([
            'store_id' => $storeId,
            'method' => $request->method(),
            'path' => $path,
            'payload' => $payload,
            'headers' => ['Content-Type' => $request->header('Content-Type', 'application/json')],
            'idempotency_key' => (string) Str::uuid(),
            'status' => 'pending',
        ]);
    }
}
