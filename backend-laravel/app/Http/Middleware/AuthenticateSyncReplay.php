<?php

namespace App\Http\Middleware;

use App\Models\StoreLocalNode;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * A sync-replayed write (SyncCycleService pushing local -> cloud, or applying
 * a cloud-authored event locally) carries no per-user token -- the original
 * requester's token is never captured (see CaptureSyncOutbox) and wouldn't be
 * meaningful on the other side anyway, since each node manages its own users
 * independently. Instead it proves itself with the same node-level tenant_key
 * + sync_token already used by SyncController::authenticateNode(). When that
 * checks out for the store the request is scoped to, authenticate as that
 * store's dedicated sync system user so the normal auth:sanctum check
 * (unavoidable on business routes like /pos-sales) passes -- must run before
 * auth:sanctum in the pipeline, see the prependToGroup('api', ...) call in
 * bootstrap/app.php.
 */
class AuthenticateSyncReplay
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->header('X-Sync-Replay') === '1') {
            $this->tryAuthenticate($request);
        }

        return $next($request);
    }

    private function tryAuthenticate(Request $request): void
    {
        $tenantKey = (string) $request->header('X-Tenant-Key', '');
        $syncToken = (string) $request->header('X-Sync-Token', '');
        $storeId = (int) ($request->header('X-Company-Scope-Id') ?: 0);

        if ($tenantKey === '' || $syncToken === '' || $storeId === 0) {
            return;
        }

        $node = StoreLocalNode::where('store_id', $storeId)
            ->where('enabled', true)
            ->where('tenant_key', $tenantKey)
            ->first();

        if (! $node || ! hash_equals($node->sync_token, $syncToken)) {
            return;
        }

        $syncUser = $node->resolveSyncUser();

        Auth::guard('sanctum')->setUser($syncUser);
        $request->setUserResolver(fn () => $syncUser);
    }
}
