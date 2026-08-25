<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
            ->orWhere('email', $loginId)
            ->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid username or password.',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'User account is deactivated.',
            ], 403);
        }

        // Create Sanctum Token
        $token = $user->createToken('auth-token')->plainTextToken;

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
                    'store_id' => $user->store_id ?? 1,
                    // "Company" and "Store" are the same concept in this
                    // app (CompanyController is backed by the Store model,
                    // the "Switch Store" dialog is the company switcher) -
                    // several frontend pages (Sales Customisation, POS
                    // receipt sync) have always expected company_id/
                    // company_name on the auth user but never received
                    // them, so those sync calls silently never fired.
                    'company_id' => $user->store_id ?? 1,
                    'company_name' => $user->store?->name,
                    'counter_id' => $user->counter_id,
                    'must_change_password' => (bool) $user->must_change_password,
                ],
            ],
        ]);
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
                'store_id' => $user->store_id ?? 1,
                'company_id' => $user->store_id ?? 1,
                'company_name' => $user->store?->name,
                'counter_id' => $user->counter_id,
            ],
        ]);
    }

    public function localServerConfig(Request $request)
    {
        $storeId = (int) $request->header('X-Company-Scope-Id', 1);
        $node = StoreLocalNode::where('store_id', $storeId)->first();

        return response()->json([
            'success' => true,
            'data' => $this->presentLocalServerNode($node),
        ]);
    }

    public function localServerConfigUpdate(Request $request)
    {
        $storeId = (int) $request->header('X-Company-Scope-Id', 1);
        $store = Store::find($storeId);

        if (! $store) {
            return response()->json(['success' => false, 'message' => 'Store not found'], 404);
        }

        $localServerUrl = trim((string) $request->input('local_server_url', ''));

        $node = StoreLocalNode::where('store_id', $storeId)->first();
        if (! $node) {
            $node = new StoreLocalNode(['store_id' => $storeId]);
            $node->tenant_key = (string) Str::uuid();
            $node->sync_token = Str::random(48);
        }

        $node->local_server_url = $localServerUrl !== '' ? $localServerUrl : null;
        $node->enabled = $localServerUrl !== '';
        $node->save();

        return response()->json([
            'success' => true,
            'message' => 'Local server configuration saved',
            'data' => $this->presentLocalServerNode($node),
        ]);
    }

    public function localServerConfigRuntime(Request $request)
    {
        $storeId = (int) ($request->header('X-Company-Scope-Id') ?: ($request->user()->store_id ?? 1));
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

    private function presentLocalServerNode(?StoreLocalNode $node): array
    {
        if (! $node) {
            return [
                'enabled' => false,
                'tenant_key' => null,
                'local_server_url' => null,
                'advertised_local_server_url' => null,
                'connector_status' => 'not_connected',
                'connector_last_seen_at' => null,
                'local_healthy' => false,
            ];
        }

        $status = ! $node->last_health_check_at
            ? 'not_connected'
            : ($node->local_healthy ? 'online' : 'offline');

        return [
            'enabled' => (bool) $node->enabled,
            'tenant_key' => $node->tenant_key,
            'local_server_url' => $node->local_server_url,
            'advertised_local_server_url' => $node->advertised_local_server_url,
            'connector_status' => $status,
            'connector_last_seen_at' => optional($node->last_health_check_at)->toIso8601String(),
            'local_healthy' => (bool) $node->local_healthy,
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
                    'store_id' => $user->store_id ?? 1,
                    'company_id' => $user->store_id ?? 1,
                    'company_name' => $user->store?->name,
                    'counter_id' => $counterId,
                ],
                'token' => $request->bearerToken(),
            ],
        ]);
    }
}
