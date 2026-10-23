<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\PlatformActivation;
use App\Models\Role;
use App\Models\Store;
use App\Models\User;
use App\Services\MobileAccess;
use App\Services\PagePermissions;
use App\Services\PaginationService;
use App\Services\StoreContext;
use App\Services\StoreLicenceVerifier;
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
        $ids = app(StoreContext::class)->available(request()->user())->pluck('id')->all();
        $query = User::query()->where(fn ($q) => $q->whereIn('store_id', $ids)
            ->orWhereHas('assignedStores', fn ($stores) => $stores->whereIn('stores.id', $ids)));
        $code = request()->user()?->platform_company_code;
        if ($code) {
            $query->where('platform_company_code', $code);
        }

        return $query;
    }

    // Users Management
    public function clientAccess(Request $request, int $id)
    {
        $this->authorizeAdministration();
        $user = $this->scopedUsers()->findOrFail($id);
        $access = app(MobileAccess::class);
        $store = app(StoreContext::class)->available($request->user())->findOrFail($user->store_id);
        $status = $access->storeStatus($user, $store);
        if ($request->isMethod('put')) {
            $data = $request->validate([
                'web_access' => 'required|boolean', 'mobile_access' => 'required|boolean',
                'module_permissions' => 'present|array:'.implode(',', $access::MODULES),
                'module_permissions.*' => 'array:'.implode(',', $access::ACTIONS),
                'module_permissions.*.*' => 'boolean',
            ]);
            foreach ($data['module_permissions'] as $module => $actions) {
                foreach ($actions as $action => $enabled) {
                    if ($enabled) {
                        abort_unless($status['action_limits'][$module][$action] ?? false, 422, 'This store subscription does not include the requested module action.');
                    }
                }
            }
            abort_if($data['mobile_access'] && (! $store->is_active || ! $status['mobile_entitled']), 422, 'The store needs an active subscription that includes mobile before granting access.');
            $data['module_permissions'] = array_map(fn ($actions) => array_map(fn ($value) => (bool) $value, $actions), $data['module_permissions']);
            $user->update($data);
        }

        return response()->json(['success' => true, 'data' => [
            'user' => $user->only(['id', 'name', 'email', 'web_access', 'mobile_access', 'module_permissions']),
            'store' => $status, 'modules' => $access::MODULES, 'actions' => $access::ACTIONS,
        ]]);
    }

    public function index(Request $request)
    {
        $query = $this->scopedUsers()->with(['store', 'assignedStores:id']);

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
                'data' => $items->map(fn ($user) => $this->presentUser($user)),
                'total' => $items->count(),
            ]);
        }

        $result = $this->paginationService->paginate($query, 'users', $request, [
            'default_sort' => 'id',
            'default_order' => 'desc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'name', 'username', 'email', 'created_at'],
        ]);

        $result['data'] = collect($result['data'])->map(fn ($user) => $this->presentUser($user))->all();

        return response()->json($result);
    }

    private function presentUser(User $user): array
    {
        $user->loadMissing('assignedStores:id');
        $data = $user->toArray();
        unset($data['assigned_stores']);
        $data['company_ids'] = array_values(array_unique(array_filter([$user->store_id, ...$user->assignedStores->pluck('id')->all()])));
        $data['effective_page_permissions'] = app(PagePermissions::class)->effective($user);

        return $data;
    }

    private function assignments(Request $request, ?User $user = null): array
    {
        $request->validate(['companyIds' => 'sometimes|array|min:1|max:100', 'companyIds.*' => 'integer|min:1|distinct',
            'pagePermissions' => 'sometimes|array|max:1000', 'pagePermissions.*' => 'array:view,add,edit,delete', 'pagePermissions.*.*' => 'boolean']);
        $ids = $request->input('companyIds', $request->filled('store_id') ? [$request->integer('store_id')]
            : ($user ? $this->presentUser($user)['company_ids'] : [$request->attributes->get('store_context_id')]));
        $ids = array_values(array_unique(array_map('intval', $ids)));
        $allowed = app(StoreContext::class)->available($request->user())->pluck('id')->all();
        abort_unless($ids && ! array_diff($ids, $allowed), 403, 'Assign only stores available to your account.');
        if ($user) {
            abort_if(array_diff($this->presentUser($user)['company_ids'], $allowed), 403, 'You cannot modify assignments outside your store access.');
            abort_if($user->role === 'admin' && $ids !== [$user->store_id], 403, 'Store administrator assignments are managed by provisioning.');
        }
        $stores = Store::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get();
        abort_if($stores->pluck('platform_company_code')->unique()->count() > 1, 422, 'All assigned stores must belong to the same company.');
        $active = $request->has('is_active') ? $request->boolean('is_active') : ($user?->is_active ?? true);
        foreach ($stores as $store) {
            abort_unless($store->is_active, 422, 'Assign an active store.');
            $limit = 0;
            if ($store->platform_store_id || PlatformActivation::current()?->activated) {
                $licence = app(StoreLicenceVerifier::class)->verify($store);
                abort_unless($licence['ok'], 422, $licence['message']);
                $limit = (int) ($licence['claims']['limits']['maxUsers'] ?? 0);
            }
            $count = User::where('is_active', true)->when($user, fn ($q) => $q->whereKeyNot($user->id))
                ->where(fn ($q) => $q->where('store_id', $store->id)->orWhereHas('assignedStores', fn ($sq) => $sq->where('stores.id', $store->id)))->count();
            abort_if($active && $limit > 0 && $count >= $limit, 422, 'An assigned store has reached its licensed user limit.');
        }
        if ($request->filled('accessGroupId') || $request->filled('storeGroupId')) {
            abort(422, 'Select stores and page permissions directly for this user.');
        }
        if ($request->has('pagePermissions')) {
            $permissions = app(PagePermissions::class)->normalize($request->input('pagePermissions'));
            foreach ($permissions as $path => $actions) {
                foreach ($actions as $action => $enabled) {
                    abort_if($enabled && (! app(PagePermissions::class)->allows($request->user(), $path, $action)
                        || ! app(MobileAccess::class)->userAllows($request->user(), explode('/', trim($path, '/'))[0], $action)), 403, 'You cannot grant permissions beyond your own access.');
                }
            }
        } else {
            $permissions = $user?->page_permissions;
        }

        return [$ids, $stores->first()?->platform_company_code, $permissions];
    }

    public function store(Request $request)
    {
        $this->authorizeAdministration();
        $request->validate(['name' => 'required|string|max:255', 'username' => 'required|string|max:255|unique:users,username',
            'email' => 'nullable|email|max:255|unique:users,email', 'password' => 'required|string|min:6',
            'role' => 'nullable|in:user,staff,manager,cashier,accountant,warehouse_user,store_user,admin,super_admin', 'store_id' => 'nullable|exists:stores,id']);
        abort_if($request->user()->role !== 'super_admin' && $request->input('role') === 'super_admin', 403, 'Tenant users cannot create platform administrators.');
        $user = DB::transaction(function () use ($request): User {
            [$ids, $company, $permissions] = $this->assignments($request);
            $user = User::create(['name' => $request->input('name'), 'username' => $request->input('username'),
                'email' => $request->input('email') ?: $request->input('username').'@gpretail.uk', 'password' => Hash::make($request->input('password')),
                'role' => $request->input('role', 'staff'), 'store_id' => $ids[0], 'platform_company_code' => $company,
                'phone' => $request->input('phone'), 'is_active' => $request->boolean('is_active', true),
                'must_change_password' => $request->boolean('must_change_password', false), 'page_permissions' => $permissions]);
            $user->assignedStores()->sync($ids);

            return $user;
        });

        return response()->json(['success' => true, 'message' => 'User created successfully', 'data' => $this->presentUser($user->load('store'))], 201);
    }

    public function show($id)
    {
        $user = $this->scopedUsers()->with(['store', 'assignedStores:id'])->find($id);

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->presentUser($user),
        ]);
    }

    public function update(Request $request, $id)
    {
        $this->authorizeAdministration();
        $user = $this->scopedUsers()->findOrFail($id);
        $request->validate(['name' => 'sometimes|required|string|max:255', 'email' => 'nullable|email|max:255|unique:users,email,'.$id,
            'password' => 'nullable|string|min:6', 'role' => 'sometimes|in:user,staff,manager,cashier,accountant,warehouse_user,store_user,admin,super_admin']);
        abort_if($request->user()->role !== 'super_admin' && $request->input('role') === 'super_admin', 403, 'Tenant users cannot become platform administrators.');
        DB::transaction(function () use ($request, $user): void {
            [$ids, $company, $permissions] = $this->assignments($request, $user);
            $data = $request->only(['name', 'email', 'role', 'phone', 'is_active', 'must_change_password']);
            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->input('password'));
            }
            $user->update([...$data, 'store_id' => $ids[0], 'platform_company_code' => $company, 'page_permissions' => $permissions]);
            $user->assignedStores()->sync($ids);
            $user->tokens()->delete();
        });

        return response()->json(['success' => true, 'message' => 'User updated successfully', 'data' => $this->presentUser($user->fresh('store'))]);
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
        return app(StoreController::class)->index($request);
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
        $user = $request->user();
        $allPrefs = $user?->dashboard_layouts['_table_preferences'] ?? [];
        $saved = is_array($allPrefs[$tableKey] ?? null) ? $allPrefs[$tableKey] : [];

        return response()->json([
            'success' => true,
            'data' => [
                'table_key' => $tableKey,
                'visible_columns' => $saved['visible_columns'] ?? null,
                'column_order' => $saved['column_order'] ?? null,
                'pinned_column_keys' => $saved['pinned_column_keys'] ?? [],
                'preferences' => $saved,
            ],
        ]);
    }

    public function updateTablePreferences(Request $request, $tableKey)
    {
        $request->validate([
            'visibleColumns' => ['nullable', 'array'],
            'visible_columns' => ['nullable', 'array'],
            'columnOrder' => ['nullable', 'array'],
            'column_order' => ['nullable', 'array'],
            'pinnedColumnKeys' => ['nullable', 'array'],
            'pinned_column_keys' => ['nullable', 'array'],
        ]);

        $saved = [
            'visible_columns' => $request->input('visibleColumns', $request->input('visible_columns')),
            'column_order' => $request->input('columnOrder', $request->input('column_order')),
            'pinned_column_keys' => $request->input('pinnedColumnKeys', $request->input('pinned_column_keys', [])),
        ];

        $user = $request->user();
        if ($user) {
            $layouts = $user->dashboard_layouts ?? [];
            $tablePrefs = is_array($layouts['_table_preferences'] ?? null) ? $layouts['_table_preferences'] : [];
            $tablePrefs[$tableKey] = $saved;
            $layouts['_table_preferences'] = $tablePrefs;
            $user->dashboard_layouts = $layouts;
            $user->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Table preferences saved',
            'data' => [
                'table_key' => $tableKey,
                ...$saved,
                'preferences' => $saved,
            ],
        ]);
    }
}
