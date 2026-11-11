<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\Store;
use App\Models\User;
use App\Services\Platform\StoreLicenceVerifier;
use App\Services\Tenancy\BusinessPermissions;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * The staff app (/hr): who may sign in (an active employee HR switched on, in a store whose licence includes the
 * mobile channel), their PIN, and the small part of the API a staff-app token can reach: the employee's own HR
 * and, for managers, approving their team.
 */
class StaffAppAccess
{
    public const TOKEN_NAME = 'staff-token';

    /** Email domain of the hidden logins made for staff without an ERP login. */
    public const HIDDEN_EMAIL_DOMAIN = '@staff.invalid';

    /** Approvals a manager can act on from the staff app, and the inbox reads behind them. */
    private const APPROVALS = [
        'LeaveApplicationController' => ['index', 'approve', 'reject', 'balances'],
        'HrRequestController' => ['index', 'approve', 'reject'],
        'OvertimeController' => ['index', 'decide'],
        'StaffMoneyController' => ['loans', 'claims', 'decideLoan', 'decideClaim', 'bill'],
        'SeparationController' => ['index', 'accept', 'reject'],
    ];

    private const ALWAYS = [
        'StaffAppController' => null, 'NotificationController' => null, 'PushSubscriptionController' => null,
        'HolidayController' => ['index'], 'StaffAuthController' => ['changePin'], 'AuthController' => ['me', 'logout'],
    ];

    /** HR notifications (leave, requests, money, exits, tax, payroll) addressed to this user: all the staff app lists. */
    public const HR_NOTIFICATION_REFERENCES = ['LEAVE_APPLICATION', 'HR_REQUEST', 'HR_MONEY', 'PAYROLL_RUN'];

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>  $query
     * @return \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>
     */
    public static function onlyHrNotifications($query, User $user)
    {
        // Store-wide HR notices (for HR staff) and stock or sales alerts stay in the ERP.
        return $query->where('app_notifications.user_id', $user->id)
            ->where(fn ($q) => $q->whereIn('app_notifications.reference_type', self::HR_NOTIFICATION_REFERENCES)->orWhere('app_notifications.type', 'PAYSLIP'));
    }

    /** The last 10 digits: "+91 98765 43210" and "09876543210" are the same number. */
    public static function phoneKey(?string $phone): string
    {
        return substr(preg_replace('/\D/', '', (string) $phone), -10);
    }

    /** @return Collection<int, Employee> */
    public function employeesForPhone(string $phoneKey): Collection
    {
        return Employee::withoutGlobalScopes()->where('is_active', true)->where('app_access', true)->whereNotNull('app_pin')
            ->where('phone', 'like', '%'.substr($phoneKey, -4))->get()
            ->filter(fn (Employee $employee) => self::phoneKey($employee->phone) === $phoneKey)->values();
    }

    public function storeAllowsApp(Store $store): bool
    {
        if (! $store->is_active) {
            return false;
        }
        $licence = app(StoreLicenceVerifier::class)->verify($store);

        return $licence['ok'] && ($licence['claims']['entitlements']['channels']['mobile'] ?? false) === true;
    }

    public static function assertStrongPin(string $pin, string $field = 'pin'): void
    {
        $digits = array_map('intval', str_split($pin));
        $same = count(array_unique($digits)) === 1;
        $run = true;
        foreach ([1, -1] as $step) {
            $run = true;
            for ($i = 1; $i < count($digits); $i++) {
                if ($digits[$i] !== ($digits[$i - 1] + $step + 10) % 10) {
                    $run = false;
                    break;
                }
            }
            if ($run) {
                break;
            }
        }
        if ($same || $run) {
            throw ValidationException::withMessages([$field => 'Choose a PIN that is not one repeated digit or a simple run like 1234.']);
        }
    }

    /** HR sets (or resets) an employee's PIN; the employee must change it at the next sign-in. */
    public function setPin(Employee $employee, string $pin): void
    {
        self::assertStrongPin($pin);
        Employee::withoutGlobalScopes()->whereKey($employee->id)->update(['app_access' => true, 'app_pin' => Hash::make($pin), 'app_pin_must_change' => true, 'app_pin_set_at' => now()]);
        $this->signOut($employee);
    }

    public function disable(Employee $employee): void
    {
        Employee::withoutGlobalScopes()->whereKey($employee->id)->update(['app_access' => false]);
        $this->signOut($employee);
    }

    public function signOut(Employee $employee): void
    {
        if ($employee->user_id) {
            User::find($employee->user_id)?->tokens()->where('name', self::TOKEN_NAME)->delete();
        }
    }

    public static function isStaffToken(Request $request): bool
    {
        return in_array('client:staff', $request->user()?->currentAccessToken()?->abilities ?? [], true);
    }

    /** Why a staff-app token may not make this request, or null when it may. */
    public function refusal(Request $request): ?array
    {
        $controller = class_basename($request->route()?->getControllerClass() ?? '');
        $action = $request->route()?->getActionMethod() ?? '';
        $allowed = app(BusinessPermissions::class)->isHrSelfService($request)
            || (array_key_exists($controller, self::ALWAYS) && (self::ALWAYS[$controller] === null || in_array($action, self::ALWAYS[$controller], true)))
            || in_array($action, self::APPROVALS[$controller] ?? [], true);
        if (! $allowed) {
            return ['code' => 'STAFF_APP_SCOPE', 'message' => 'The staff app only covers your own HR and approvals. Use the ERP for this.'];
        }
        $employee = Employee::withoutGlobalScopes()->where('user_id', $request->user()->id)->where('app_access', true)->where('is_active', true)
            ->when($request->attributes->get('store_context_id'), fn ($q, $store) => $q->where('store_id', $store))->first();
        if (! $employee) {
            return ['code' => 'STAFF_APP_DISABLED', 'message' => 'The staff app is switched off for you. Ask HR.'];
        }
        $store = Store::find($employee->store_id);

        return $store && $this->storeAllowsApp($store) ? null
            : ['code' => 'MOBILE_SUBSCRIPTION_REQUIRED', 'message' => 'The staff app is not included in this store\'s subscription.'];
    }
}
