<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\StaffAppAccess;
use App\Services\Security\FailedAttempts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Sign-in for the staff app (/hr): the employee's mobile number and a PIN set by HR. Staff without an ERP login
 * get a hidden one (role "staff") at their first sign-in; the token only reaches HR self-service and approvals.
 */
class StaffAuthController extends Controller
{
    public function __construct(private readonly StaffAppAccess $access) {}

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['phone' => 'required|string|max:20', 'pin' => 'required|digits_between:4,6', 'store_id' => 'nullable|integer']);
        $phone = StaffAppAccess::phoneKey($data['phone']);
        $limits = [["staff-login:{$phone}|{$request->ip()}", 5, 900], ["staff-login:{$phone}", 20, 3600]];
        if ($wait = FailedAttempts::lockedFor($limits)) {
            return response()->json(['success' => false, 'message' => FailedAttempts::message('PIN attempts for this phone number', $wait)], 429)
                ->header('Retry-After', (string) $wait);
        }

        $candidates = strlen($phone) === 10 ? $this->access->employeesForPhone($phone) : collect();
        if (! empty($data['store_id'])) {
            $candidates = $candidates->where('store_id', (int) $data['store_id']);
        }
        // Every attempt pays for at least one hash check, so timing does not tell which numbers exist.
        $matches = $candidates->filter(fn (Employee $employee) => Hash::check($data['pin'], (string) $employee->app_pin))->values();
        if ($candidates->isEmpty()) {
            Hash::check($data['pin'], Cache::rememberForever('auth:staff-dummy-pin', fn () => Hash::make(Str::random(12))));
        }
        if ($matches->isEmpty()) {
            FailedAttempts::fail($limits);

            return response()->json(['success' => false, 'message' => 'Phone number or PIN is wrong.'], 401);
        }
        if ($matches->count() > 1) {
            // The same person works in more than one store: let them pick (only after the PIN is proven).
            return response()->json(['success' => false, 'error_code' => 'CHOOSE_STORE', 'message' => 'Choose your store.',
                'data' => ['stores' => $matches->map(fn ($e) => ['store_id' => $e->store_id, 'name' => Store::find($e->store_id)?->name])->values()]], 409);
        }
        FailedAttempts::clear($limits);

        $employee = $matches->first();
        $store = Store::find($employee->store_id);
        if (! $store || ! $this->access->storeAllowsApp($store)) {
            return response()->json(['success' => false, 'error_code' => 'MOBILE_SUBSCRIPTION_REQUIRED',
                'message' => "The HRMS app is not included in {$store?->name}'s subscription. Ask your company administrator."], 403);
        }

        $user = DB::transaction(fn () => $this->loginFor($employee, $store));
        if (! $user->is_active) {
            return response()->json(['success' => false, 'message' => 'Your login is switched off. Ask HR.'], 403);
        }
        $user->tokens()->where('name', StaffAppAccess::TOKEN_NAME)->delete();
        $token = $user->createToken(StaffAppAccess::TOKEN_NAME, ['client:staff'])->plainTextToken;
        Employee::withoutGlobalScopes()->whereKey($employee->id)->update(['app_last_login_at' => now()]);

        return response()->json(['success' => true, 'message' => 'Signed in', 'data' => [
            'token' => $token,
            'must_change_pin' => (bool) $employee->app_pin_must_change,
            'store' => ['id' => $store->id, 'name' => $store->name],
            'employee' => ['id' => $employee->id, 'name' => $employee->name],
            'user' => ['id' => $user->id, 'name' => $user->name, 'role' => $user->role, 'store_id' => $user->store_id, 'auth_client' => 'staff'],
        ]]);
    }

    /** The signed-in employee changes their own PIN (required after HR sets one). */
    public function changePin(Request $request): JsonResponse
    {
        // New PINs are 6 digits; sign-in still takes an older 4 or 5 digit PIN.
        $data = $request->validate(['current_pin' => 'required|digits_between:4,6', 'new_pin' => 'required|digits:6|different:current_pin'],
            ['new_pin.digits' => 'Choose a 6-digit PIN.']);
        $employee = Employee::withoutGlobalScopes()->where('user_id', $request->user()->id)->where('app_access', true)
            ->when($request->attributes->get('store_context_id'), fn ($q, $store) => $q->where('store_id', $store))->first();
        abort_unless($employee, 404, 'The HRMS app is not switched on for you.');
        if (! Hash::check($data['current_pin'], (string) $employee->app_pin)) {
            throw ValidationException::withMessages(['current_pin' => 'Your current PIN is wrong.']);
        }
        StaffAppAccess::assertStrongPin($data['new_pin'], 'new_pin');
        Employee::withoutGlobalScopes()->whereKey($employee->id)->update(['app_pin' => Hash::make($data['new_pin']), 'app_pin_must_change' => false, 'app_pin_set_at' => now()]);

        return response()->json(['success' => true, 'message' => 'PIN changed']);
    }

    /** The employee's ERP login, or a hidden staff login made the first time. */
    private function loginFor(Employee $employee, Store $store): User
    {
        if ($employee->user_id && ($user = User::find($employee->user_id))) {
            return $user;
        }
        $user = User::forceCreate([
            'name' => $employee->name, 'username' => 'staff.'.$employee->id.'.'.Str::lower(Str::random(6)),
            'email' => 'staff-'.$employee->id.'-'.Str::lower(Str::random(8)).StaffAppAccess::HIDDEN_EMAIL_DOMAIN,
            'password' => Hash::make(Str::random(40)), 'role' => 'staff', 'store_id' => $store->id, 'is_active' => true,
            'web_access' => false, 'mobile_access' => false, 'platform_company_code' => $store->platform_company_code,
        ]);
        Employee::withoutGlobalScopes()->whereKey($employee->id)->update(['user_id' => $user->id]);

        return $user;
    }
}
