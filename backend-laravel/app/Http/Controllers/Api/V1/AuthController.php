<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use App\Services\GoogleIdTokenVerifier;
use App\Services\MobileAccess;
use App\Services\PlatformBootstrap;
use App\Services\PlatformClient;
use App\Services\StoreContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $loginId = trim($request->input('email') ?? $request->input('username') ?? '');
        $password = (string) $request->input('password');

        $user = User::where('username', $loginId)
            ->orWhereRaw('LOWER(email) = ?', [strtolower($loginId)])
            ->first();

        if (! $user && ! PlatformActivation::current()?->activated) {
            $setup = app(PlatformBootstrap::class)->issue(strtolower($loginId), $password);

            return response()->json($setup['ok']
                ? ['success' => true, 'message' => 'Company verified. Activate this installation to continue.', 'data' => $setup['data']]
                : ['success' => false, 'message' => $setup['message']], $setup['ok'] ? 200 : $setup['status']);
        }

        if (! $user || ! Hash::check($password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid username or password.',
            ], 401);
        }

        if ($setup = app(PlatformBootstrap::class)->resume($user)) {
            return response()->json(['success' => true, 'data' => $setup['data']]);
        }

        return $this->completeLogin($user);
    }

    public function config(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => ['google_enabled' => (bool) config('services.google.client_id'), 'google_client_id' => config('services.google.client_id')]]);
    }

    public function google(Request $request): JsonResponse
    {
        if (! $request->filled('id_token') && $request->filled('credential')) {
            $request->merge(['id_token' => $request->input('credential')]);
        }
        $request->validate(['id_token' => 'required|string|max:16384', 'client' => 'sometimes|in:web,mobile']);
        $claims = app(GoogleIdTokenVerifier::class)->verify($request->string('id_token')->toString());
        if (! $claims) {
            return response()->json(['success' => false, 'message' => 'Invalid Google identity token.'], 401);
        }

        return DB::transaction(function () use ($claims): JsonResponse {
            $users = User::whereRaw('LOWER(email) = ?', [strtolower(trim($claims['email']))])->lockForUpdate()->get();
            $user = $users->count() === 1 ? $users->first() : null;
            if (! $user || ! $user->is_active) {
                return response()->json(['success' => false, 'message' => 'Google sign-in is available only for an active, existing ERP user. Contact your administrator.'], 403);
            }
            if (! app(MobileAccess::class)->canLogin($user, request()->input('client', 'web'))) {
                return response()->json(['success' => false, 'message' => 'Your administrator has not enabled this sign-in channel for your account.'], 403);
            }
            if ($user->google_sub && $user->google_sub !== $claims['sub']) {
                return response()->json(['success' => false, 'message' => 'Google identity does not match the linked ERP account.'], 403);
            }
            if (! $user->google_sub) {
                $authoritative = str_ends_with(strtolower($claims['email']), '@gmail.com') || ! empty($claims['hd']);
                if (! $authoritative || User::where('google_sub', $claims['sub'])->where('id', '!=', $user->id)->exists()) {
                    return response()->json(['success' => false, 'message' => 'Use password sign-in for this email or contact your administrator.'], 403);
                }
                $user->forceFill(['google_sub' => $claims['sub']])->save();
            }

            return $this->completeLogin($user);
        });
    }

    private function completeLogin(User $user): JsonResponse
    {
        request()->validate(['client' => 'sometimes|in:web,mobile']);
        $client = request()->input('client', 'web');
        if (! app(MobileAccess::class)->canLogin($user, $client)) {
            return response()->json(['success' => false, 'message' => 'Your administrator has not enabled this sign-in channel for your account.'], 403);
        }
        if (! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'User account is deactivated.',
            ], 403);
        }

        if ($user->platform_company_code) {
            $activation = PlatformActivation::current();
            if ($activation && $activation->activated && $activation->company_code !== $user->platform_company_code) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'TERMINAL_COMPANY_MISMATCH',
                    'message' => "Terminal Conflict: This device is registered to company [{$activation->company_code}]. The user account you entered belongs to [{$user->platform_company_code}].",
                ], 403);
            }
            if (! $activation || ! $activation->activated || $activation->status !== 'active') {
                return response()->json(['success' => false, 'message' => 'Your company ERP activation is not active. Contact your administrator.'], 403);
            }
            if ($activation->onboarding_required && ! $activation->first_erp_login_at) {
                $entry = app(PlatformClient::class)->firstEntry($activation->company_code, (string) $activation->sync_token);
                if (! $entry['ok'] || empty($entry['data']['first_erp_login_at'])) {
                    return response()->json(['success' => false, 'message' => $entry['message'] ?? 'Company validation failed. Retry after checking the GP Admin connection.'], 503);
                }
                $activation->update([
                    'first_erp_login_at' => $entry['data']['first_erp_login_at'],
                    'active_till' => $entry['data']['active_till'] ?? $activation->active_till,
                ]);
            }
        }

        // Create Sanctum Token
        $token = $user->createToken($client.'-token', ['client:'.$client])->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'store_id' => $user->store_id,
                    // "Company" and "Store" are the same concept in this
                    // app (CompanyController is backed by the Store model,
                    // the "Switch Store" dialog is the company switcher) -
                    // several frontend pages (Sales Customisation, POS
                    // receipt sync) have always expected company_id/
                    // company_name on the auth user but never received
                    // them, so those sync calls silently never fired.
                    'company_id' => $user->store_id,
                    'company_name' => $user->store?->name,
                    'counter_id' => $user->counter_id,
                    'brand' => $user->store?->theme_customization ?: [],
                    'logo' => $user->store?->logo,
                    'must_change_password' => (bool) $user->must_change_password,
                    ...app(StoreContext::class)->authFields($user),
                    'auth_client' => $client,
                ],
            ],
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate(['newPassword' => 'required|string|min:8|max:255', 'currentPassword' => 'nullable|string']);
        $user = $request->user();
        abort_unless($user, 401);
        if (! $user->must_change_password) {
            abort_unless(Hash::check((string) $request->input('currentPassword', ''), $user->password), 422, 'Current password is incorrect.');
        }
        $user->update(['password' => $request->input('newPassword'), 'must_change_password' => false]);
        $client = in_array('client:mobile', $user->currentAccessToken()?->abilities ?? [], true) ? 'mobile' : 'web';
        $token = $user->createToken($client.'-token', ['client:'.$client])->plainTextToken;

        return response()->json(['success' => true, 'data' => ['token' => $token], 'message' => 'Password updated. Other sessions have been signed out.']);
    }

    public function logout(Request $request)
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'store_id' => $user->store_id,
                'company_id' => $user->store_id,
                'company_name' => $user->store?->name,
                'counter_id' => $user->counter_id,
                'brand' => $user->store?->theme_customization ?: [],
                'logo' => $user->store?->logo,
                ...app(StoreContext::class)->authFields($user),
            ],
        ]);
    }

    public function localServerConfig(Request $request)
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        $node = StoreLocalNode::where('store_id', $storeId)->first();

        return response()->json([
            'success' => true,
            'data' => $this->presentLocalServerNode($node, $storeId),
        ]);
    }

    public function localServerConfigUpdate(Request $request)
    {
        abort_unless(in_array($request->user()?->role, ['admin', 'super_admin'], true), 403, 'Only administrators can configure the local server.');
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        $store = Store::find($storeId);

        if (! $store) {
            return response()->json(['success' => false, 'message' => 'Store not found'], 404);
        }

        $localServerUrl = trim((string) $request->input('local_server_url', ''));
        $cloudServerUrl = trim((string) $request->input('cloud_server_url', ''));

        if ($cloudServerUrl !== '' && ! preg_match('#^https?://#i', $cloudServerUrl)) {
            return response()->json([
                'success' => false,
                'message' => 'Enter a valid cloud server URL (must start with http:// or https://).',
            ], 422);
        }

        $node = StoreLocalNode::where('store_id', $storeId)->first();
        if (! $node) {
            $node = new StoreLocalNode(['store_id' => $storeId]);
            $node->tenant_key = (string) Str::uuid();
            $node->sync_token = Str::random(48);
        }

        $node->local_server_url = $localServerUrl !== '' ? $localServerUrl : null;
        $node->cloud_server_url = $cloudServerUrl !== '' ? $cloudServerUrl : null;
        $node->enabled = $localServerUrl !== '';
        $node->save();

        return response()->json([
            'success' => true,
            'message' => 'Local server configuration saved',
            'data' => $this->presentLocalServerNode($node, $storeId),
        ]);
    }

    public function localServerConfigRuntime(Request $request)
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        $node = StoreLocalNode::where('store_id', $storeId)->where('enabled', true)->first();

        return response()->json([
            'success' => true,
            'data' => [
                'enabled' => (bool) $node,
                'tenant_key' => $node->tenant_key ?? null,
                'local_server_url' => $node->local_server_url ?? null,
            ],
        ]);
    }

    private function presentLocalServerNode(?StoreLocalNode $node, ?int $storeId = null): array
    {
        $storeId = $storeId ?: $node?->store_id;
        $outboxPending = $storeId ? SyncOutboxEvent::where('store_id', $storeId)->where('status', 'pending')->count() : 0;
        $outboxFailed = $storeId ? SyncOutboxEvent::where('store_id', $storeId)->where('status', 'failed')->count() : 0;

        if (! $node) {
            return [
                'enabled' => false,
                'tenant_key' => null,
                'local_server_url' => null,
                'cloud_server_url' => null,
                'effective_cloud_server_url' => config('sync.cloud_api_base_url'),
                'advertised_local_server_url' => null,
                'connector_status' => 'not_connected',
                'connector_last_seen_at' => null,
                'local_healthy' => false,
                'outbox_pending' => $outboxPending,
                'outbox_failed' => $outboxFailed,
            ];
        }

        $status = ! $node->last_health_check_at
            ? 'not_connected'
            : ($node->local_healthy ? 'online' : 'offline');

        return [
            'enabled' => (bool) $node->enabled,
            'tenant_key' => $node->tenant_key,
            'local_server_url' => $node->local_server_url,
            'cloud_server_url' => $node->cloud_server_url,
            'effective_cloud_server_url' => $node->cloud_server_url ?: config('sync.cloud_api_base_url'),
            'advertised_local_server_url' => $node->advertised_local_server_url,
            'connector_status' => $status,
            'connector_last_seen_at' => optional($node->last_health_check_at)->toIso8601String(),
            'local_healthy' => (bool) $node->local_healthy,
            'outbox_pending' => $outboxPending,
            'outbox_failed' => $outboxFailed,
        ];
    }

    public function counter(Request $request)
    {
        $user = $request->user();
        $counterId = $request->input('counterId');

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        $user->update(['counter_id' => $counterId]);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'store_id' => $user->store_id,
                    'company_id' => $user->store_id,
                    'company_name' => $user->store?->name,
                    'counter_id' => $counterId,
                    'brand' => $user->store?->theme_customization ?: [],
                    'logo' => $user->store?->logo,
                ],
                'token' => $request->bearerToken(),
            ],
        ]);
    }
}
