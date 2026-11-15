<?php

namespace App\Http\Controllers\Api\V1\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\LoginSessions;
use App\Services\Hr\StaffAppAccess;
use App\Services\Tenancy\MobileAccess;
use App\Services\Tenancy\StoreContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * User Access > Login Sessions: the tenant admin sees who is signed in across their stores (web, mobile, staff app,
 * counter failover) and can end a session. Sessions belong to this server and are never synced.
 */
class LoginSessionController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeTenantAdmin($request);
        $current = $request->user()->currentAccessToken()?->id;
        $stores = app(StoreContext::class)->available($request->user())->pluck('name', 'id');
        $users = $this->tenantUsers($request)->get(['id', 'name', 'username', 'email', 'role', 'store_id'])->keyBy('id');
        $expiry = (int) config('sanctum.expiration');

        $rows = PersonalAccessToken::where('tokenable_type', User::class)->whereIn('tokenable_id', $users->keys())
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->when($expiry > 0, fn ($q) => $q->where('created_at', '>', now()->subMinutes($expiry)))
            ->orderByDesc('last_used_at')->orderByDesc('id')->get()
            ->map(function (PersonalAccessToken $token) use ($users, $stores, $current, $expiry) {
                $user = $users->get($token->tokenable_id);
                $lastUsed = $token->last_used_at;

                return [
                    'id' => $token->id,
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'username' => str_ends_with((string) $user->email, StaffAppAccess::HIDDEN_EMAIL_DOMAIN) ? $user->name : $user->username,
                    'role' => $user->role,
                    'store_name' => $stores->get($token->store_id ?? $user->store_id) ?? ($user->store_id ? '-' : 'All stores'),
                    'client' => LoginSessions::client($token),
                    'device' => LoginSessions::device($token->user_agent),
                    'ip_address' => $token->ip_address ?? '-',
                    'signed_in_at' => $token->created_at?->toIso8601String(),
                    'last_active_at' => $lastUsed?->toIso8601String(),
                    'expires_at' => ($token->expires_at ?? ($expiry > 0 ? $token->created_at?->addMinutes($expiry) : null))?->toIso8601String(),
                    'active_now' => $lastUsed !== null && $lastUsed->gt(now()->subMinutes(LoginSessions::ACTIVE_MINUTES)),
                    'is_current' => $token->id === $current,
                ];
            })->values();

        return response()->json(['success' => true, 'data' => $rows, 'total' => $rows->count()]);
    }

    /** End one session: that device is signed out on its next request. */
    public function destroy(Request $request, int $id)
    {
        $this->authorizeTenantAdmin($request);
        $token = PersonalAccessToken::where('tokenable_type', User::class)
            ->whereIn('tokenable_id', $this->tenantUsers($request)->select('id'))->findOrFail($id);
        abort_if($token->id === $request->user()->currentAccessToken()?->id, 422, 'This is your own current session. Sign out instead.');
        $token->delete();

        return response()->json(['success' => true, 'message' => 'Session ended.']);
    }

    /** End every session of one user (all their devices), except the admin's own current one. */
    public function destroyUser(Request $request, int $userId)
    {
        $this->authorizeTenantAdmin($request);
        $user = $this->tenantUsers($request)->findOrFail($userId);
        $ended = $user->tokens()->whereKeyNot($request->user()->currentAccessToken()?->id ?? 0)->delete();

        return response()->json(['success' => true, 'message' => "Ended {$ended} session(s) for {$user->name}.", 'data' => ['ended' => $ended]]);
    }

    private function authorizeTenantAdmin(Request $request): void
    {
        abort_unless(app(MobileAccess::class)->tenantAdmin($request->user()), 403, 'Only the company (tenant) administrator can see login sessions.');
    }

    /** The tenant's people: users of its stores (including staff-app logins) and its store-less admins. */
    private function tenantUsers(Request $request): Builder
    {
        $admin = $request->user();
        $ids = app(StoreContext::class)->available($admin)->pluck('id')->all();
        $query = User::query()->where(fn ($q) => $q->whereIn('store_id', $ids)
            ->orWhereHas('assignedStores', fn ($stores) => $stores->whereIn('stores.id', $ids))
            ->orWhere(fn ($q) => $q->whereNull('store_id')->where('platform_company_code', $admin->platform_company_code)));

        // Store users are the tenant's by their store (staff-app logins may have no company code of their own).
        return $query->where('role', '!=', 'sync_system');
    }
}
