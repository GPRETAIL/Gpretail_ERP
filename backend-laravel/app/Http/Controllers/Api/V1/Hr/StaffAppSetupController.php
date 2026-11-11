<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\HrScope;
use App\Services\Hr\StaffAppAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** HRMS > Staff App: who may use the employee app (/hr), their first PIN, and signing them out. */
class StaffAppSetupController extends Controller
{
    public function __construct(private readonly HrScope $scope, private readonly StaffAppAccess $access) {}

    public function index(Request $request): JsonResponse
    {
        $employees = $this->scope->apply(Employee::with('designation:id,name'), $request->user(), 'id')->where('is_active', true)
            ->when($request->query('employee_id'), fn ($q, $id) => $q->whereKey((int) $id))->orderBy('name')
            ->get(['id', 'store_id', 'name', 'code', 'phone', 'designation_id', 'user_id', 'app_access', 'app_pin', 'app_pin_must_change', 'app_pin_set_at', 'app_last_login_at']);
        $users = User::whereIn('id', $employees->pluck('user_id')->filter())->get(['id', 'username', 'email'])->keyBy('id');
        $stores = Store::whereIn('id', $employees->pluck('store_id')->unique())->get()->keyBy('id');
        $licensed = $stores->map(fn (Store $store) => $this->access->storeAllowsApp($store));

        return response()->json(['success' => true, 'data' => $employees->map(function (Employee $e) use ($users, $licensed) {
            $user = $users[$e->user_id] ?? null;

            return [
                'id' => $e->id, 'name' => $e->name, 'code' => $e->code, 'designation' => $e->designation?->name, 'phone' => $e->phone,
                'phone_ok' => strlen(StaffAppAccess::phoneKey($e->phone)) === 10,
                'app_access' => (bool) $e->app_access, 'pin_set' => $e->app_pin !== null, 'must_change_pin' => (bool) $e->app_pin_must_change,
                'pin_set_at' => $e->app_pin_set_at, 'last_login_at' => $e->app_last_login_at,
                'erp_login' => $user && ! str_ends_with((string) $user->email, StaffAppAccess::HIDDEN_EMAIL_DOMAIN) ? $user->username : null,
                'store_licensed' => (bool) ($licensed[$e->store_id] ?? false),
            ];
        })->values(), 'meta' => ['store_licensed' => $licensed->contains(true)]]);
    }

    /** Switch the app on with a first PIN, or reset a forgotten one. The employee must change it at the next sign-in. */
    public function setPin(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['pin' => 'required|digits:6'], ['pin.digits' => 'The starting PIN must be 6 digits.']);
        $employee = $this->find($request, $id);
        $phone = StaffAppAccess::phoneKey($employee->phone);
        if (strlen($phone) !== 10) {
            throw ValidationException::withMessages(['pin' => 'Add a 10-digit mobile number (Contact No) to this employee first.']);
        }
        $clash = $this->access->employeesForPhone($phone)->first(fn (Employee $other) => $other->id !== $employee->id && $other->store_id === $employee->store_id);
        if ($clash) {
            throw ValidationException::withMessages(['pin' => "{$clash->name} already uses this mobile number for the HRMS app in this store."]);
        }
        $this->access->setPin($employee, $data['pin']);

        return response()->json(['success' => true, 'message' => "HRMS app on for {$employee->name}. Share the PIN with them; they choose their own at the first sign-in."]);
    }

    public function disable(Request $request, int $id): JsonResponse
    {
        $employee = $this->find($request, $id);
        $this->access->disable($employee);

        return response()->json(['success' => true, 'message' => "HRMS app off for {$employee->name}."]);
    }

    public function signOut(Request $request, int $id): JsonResponse
    {
        $employee = $this->find($request, $id);
        $this->access->signOut($employee);

        return response()->json(['success' => true, 'message' => "{$employee->name} is signed out of the HRMS app."]);
    }

    private function find(Request $request, int $id): Employee
    {
        return $this->scope->apply(Employee::whereKey($id), $request->user(), 'id')->firstOrFail();
    }
}
