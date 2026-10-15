<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Store;
use App\Models\User;
use App\Services\PaginationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserAccessController extends Controller
{
    public function __construct(private readonly PaginationService $paginationService) {}

    private function authorizeAdministration(): void
    {
        abort_unless(in_array(request()->user()?->role, ['admin', 'super_admin'], true), 403, 'Only administrators can manage users and access groups.');
    }

    private function scopedUsers(): Builder
    {
        $query = User::query()->whereIn('store_id', request()->attributes->get('store_context_ids', []));
        $code = request()->user()?->platform_company_code;
        if ($code) {
            $query->where('platform_company_code', $code);
        }

        return $query;
    }

    // Users Management
    public function index(Request $request)
    {
        $query = $this->scopedUsers()->with('store');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('name')->get();

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $items->count(),
            ]);
        }

        $result = $this->paginationService->paginate($query, 'users', $request, [
            'default_sort' => 'id',
            'default_order' => 'desc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'name', 'username', 'email', 'created_at'],
        ]);

        return response()->json($result);
    }

    public function store(Request $request)
    {
        $this->authorizeAdministration();
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:50|unique:users,username',
            'email' => 'nullable|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|string|max:50',
            'store_id' => 'nullable|exists:stores,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        abort_if($request->user()?->role !== 'super_admin' && $request->input('role') === 'super_admin', 403, 'Tenant users cannot create platform administrators.');
        $user = DB::transaction(function () use ($request): User {
            $selected = $request->attributes->get('store_context_id');
            Store::whereKey($selected)->lockForUpdate()->firstOrFail();
            $claims = $request->attributes->get('store_licence_claims', []);
            $limit = (int) ($claims['limits']['maxUsers'] ?? 0);
            if ($request->boolean('is_active', true) && $limit > 0 && User::where('store_id', $selected)->where('is_active', true)->count() >= $limit) {
                abort(422, 'This store has reached its licensed user limit.');
            }

            return User::create([
                'name' => $request->input('name'),
                'username' => $request->input('username'),
                'email' => $request->input('email') ?: $request->input('username').'@gpretail.uk',
                'password' => Hash::make($request->input('password')),
                'role' => $request->input('role', 'staff'),
                'store_id' => $request->attributes->get('store_context_id'),
                'platform_company_code' => Store::find($request->attributes->get('store_context_id'))?->platform_company_code,
                'phone' => $request->input('phone'),
                'is_active' => $request->boolean('is_active', true),
                'must_change_password' => $request->boolean('must_change_password', false),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'User created successfully',
            'data' => $user->load('store'),
        ], 201);
    }

    public function show($id)
    {
        $user = $this->scopedUsers()->with('store')->find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    public function update(Request $request, $id)
    {
        $this->authorizeAdministration();
        $user = $this->scopedUsers()->find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'username' => 'sometimes|required|string|max:50|unique:users,username,'.$id,
            'email' => 'nullable|email|max:255|unique:users,email,'.$id,
            'password' => 'nullable|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->only(['name', 'username', 'email', 'role', 'store_id', 'phone', 'is_active', 'must_change_password']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->input('password'));
        }

        abort_if($request->has('store_id') && (int) $request->input('store_id') !== $user->store_id, 403, 'User store reassignment requires explicit provisioning.');
        abort_if($request->user()?->role !== 'super_admin' && $request->input('role') === 'super_admin', 403, 'Tenant users cannot become platform administrators.');
        DB::transaction(function () use ($request, $user, $data): void {
            Store::whereKey($user->store_id)->lockForUpdate()->firstOrFail();
            $limit = (int) ($request->attributes->get('store_licence_claims', [])['limits']['maxUsers'] ?? 0);
            if (! $user->is_active && $request->boolean('is_active') && $limit > 0 && User::where('store_id', $user->store_id)->where('is_active', true)->count() >= $limit) {
                abort(422, 'This store has reached its licensed user limit.');
            }
            $user->update($data);
        });

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => $user->load('store'),
        ]);
    }

    public function destroy($id)
    {
        $this->authorizeAdministration();
        $user = $this->scopedUsers()->find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully',
        ]);
    }

    public function forceLogout($id)
    {
        $this->authorizeAdministration();
        $user = $this->scopedUsers()->find($id);
        if ($user) {
            $user->tokens()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'User logged out from all active sessions',
        ]);
    }

    // Role / Permission Groups
    public function groupsIndex(Request $request)
    {
        $roles = Role::with('permissions')->get();

        return response()->json([
            'success' => true,
            'data' => $roles,
            'total' => $roles->count(),
        ]);
    }

    public function groupsStore(Request $request)
    {
        $this->authorizeAdministration();
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:roles,name',
            'display_name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $role = Role::create([
            'name' => $request->input('name'),
            'display_name' => $request->input('display_name') ?: ucwords($request->input('name')),
            'description' => $request->input('description'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Access group created successfully',
            'data' => $role,
        ], 201);
    }

    public function groupsUpdate(Request $request, $id)
    {
        $this->authorizeAdministration();
        $role = Role::find($id);

        if (! $role) {
            return response()->json([
                'success' => false,
                'message' => 'Role group not found',
            ], 404);
        }

        $role->update($request->only(['name', 'display_name', 'description']));

        return response()->json([
            'success' => true,
            'message' => 'Role group updated successfully',
            'data' => $role,
        ]);
    }

    public function groupsDestroy($id)
    {
        $this->authorizeAdministration();
        $role = Role::find($id);

        if (! $role) {
            return response()->json([
                'success' => false,
                'message' => 'Role group not found',
            ], 404);
        }

        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Role group deleted successfully',
        ]);
    }

    // Store Groups
    public function storeGroupsIndex(Request $request)
    {
        $stores = Store::where('is_active', true)->get();

        return response()->json([
            'success' => true,
            'data' => $stores,
            'total' => $stores->count(),
        ]);
    }

    public function storeGroupsStore(Request $request)
    {
        $this->authorizeAdministration();

        return app(StoreController::class)->store($request);
    }

    public function storeGroupsUpdate(Request $request, $id)
    {
        $this->authorizeAdministration();

        return app(StoreController::class)->update($request, $id);
    }

    public function storeGroupsDestroy(Request $request, $id)
    {
        $this->authorizeAdministration();

        return app(StoreController::class)->destroy($request, $id);
    }

    // User Table Preferences
    public function getTablePreferences(Request $request, $tableKey)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'table_key' => $tableKey,
                'preferences' => [],
            ],
        ]);
    }

    public function updateTablePreferences(Request $request, $tableKey)
    {
        return response()->json([
            'success' => true,
            'message' => 'Table preferences saved',
            'data' => [
                'table_key' => $tableKey,
                'preferences' => $request->all(),
            ],
        ]);
    }
}
