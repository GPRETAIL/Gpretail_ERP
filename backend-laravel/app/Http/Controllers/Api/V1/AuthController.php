<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $loginId = trim($request->input('email') ?? $request->input('username') ?? '');
        $password = (string) $request->input('password');

        $user = User::where('username', $loginId)
            ->orWhere('email', $loginId)
            ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid username or password.',
            ], 401);
        }

        if (!$user->is_active) {
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
            'data'    => [
                'token' => $token,
                'user'  => [
                    'id'                   => $user->id,
                    'username'             => $user->username,
                    'name'                 => $user->name,
                    'email'                => $user->email,
                    'role'                 => $user->role,
                    'store_id'             => $user->store_id ?? 1,
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

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'       => $user->id,
                'username' => $user->username,
                'name'     => $user->name,
                'email'    => $user->email,
                'role'     => $user->role,
                'store_id' => $user->store_id ?? 1,
            ],
        ]);
    }

    public function localServerConfig()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'enabled' => false,
            ],
        ]);
    }

    public function counter(Request $request)
    {
        $user = $request->user();
        $counterId = $request->input('counterId');

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Update user's assigned counter (store in session/cache or on user model)
        // For now, return the user data with counter_id set
        return response()->json([
            'success' => true,
            'data'    => [
                'user'  => [
                    'id'         => $user->id,
                    'username'   => $user->username,
                    'name'       => $user->name,
                    'email'      => $user->email,
                    'role'       => $user->role,
                    'store_id'   => $user->store_id ?? 1,
                    'counter_id' => $counterId,
                ],
                'token' => $request->bearerToken(),
            ],
        ]);
    }
}
