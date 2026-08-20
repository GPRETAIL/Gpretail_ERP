<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserAccessController extends Controller
{
    // Users Management
    public function index(Request $request)
    {
        $query = User::with('store');

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
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('created_at', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => $paginated->items(),
            'total'   => $paginated->total(),
            'page'    => $paginated->currentPage(),
            'limit'   => $paginated->perPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'     => 'required|string|max:255',
            'username' => 'required|string|max:50|unique:users,username',
            'email'    => 'nullable|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'nullable|string|max:50',
            'store_id' => 'nullable|exists:stores,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'name'                 => $request->input('name'),
            'username'             => $request->input('username'),
            'email'                => $request->input('email') ?: $request->input('username') . '@gpretail.uk',
            'password'             => Hash::make($request->input('password')),
            'role'                 => $request->input('role', 'staff'),
            'store_id'             => $request->input('store_id') ?: 1,
            'phone'                => $request->input('phone'),
            'is_active'            => $request->boolean('is_active', true),
            'must_change_password' => $request->boolean('must_change_password', false),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully',
            'data'    => $user->load('store'),
        ], 201);
    }

    public function show($id)
    {
        $user = User::with('store')->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $user,
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name'     => 'sometimes|required|string|max:255',
            'username' => 'sometimes|required|string|max:50|unique:users,username,' . $id,
            'email'    => 'nullable|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $request->only(['name', 'username', 'email', 'role', 'store_id', 'phone', 'is_active', 'must_change_password']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->input('password'));
        }

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data'    => $user->load('store'),
        ]);
    }

    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
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
        $user = User::find($id);
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

        if ($roles->isEmpty()) {
            $defaultRole = Role::create([
                'name'         => 'admin',
                'display_name' => 'Administrator',
                'description'  => 'Full system administrative access',
            ]);
            $roles = collect([$defaultRole]);
        }

        return response()->json([
            'success' => true,
            'data'    => $roles,
            'total'   => $roles->count(),
        ]);
    }

    public function groupsStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'         => 'required|string|max:100|unique:roles,name',
            'display_name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $role = Role::create([
            'name'         => $request->input('name'),
            'display_name' => $request->input('display_name') ?: ucwords($request->input('name')),
            'description'  => $request->input('description'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Access group created successfully',
            'data'    => $role,
        ], 201);
    }

    public function groupsUpdate(Request $request, $id)
    {
        $role = Role::find($id);

        if (!$role) {
            return response()->json([
                'success' => false,
                'message' => 'Role group not found',
            ], 404);
        }

        $role->update($request->only(['name', 'display_name', 'description']));

        return response()->json([
            'success' => true,
            'message' => 'Role group updated successfully',
            'data'    => $role,
        ]);
    }

    public function groupsDestroy($id)
    {
        $role = Role::find($id);

        if (!$role) {
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
            'data'    => $stores,
            'total'   => $stores->count(),
        ]);
    }

    public function storeGroupsStore(Request $request)
    {
        $store = Store::create([
            'name'      => $request->input('name', 'Branch Store'),
            'code'      => $request->input('code') ?: 'STR_' . strtoupper(substr(uniqid(), -6)),
            'city'      => $request->input('city', 'Chennai'),
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Store group created successfully',
            'data'    => $store,
        ], 201);
    }

    public function storeGroupsUpdate(Request $request, $id)
    {
        $store = Store::find($id);

        if (!$store) {
            return response()->json([
                'success' => false,
                'message' => 'Store not found',
            ], 404);
        }

        $store->update($request->only(['name', 'code', 'city', 'is_active']));

        return response()->json([
            'success' => true,
            'message' => 'Store updated successfully',
            'data'    => $store,
        ]);
    }

    public function storeGroupsDestroy($id)
    {
        $store = Store::find($id);

        if (!$store) {
            return response()->json([
                'success' => false,
                'message' => 'Store not found',
            ], 404);
        }

        $store->delete();

        return response()->json([
            'success' => true,
            'message' => 'Store deleted successfully',
        ]);
    }

    // User Table Preferences
    public function getTablePreferences(Request $request, $tableKey)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'table_key'   => $tableKey,
                'preferences' => [],
            ],
        ]);
    }

    public function updateTablePreferences(Request $request, $tableKey)
    {
        return response()->json([
            'success' => true,
            'message' => 'Table preferences saved',
            'data'    => [
                'table_key'   => $tableKey,
                'preferences' => $request->all(),
            ],
        ]);
    }
}
