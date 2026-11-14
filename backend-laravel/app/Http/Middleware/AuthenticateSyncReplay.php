<?php

namespace App\Http\Middleware;

use App\Models\StoreLocalNode;
use App\Models\User;
use App\Services\Platform\SyncIds;
use App\Services\Tenancy\StoreContext;
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
        $replay = $request->header('X-Sync-Replay') === '1' && $this->tryAuthenticate($request);
        // The source's record numbers are reused only for a replay that proved node trust; from anyone else
        // the field is dropped, so a caller can never choose ids.
        $ids = $request->input('_syncIds');
        $request->request->remove('_syncIds');
        $request->json()->remove('_syncIds');
        if ($replay) {
            app(SyncIds::class)->play($ids);
        }

        $response = $next($request);
        if ($replay && ($drift = app(SyncIds::class)->drift())) {
            $response->headers->set('X-Sync-Id-Drift', implode(',', $drift));
        }

        return $response;
    }

    private function tryAuthenticate(Request $request): bool
    {
        $tenantKey = (string) $request->header('X-Tenant-Key', '');
        $syncToken = (string) $request->header('X-Sync-Token', '');
        $storeId = (int) ($request->header('X-Company-Scope-Id') ?: 0);

        if ($tenantKey === '' || $syncToken === '' || $storeId === 0) {
            return false;
        }

        $node = StoreLocalNode::where('store_id', $storeId)
            ->where('enabled', true)
            ->where('tenant_key', $tenantKey)
            ->first();

        if (! $node || ! hash_equals($node->sync_token, $syncToken)) {
            return false;
        }

        // The person who made the write on the other server, when they also exist and can open the store here
        // (staff accounts are copied from the cloud); otherwise the store's sync system user.
        $actor = $this->actor($request, $node);
        if (! $actor) {
            $actor = $node->resolveSyncUser();
            abort_unless($actor->role === 'sync_system' && $actor->store_id === $node->store_id, 403, 'Invalid sync identity.');
            $actor->forceFill(['platform_company_code' => $node->store?->platform_company_code])->save();
        }
        $request->attributes->set('authenticated_sync_replay', true);

        Auth::guard('sanctum')->setUser($actor);
        $request->setUserResolver(fn () => $actor);

        return true;
    }

    private function actor(Request $request, StoreLocalNode $node): ?User
    {
        $username = trim((string) $request->header('X-Sync-Actor', ''));
        if ($username === '') {
            return null;
        }
        $user = User::where('username', $username)->where('is_active', true)->where('role', '!=', 'sync_system')->first();

        return $user && app(StoreContext::class)->available($user)->whereKey($node->store_id)->exists() ? $user : null;
    }
}
