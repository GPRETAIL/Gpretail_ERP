<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use App\Services\BackupService;
use App\Services\SyncCycleService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SyncController extends Controller
{
    /**
     * Called by the frontend's runtimeRouting.js (relative /api/connector/web-config, no
     * origin) to ask "is the server currently answering this request the store's local
     * install?" A local install has exactly one enabled store_local_nodes row (itself);
     * the cloud install never answers enabled here, since cloud never represents "a store's
     * local server."
     */
    public function webConfig(Request $request)
    {
        if (config('sync.node_role') !== 'local') {
            return response()->json(['success' => true, 'data' => ['enabled' => false]]);
        }

        $node = StoreLocalNode::where('enabled', true)->first();

        if (! $node) {
            return response()->json(['success' => true, 'data' => ['enabled' => false]]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'enabled' => true,
                'tenant_key' => $node->tenant_key,
                'cloud_api_base_url' => config('sync.cloud_api_base_url'),
                'local_healthy' => true,
            ],
        ]);
    }

    /**
     * Local -> cloud, called every sync:cycle. Just proves this store's local
     * install is alive and healthy; the cycle itself (not this endpoint) is what
     * actually pushes/pulls queued writes.
     */
    public function heartbeat(Request $request)
    {
        $node = $this->authenticateNode($request);
        if (! $node) {
            return response()->json(['success' => false, 'message' => 'Invalid tenant key or sync token'], 401);
        }

        $node->local_healthy = $request->boolean('local_healthy', true);
        $node->last_heartbeat_at = now();
        if ($request->filled('advertised_local_server_url')) {
            $node->advertised_local_server_url = $request->input('advertised_local_server_url');
        }
        $node->save();

        return response()->json(['success' => true, 'message' => 'Heartbeat recorded']);
    }

    /**
     * Cloud -> local. Returns this store's pending sync_outbox rows -- writes cloud
     * accepted directly while this store was failed over, waiting to be applied
     * locally once the local install is back and polling again.
     */
    public function outboundNext(Request $request)
    {
        $node = $this->authenticateNode($request);
        if (! $node) {
            return response()->json(['success' => false, 'message' => 'Invalid tenant key or sync token'], 401);
        }

        $limit = min(100, max(1, (int) $request->input('limit', 25)));

        $events = SyncOutboxEvent::where('store_id', $node->store_id)
            ->where('status', 'pending')
            ->orderBy('id')
            ->limit($limit)
            ->get(['id', 'method', 'path', 'payload', 'headers']);

        return response()->json([
            'success' => true,
            'data' => ['events' => $events],
        ]);
    }

    /**
     * Cloud -> local. Marks the given cloud-origin outbox rows as applied, so they
     * stop being returned by outboundNext().
     */
    public function outboundAck(Request $request)
    {
        $node = $this->authenticateNode($request);
        if (! $node) {
            return response()->json(['success' => false, 'message' => 'Invalid tenant key or sync token'], 401);
        }

        $ids = array_map('intval', (array) $request->input('event_ids', []));

        SyncOutboxEvent::where('store_id', $node->store_id)
            ->whereIn('id', $ids)
            ->update(['status' => 'acked', 'synced_at' => now()]);

        return response()->json(['success' => true, 'message' => 'Acknowledged']);
    }

    /**
     * HTTP fallback trigger for sync:cycle, for local installs that do have inbound
     * access and prefer an external pinger over the local machine's own OS task
     * scheduler. Secret-token gated, mirrors BackupController::scheduledRun.
     */
    public function runCycle(Request $request)
    {
        $token = (string) ($request->input('token') ?? $request->header('X-Sync-Cron-Token', ''));
        $secret = (string) config('sync.cron_secret');

        if (! $secret || ! hash_equals($secret, $token)) {
            return response()->json(['success' => false, 'message' => 'Invalid or missing sync cron token'], 403);
        }

        $result = app(SyncCycleService::class)->run();

        return response()->json(['success' => (bool) ($result['ran'] ?? false), 'data' => $result]);
    }

    /**
     * Cloud -> local. Full or incremental (?since=) snapshot of this store's data,
     * for a local install that's been offline long enough that per-event replay
     * (sync_outbox) isn't practical -- reinstall, long outage, or its own outbox
     * having been lost. Reuses the Backup Center's export engine (same scoping,
     * same table manifest); BackupService::mergeTablesFromExport() on the
     * receiving side is what makes applying this safe against a live database.
     */
    public function catchUpExport(Request $request)
    {
        $node = $this->authenticateNode($request);
        if (! $node) {
            return response()->json(['success' => false, 'message' => 'Invalid tenant key or sync token'], 401);
        }

        $since = $request->filled('since') ? Carbon::parse($request->input('since')) : null;

        $backupService = app(BackupService::class);
        $exported = $backupService->exportTablesToJson($backupService->fullTableManifest(), $node->store_id, $since);

        return response()->json([
            'success' => true,
            'data' => [
                'exported_at' => now()->toIso8601String(),
                'tables' => $exported,
            ],
        ]);
    }

    /**
     * Admin-facing: every store's local-server node and whether it looks stale
     * (enabled but hasn't heartbeated recently). Computed at read time from
     * last_heartbeat_at -- no background sweep/cron needed.
     */
    public function nodes(Request $request)
    {
        $staleThreshold = now()->subMinutes(5);

        $nodes = StoreLocalNode::with('store:id,name,code')
            ->orderBy('store_id')
            ->get()
            ->map(function (StoreLocalNode $node) use ($staleThreshold) {
                return [
                    'store_id' => $node->store_id,
                    'store_name' => $node->store?->name,
                    'store_code' => $node->store?->code,
                    'enabled' => $node->enabled,
                    'local_healthy' => $node->local_healthy,
                    'last_heartbeat_at' => optional($node->last_heartbeat_at)->toIso8601String(),
                    'last_catch_up_at' => optional($node->last_catch_up_at)->toIso8601String(),
                    'is_stale' => $node->enabled && (! $node->last_heartbeat_at || $node->last_heartbeat_at->lt($staleThreshold)),
                ];
            });

        return response()->json(['success' => true, 'data' => ['nodes' => $nodes]]);
    }

    private function authenticateNode(Request $request): ?StoreLocalNode
    {
        $tenantKey = (string) $request->header('X-Tenant-Key', '');
        $syncToken = (string) $request->header('X-Sync-Token', '');

        if (! $tenantKey || ! $syncToken) {
            return null;
        }

        $node = StoreLocalNode::where('tenant_key', $tenantKey)->where('enabled', true)->first();

        if (! $node || ! hash_equals($node->sync_token, $syncToken)) {
            return null;
        }

        return $node;
    }
}
