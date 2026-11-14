<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Api\V1\Masters\ConfigurationController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use App\Services\Platform\FailoverIdentity;
use App\Services\Platform\LocalNodeRegistration;
use App\Services\Platform\PlatformBootstrap;
use App\Services\Platform\PlatformClient;
use App\Services\Pos\PosCounter;
use App\Services\Security\FailedAttempts;
use App\Services\Security\GoogleIdTokenVerifier;
use App\Services\Tenancy\MobileAccess;
use App\Services\Tenancy\StoreContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $loginId = trim($request->input('email') ?? $request->input('username') ?? '');
        $password = (string) $request->input('password');

        // Per account and address, plus an hourly cap per account: a guessing run spread over many
        // addresses still stops, while someone mistyping elsewhere can't lock the owner out for long.
        $account = strtolower($loginId);
        $limits = [["login:$account|{$request->ip()}", 8, 900], ["login:$account", 30, 3600]];
        if ($wait = FailedAttempts::lockedFor($limits)) {
            return response()->json(['success' => false, 'message' => FailedAttempts::message('sign-in attempts for this account', $wait)], 429)
                ->header('Retry-After', (string) $wait);
        }

        $user = User::where('username', $loginId)
            ->orWhereRaw('LOWER(email) = ?', [strtolower($loginId)])
            ->first();

        if (! $user && ! PlatformActivation::current()?->activated) {
            $setup = app(PlatformBootstrap::class)->issue(strtolower($loginId), $password);

            return response()->json($setup['ok']
                ? ['success' => true, 'message' => 'Company verified. Activate this installation to continue.', 'data' => $setup['data']]
                : ['success' => false, 'message' => $setup['message']], $setup['ok'] ? 200 : $setup['status']);
        }

        // An unknown username still pays for one hash check at the configured cost, so the response time
        // doesn't tell a caller which usernames exist.
        $passwordMatches = Hash::check($password, $user->password ?? $this->timingDummyHash());
        if (! $user || ! $passwordMatches) {
            FailedAttempts::fail($limits);

            return response()->json([
                'success' => false,
                'message' => 'Invalid username or password.',
            ], 401);
        }
        FailedAttempts::clear($limits);

        if ($setup = app(PlatformBootstrap::class)->resume($user)) {
            return response()->json(['success' => true, 'data' => $setup['data']]);
        }

        return $this->completeLogin($user);
    }

    /** A hash of a random secret, made once at the current cost, for unknown-user sign-ins to check against. */
    private function timingDummyHash(): string
    {
        return Cache::rememberForever('auth:timing-dummy-hash:'.config('hashing.bcrypt.rounds'), fn () => Hash::make(Str::random(40)));
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
            if ($activation->onboarding_required && ! $activation->first_erp_login_at && ! $activation->managed_by_cloud) {
                $entry = app(PlatformClient::class)->firstEntry($activation->company_code, (string) $activation->sync_token);
                if (! $entry['ok'] || empty($entry['data']['first_erp_login_at'])) {
                    return response()->json(['success' => false, 'message' => $entry['message'] ?? 'Company validation failed. Retry after checking the GP Admin connection.'], 503);
                }
                $activation->update([
                    'first_erp_login_at' => $entry['data']['first_erp_login_at'],
                    'active_till' => $entry['data']['active_till'] ?? $activation->active_till,
                ]);
            }
            $context = app(StoreContext::class);
            // A user with no stores yet still signs in to activate one; the store gate applies after that.
            if (! $context->isTenantAdmin($user) && $context->stores($user)->isNotEmpty() && $context->licensedStores($user)->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'STORE_LICENCE_EXPIRED',
                    'message' => 'Your store subscription has expired or is not active. Ask your company administrator to renew it.',
                ], 403);
            }
        }

        // Create Sanctum Token. A new ERP sign-in replaces earlier ERP sessions; the staff app (/hr) keeps its own.
        // A counter's cloud failover sign-in (FailoverIdentity) also stays: it is used only while the on-prem server is down.
        $user->tokens()->whereNotIn('name', [\App\Services\Hr\StaffAppAccess::TOKEN_NAME, FailoverIdentity::TOKEN_NAME])->delete();
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
        abort_unless($user !== null, 401);
        if (! $user->must_change_password) {
            abort_unless(Hash::check((string) $request->input('currentPassword', ''), $user->password), 422, 'Current password is incorrect.');
        }
        $user->update(['password' => $request->input('newPassword'), 'must_change_password' => false]);
        $client = in_array('client:mobile', $user->currentAccessToken()->abilities ?? [], true) ? 'mobile' : 'web';
        $user->tokens()->delete();
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
                'logo' => $user->store?->logo,
                // Which sign-in this session came from, so the website and the phone app (/app) each
                // ask for their own sign-in instead of running on the other's session after a reload.
                'auth_client' => self::sessionClient($request),
                ...app(StoreContext::class)->authFields($user),
            ],
        ]);
    }

    private static function sessionClient(Request $request): string
    {
        $abilities = $request->user()?->currentAccessToken()?->abilities ?? [];
        foreach (['mobile', 'staff'] as $client) {
            if (in_array('client:'.$client, $abilities, true)) {
                return $client;
            }
        }

        return 'web';
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
        $store = app(StoreContext::class)->available($request->user())->find($storeId);

        if (! $store) {
            return response()->json(['success' => false, 'message' => 'Store not found'], 404);
        }

        $localServerUrl = trim((string) $request->input('local_server_url', ''));
        $cloudServerUrl = trim((string) $request->input('cloud_server_url', ''));

        $request->validate(['local_server_url' => 'nullable|url:http,https|max:2048', 'cloud_server_url' => 'nullable|url:http,https|max:2048']);
        $request->validate(['disable_failover' => 'sometimes|boolean']);
        if (! $request->boolean('disable_failover') && $localServerUrl === '') {
            throw \Illuminate\Validation\ValidationException::withMessages(['local_server_url' => 'Enter the local server URL before saving. Use Disable local failover to turn it off.']);
        }
        abort_if($request->boolean('disable_failover') && ($localServerUrl !== '' || $cloudServerUrl !== ''), 422, 'Clear both server URLs when disabling local failover.');

        foreach ([$localServerUrl, $cloudServerUrl] as $url) {
            if ($url === '') {
                continue;
            }
            $parts = parse_url($url);
            abort_unless(is_array($parts) && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['query']) && ! isset($parts['fragment'])
                && in_array($parts['path'] ?? '', ['', '/', '/api', '/api/'], true), 422, 'Use a server URL without credentials, query or fragment.');
            abort_if(in_array((int) ($parts['port'] ?? 0), [5173, 5174, 4173, 4174], true), 422, 'This is a frontend preview port. Enter the ERP backend address, not the browser app URL.');
        }
        $localHost = strtolower(trim((string) parse_url($localServerUrl, PHP_URL_HOST), '[]'));
        abort_if($localHost === 'localhost' || (filter_var($localHost, FILTER_VALIDATE_IP) && \Symfony\Component\HttpFoundation\IpUtils::checkIp($localHost, ['127.0.0.0/8', '::1/128'])), 422, 'Use the backend LAN address. Loopback addresses cannot provide store-wide failover.');
        $localServerUrl = preg_replace('~/api/?$~', '', $localServerUrl);

        if ($cloudServerUrl !== '' && ! preg_match('#^https?://#i', $cloudServerUrl)) {
            return response()->json([
                'success' => false,
                'message' => 'Enter a valid cloud server URL (must start with http:// or https://).',
            ], 422);
        }

        $node = StoreLocalNode::where('store_id', $storeId)->first();
        if (! $node && $localServerUrl === '') {
            // Turning failover off for a store that never had it: nothing to save, no sync identity to create.
            return response()->json(['success' => true, 'message' => 'Local server failover is off for this store.',
                'data' => $this->presentLocalServerNode(null, $storeId)]);
        }
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

    /**
     * On-prem only: connect this server to the cloud with a cloud company admin's sign-in (used once, never
     * stored), then copy the store's data and users. Afterwards the counters can fail over to the cloud.
     */
    public function connectToCloud(Request $request, LocalNodeRegistration $registration)
    {
        abort_unless(in_array($request->user()?->role, ['admin', 'super_admin'], true), 403, 'Only administrators can connect this server to the cloud.');
        abort_unless(config('sync.node_role') === 'local', 409, 'Connect to cloud is done on the on-prem server (SYNC_NODE_ROLE=local).');
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        $store = app(StoreContext::class)->available($request->user())->find($storeId);
        abort_unless($store, 422, 'Select the store this server runs first.');
        $data = $request->validate([
            'counter_url' => 'required|url:http,https|max:2048',
            'cloud_server_url' => 'required|url:http,https|max:2048',
            'username' => 'required|string|max:255',
            'password' => 'required|string|max:255',
        ]);

        $node = $registration->connect($store, $data, $request->getSchemeAndHttpHost());

        return response()->json(['success' => true, 'message' => "Connected to the cloud. {$node->users_synced} user(s) copied.",
            'data' => $this->presentLocalServerNode($node, $node->store_id)]);
    }

    /**
     * On-prem only, before anyone can sign in: first-time setup of a fresh server from its cloud. A cloud admin's
     * sign-in is checked by the cloud (with its lockout); nothing here trusts the caller.
     */
    public function bootstrapOnPrem(Request $request, LocalNodeRegistration $registration)
    {
        $data = $request->validate([
            'username' => 'required|string|max:255',
            'password' => 'required|string|max:255',
            'store_code' => 'nullable|string|max:100',
            'counter_url' => 'required|url:http,https|max:2048',
        ]);
        @set_time_limit(900);
        $node = $registration->bootstrap($data, $request->getSchemeAndHttpHost());

        $storeName = $node->store?->name ?: 'the store';

        return response()->json(['success' => true, 'message' => "This server is set up for {$storeName}. {$node->users_synced} staff account(s) copied. Sign in with your cloud account.",
            'data' => ['store' => $node->store?->only(['code', 'name']), 'users_synced' => (int) $node->users_synced]]);
    }

    /** On-prem only: sync with the cloud now instead of waiting for the 15-second job. */
    public function syncNow(Request $request)
    {
        $node = $this->onPremNodeForAdmin($request);
        $result = app(\App\Services\Platform\SyncCycleService::class)->run();
        if (! ($result['ran'] ?? false)) {
            return response()->json(['success' => false, 'message' => $result['reason'] ?? 'The sync did not run.'], ($result['busy'] ?? false) ? 409 : 422);
        }
        $pushed = $result['pushed'];
        $pulled = $result['pulled'];
        $message = "Sent {$pushed['sent']} and received {$pulled['applied']} change(s).";
        if ($pushed['failed'] || $pulled['failed'] || $pushed['stopped_early']) {
            $message .= $pushed['stopped_early'] ? ' The cloud did not answer; waiting changes stay queued.' : '';
            $message .= $pushed['failed'] ? " {$pushed['failed']} change(s) were refused by the cloud (see the list below)." : '';
            $message .= $pulled['failed'] ? " {$pulled['failed']} cloud change(s) could not be applied here." : '';
        }

        return response()->json(['success' => true, 'message' => $message, 'data' => $this->presentLocalServerNode($node->refresh(), $node->store_id)]);
    }

    /** On-prem only: copy staff accounts and the store's data from the cloud again. */
    public function recopyFromCloud(Request $request, LocalNodeRegistration $registration)
    {
        $node = $this->onPremNodeForAdmin($request);
        @set_time_limit(900);
        $copied = $registration->recopy($node);

        return response()->json(['success' => true, 'message' => "Copied from the cloud: {$copied['rows']} record(s), ".($copied['users'] ?? 0).' staff account(s).',
            'data' => $this->presentLocalServerNode($node->refresh(), $node->store_id)]);
    }

    /** On-prem only: what the sync is doing right now, for the footer. Cheap; counters ask every few seconds. */
    public function syncProgress()
    {
        return response()->json(['success' => true, 'data' => config('sync.node_role') === 'local' ? \App\Services\Platform\SyncProgress::current() : null]);
    }

    private function onPremNodeForAdmin(Request $request): StoreLocalNode
    {
        abort_unless(in_array($request->user()?->role, ['admin', 'super_admin'], true), 403, 'Only administrators can run a sync by hand.');
        abort_unless(config('sync.node_role') === 'local', 409, 'This is done on the on-prem server.');
        $node = StoreLocalNode::where('enabled', true)->first();
        abort_unless($node, 409, 'This server is not connected to the cloud yet. Use Connect to cloud first.');

        return $node;
    }

    /** On-prem only: a cloud sign-in for the signed-in cashier, kept by the counter for an outage. */
    public function failoverSession(Request $request)
    {
        abort_unless(config('sync.node_role') === 'local', 404, 'Not an on-prem server.');
        $node = StoreLocalNode::where('enabled', true)->first();
        abort_unless($node, 409, 'This server is not connected to the cloud yet.');
        try {
            $response = Http::acceptJson()->withHeaders(['X-Tenant-Key' => $node->tenant_key, 'X-Sync-Token' => $node->sync_token])
                ->timeout(5)->post(LocalNodeRegistration::cloudApiBase($node->cloud_server_url).'/sync/failover-session', ['username' => $request->user()->username]);
        } catch (\Throwable) {
            return response()->json(['success' => false, 'message' => 'The cloud could not be reached.'], 503);
        }
        if (! $response->successful()) {
            return response()->json(['success' => false, 'message' => $response->json('message') ?: 'The cloud refused a failover sign-in.'], $response->status() === 404 ? 404 : 503);
        }

        return response()->json(['success' => true, 'data' => [
            'token' => $response->json('data.token'),
            'expires_at' => $response->json('data.expires_at'),
            'cloud_api_base_url' => LocalNodeRegistration::cloudApiBase($node->cloud_server_url),
        ]]);
    }

    /**
     * On-prem only: someone who signed in on the cloud during an outage gets an on-prem sign-in once this
     * server is back. The cloud confirms whose sign-in it is; nothing else is trusted from the browser.
     */
    public function exchangeFailoverSession(Request $request)
    {
        abort_unless(config('sync.node_role') === 'local', 404, 'Not an on-prem server.');
        $request->validate(['cloud_token' => 'required|string|max:500']);
        $node = StoreLocalNode::where('enabled', true)->first();
        abort_unless($node, 409, 'This server is not connected to the cloud yet.');
        try {
            $response = Http::acceptJson()->withHeaders(['X-Tenant-Key' => $node->tenant_key, 'X-Sync-Token' => $node->sync_token])
                ->timeout(5)->post(LocalNodeRegistration::cloudApiBase($node->cloud_server_url).'/sync/session-user', ['token' => $request->input('cloud_token')]);
        } catch (\Throwable) {
            return response()->json(['success' => false, 'message' => 'The cloud could not be reached.'], 503);
        }
        if ($response->status() === 401) {
            return response()->json(['success' => false, 'message' => 'Sign in again.'], 401);
        }
        if (! $response->successful()) {
            return response()->json(['success' => false, 'message' => 'The cloud could not confirm this sign-in.'], 503);
        }
        $user = User::where('username', (string) $response->json('data.username'))->first();
        if (! $user || ! $user->is_active) {
            return response()->json(['success' => false, 'message' => 'Your account has not reached this server yet. Sign in again in a minute.'], 401);
        }

        return $this->completeLogin($user);
    }

    /** Same scheme, host and port, compared the way the connection probe normalizes them (case, default port, /api). */
    private function sameServerOrigin(string $one, string $two): bool
    {
        try {
            $probe = app(\App\Services\Platform\RegisteredServerProbe::class);

            return $one !== '' && $probe->normalize($one) === $probe->normalize($two);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException) {
            return false; // normalize() rejects addresses on ports a store server may not use.
        }
    }

    public function localServerConfigRuntime(Request $request)
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        $node = StoreLocalNode::where('store_id', $storeId)->where('enabled', true)->first();

        $developmentOnly = $node && app()->environment('local') && config('sync.node_role') !== 'local'
            && config('sync.development_server_origin') && $this->sameServerOrigin((string) $node->local_server_url, (string) config('sync.development_server_origin'));

        return response()->json([
            'success' => true,
            'data' => [
                'enabled' => (bool) $node && ! $developmentOnly,
                'blocked_reason' => $developmentOnly ? 'The development backend is not configured as a local sync connector.' : null,
                'tenant_key' => $node->tenant_key ?? null,
                'local_server_url' => $node->local_server_url ?? null,
                'cloud_server_url' => $node->cloud_server_url ?? null,
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
                'node_role' => config('sync.node_role'),
                'enabled' => false,
                'tenant_key' => null,
                'counter_url' => null,
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

        // The on-prem server's heartbeat (every sync cycle) is the real signal; a manual Test Local is the fallback.
        $lastSeen = collect([$node->last_heartbeat_at, $node->last_health_check_at])->filter()->max();
        $status = ! $lastSeen
            ? 'not_connected'
            : ($node->local_healthy && (! $node->last_heartbeat_at || $node->last_heartbeat_at->gt(now()->subMinutes(3))) ? 'online' : 'offline');

        $onPrem = config('sync.node_role') === 'local';

        return [
            'node_role' => config('sync.node_role'),
            'enabled' => (bool) $node->enabled,
            'tenant_key' => $node->tenant_key,
            'counter_url' => $node->counter_url,
            'last_cycle_at' => optional($node->last_cycle_at)->toIso8601String(),
            'last_users_sync_at' => optional($node->last_users_sync_at)->toIso8601String(),
            'users_synced' => (int) $node->users_synced,
            'last_heartbeat_at' => optional($node->last_heartbeat_at)->toIso8601String(),
            'handshake' => $onPrem && $node->enabled ? app(LocalNodeRegistration::class)->handshakeState($node) : null,
            'sync_progress' => $onPrem ? \App\Services\Platform\SyncProgress::current() : null,
            'last_sync' => $onPrem ? \App\Services\Platform\SyncCycleService::lastResult() : null,
            'local_server_url' => $node->local_server_url,
            'cloud_server_url' => $node->cloud_server_url,
            'effective_cloud_server_url' => $node->cloud_server_url ?: config('sync.cloud_api_base_url'),
            'advertised_local_server_url' => $node->advertised_local_server_url,
            'connector_status' => $status,
            'connector_last_seen_at' => optional($lastSeen)->toIso8601String(),
            'local_healthy' => (bool) $node->local_healthy,
            'outbox_pending' => $outboxPending,
            'outbox_failed' => $outboxFailed,
        ];
    }

    public function counters(Request $request)
    {
        // Counter selection is account metadata, not permission to manage Settings.
        // The shared configuration query retains the resolved store ownership scope.
        return app(ConfigurationController::class)->getCounters($request);
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

        $request->validate(['counterId' => 'required|integer|min:1']);
        $counter = PosCounter::find((int) $counterId, $this->resolveStoreId($request, null));
        abort_unless($counter !== null, 422, 'Select an active counter in the current store.');
        $user->update(['counter_id' => $counter->id]);

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
                    'logo' => $user->store?->logo,
                    ...app(StoreContext::class)->authFields($user),
                ],
                'token' => $request->bearerToken(),
            ],
        ]);
    }
}
