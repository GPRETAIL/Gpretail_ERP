<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrDepartment;
use App\Models\HrRequest;
use App\Services\Hr\HrRequestService;
use App\Services\Hr\HrScope;
use App\Services\Tenancy\BusinessPermissions;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** HRMS > My Requests and Request Approvals: attendance fixes and shift changes. */
class HrRequestController extends Controller
{
    public function __construct(private readonly HrRequestService $requests, private readonly HrScope $scope, private readonly BusinessPermissions $permissions) {}

    public function mine(Request $request)
    {
        $employee = $this->scope->employeeFor($request->user());

        return response()->json(['success' => true, 'data' => [
            'employee' => $employee ? ['id' => $employee->id, 'name' => $employee->name] : null,
            'shifts' => HrDepartment::where('configuration_type', 'working_hour')->orderBy('name')->get(['id', 'name']),
            'requests' => $employee ? $this->present(HrRequest::where('employee_id', $employee->id)->latest('from_date')->limit(200)->get()) : [],
        ]]);
    }

    public function index(Request $request)
    {
        $query = $this->scope->apply(HrRequest::query(), $request->user())
            ->when($request->query('status'), fn ($q, $status) => $q->whereIn('status', explode(',', strtoupper($status))))
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', strtoupper($type)));
        if ($own = $this->scope->employeeFor($request->user())) {
            $query->where('employee_id', '!=', $own->id); // Approvals are for other people's requests.
        }

        return response()->json(['success' => true, 'data' => $this->present($query->orderByRaw("CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END")->latest('from_date')->limit(1000)->get())]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:ATTENDANCE,SHIFT', 'employee_id' => 'nullable|integer',
            'from_date' => 'required|date_format:Y-m-d', 'to_date' => 'nullable|date_format:Y-m-d',
            'check_in' => 'nullable|date_format:H:i', 'check_out' => 'nullable|date_format:H:i', 'status' => 'nullable|in:PRESENT,HALF_DAY,ON_DUTY',
            'working_hour_id' => 'nullable|integer', 'is_off' => 'boolean', 'reason' => 'nullable|string|max:500',
        ]);
        $own = $this->scope->employeeFor($request->user());
        if (! empty($data['employee_id']) && (int) $data['employee_id'] !== $own?->id) {
            if (! $this->permissions->allows($request->user(), 'hr.manage') || ! $this->scope->canSee($request->user(), (int) $data['employee_id'])) {
                throw ValidationException::withMessages(['employee_id' => "You can't raise a request for this employee."]);
            }
            $employee = Employee::findOrFail($data['employee_id']);
        } elseif (! $own) {
            throw ValidationException::withMessages(['employee_id' => 'Your login is not linked to an employee. Ask HR to link it in the employee form (Allow System / UserName).']);
        } else {
            $employee = $own;
        }

        return response()->json(['success' => true, 'message' => 'Request sent for approval', 'data' => $this->requests->apply($employee, $data, $request->user())], 201);
    }

    public function approve(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'Request approved', 'data' => $this->requests->approve($this->decidable($request, $id), $request->user(), $request->input('note'))]);
    }

    public function reject(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'Request rejected', 'data' => $this->requests->reject($this->decidable($request, $id), $request->user(), $request->input('note'))]);
    }

    /** Withdraw your own pending request. */
    public function cancel(Request $request, $id)
    {
        $own = $this->scope->employeeFor($request->user());
        $hrRequest = HrRequest::where('employee_id', $own?->id ?? 0)->findOrFail($id);
        if ($hrRequest->status !== 'PENDING') {
            throw ValidationException::withMessages(['status' => 'Only a pending request can be withdrawn.']);
        }
        $hrRequest->update(['status' => 'CANCELLED', 'decided_by' => $request->user()->id, 'decided_at' => now()]);

        return response()->json(['success' => true, 'message' => 'Request withdrawn', 'data' => $hrRequest]);
    }

    private function decidable(Request $request, $id): HrRequest
    {
        $hrRequest = HrRequest::findOrFail($id);
        if (! $this->scope->canSee($request->user(), $hrRequest->employee_id)) {
            throw ValidationException::withMessages(['status' => "Only the employee's manager or HR can decide this request."]);
        }

        return $hrRequest;
    }

    private function present($requests)
    {
        $employees = Employee::whereIn('id', $requests->pluck('employee_id'))->get(['id', 'name', 'code'])->keyBy('id');
        $shifts = HrDepartment::where('configuration_type', 'working_hour')->pluck('name', 'id');

        return $requests->map(fn (HrRequest $r) => $r->toArray() + [
            'employee_name' => $employees[$r->employee_id]->name ?? null, 'employee_code' => $employees[$r->employee_id]->code ?? null,
            'shift_name' => isset($r->payload['working_hour_id']) ? ($shifts[$r->payload['working_hour_id']] ?? null) : null,
        ])->values();
    }
}
