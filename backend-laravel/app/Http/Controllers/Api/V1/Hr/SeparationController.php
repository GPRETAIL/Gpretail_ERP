<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrSeparation;
use App\Models\HrSettlement;
use App\Models\Store;
use App\Services\Hr\HrScope;
use App\Services\Hr\SeparationService;
use App\Services\Tenancy\BusinessPermissions;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Exits: staff resign (My Resignation); their manager or HR accepts and sets the last working day; HR records
 * terminations and retirements, the exit interview, and relieves people (also done nightly).
 */
class SeparationController extends Controller
{
    public function __construct(private readonly SeparationService $separations, private readonly HrScope $scope, private readonly BusinessPermissions $permissions) {}

    public function mine(Request $request)
    {
        $employee = $this->scope->employeeFor($request->user());

        return response()->json(['success' => true, 'data' => [
            'employee' => $employee ? ['id' => $employee->id, 'name' => $employee->name] : null,
            'notice_days' => $employee ? $this->separations->noticeDays($employee) : null,
            'separations' => $employee ? HrSeparation::where('employee_id', $employee->id)->latest('id')->limit(20)->get()->map(fn ($s) => $this->present($s)) : [],
        ]]);
    }

    public function resign(Request $request)
    {
        $data = $request->validate(['reason' => 'nullable|string|max:500', 'requested_last_day' => 'nullable|date_format:Y-m-d']);
        $employee = $this->scope->employeeFor($request->user());
        if (! $employee) {
            throw ValidationException::withMessages(['employee_id' => 'Your login is not linked to an employee. Ask HR to link it in the employee form (Allow System / UserName).']);
        }

        return response()->json(['success' => true, 'message' => 'Resignation sent to your manager',
            'data' => $this->present($this->separations->resign($employee, $data, $request->user()))], 201);
    }

    /** Take back your own resignation before it is accepted, or (HR) cancel an exit before the person is relieved. */
    public function withdraw(Request $request, $id)
    {
        $separation = HrSeparation::findOrFail($id);
        $own = $this->scope->employeeFor($request->user());
        $hr = $this->permissions->allows($request->user(), 'hr.manage') && $this->scope->canSee($request->user(), $separation->employee_id);
        if (! $hr && ($own?->id !== $separation->employee_id || $separation->status !== 'REQUESTED')) {
            throw ValidationException::withMessages(['status' => $own?->id === $separation->employee_id ? 'An accepted resignation can only be withdrawn by HR.' : "You can't withdraw this."]);
        }

        return response()->json(['success' => true, 'message' => 'Withdrawn', 'data' => $this->present($this->separations->withdraw($separation))]);
    }

    public function index(Request $request)
    {
        $rows = $this->scope->apply(HrSeparation::with('employee:id,name,code,designation_id,joining_date', 'employee.designation:id,name'), $request->user())
            ->when($request->query('status'), fn ($q, $status) => $q->whereIn('status', explode(',', strtoupper($status))))
            ->orderByRaw("CASE status WHEN 'REQUESTED' THEN 0 WHEN 'ACCEPTED' THEN 1 WHEN 'RELIEVED' THEN 2 ELSE 3 END")->latest('id')->limit(1000)->get();
        if ($request->boolean('inbox') && ($own = $this->scope->employeeFor($request->user()))) {
            $rows = $rows->where('employee_id', '!=', $own->id)->values();
        }
        $settlements = HrSettlement::whereIn('separation_id', $rows->pluck('id'))->get(['id', 'separation_id', 'status', 'net'])->keyBy('separation_id');

        return response()->json(['success' => true, 'data' => $rows->map(fn ($s) => $this->present($s) + ['settlement' => $settlements->get($s->id)]),
            'meta' => ['reasons' => SeparationService::REASONS, 'types' => SeparationService::TYPES, 'today' => SeparationService::today(),
                'store' => ($store = Store::find($request->attributes->get('store_context_id'))) ? ['name' => $store->name, 'address' => trim(implode(', ', array_filter([$store->address, $store->city]))), 'phone' => $store->phone] : null]]);
    }

    public function record(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|integer', 'type' => ['required', Rule::in(SeparationService::TYPES)], 'applied_on' => 'nullable|date_format:Y-m-d',
            'last_working_day' => 'required|date_format:Y-m-d', 'reason' => 'nullable|string|max:500', 'notice_days' => 'nullable|integer|min:0|max:365',
            'notice_waived' => 'boolean', 'note' => 'nullable|string|max:255',
        ]);
        $employee = $this->scope->apply(Employee::whereKey($data['employee_id'])->where('is_active', true), $request->user(), 'id')->firstOrFail();

        return response()->json(['success' => true, 'message' => 'Exit recorded', 'data' => $this->present($this->separations->record($employee, $data, $request->user()))], 201);
    }

    public function accept(Request $request, $id)
    {
        $data = $request->validate(['last_working_day' => 'required|date_format:Y-m-d', 'notice_days' => 'nullable|integer|min:0|max:365',
            'notice_waived' => 'boolean', 'note' => 'nullable|string|max:255']);

        return response()->json(['success' => true, 'message' => 'Resignation accepted', 'data' => $this->present($this->separations->accept($this->scoped($request, $id),
            $request->user(), $data['last_working_day'], isset($data['notice_days']) ? (int) $data['notice_days'] : null, (bool) ($data['notice_waived'] ?? false), $data['note'] ?? null))]);
    }

    public function reject(Request $request, $id)
    {
        $data = $request->validate(['note' => 'nullable|string|max:255']);

        return response()->json(['success' => true, 'message' => 'Resignation not accepted',
            'data' => $this->present($this->separations->reject($this->scoped($request, $id), $request->user(), $data['note'] ?? null))]);
    }

    public function amend(Request $request, $id)
    {
        $data = $request->validate(['last_working_day' => 'required|date_format:Y-m-d', 'notice_days' => 'required|integer|min:0|max:365', 'notice_waived' => 'boolean']);

        return response()->json(['success' => true, 'message' => 'Exit updated', 'data' => $this->present($this->separations->amend($this->scoped($request, $id),
            $data['last_working_day'], (int) $data['notice_days'], (bool) ($data['notice_waived'] ?? false)))]);
    }

    public function interview(Request $request, $id)
    {
        $data = $request->validate([
            'reason_category' => ['required', Rule::in(SeparationService::REASONS)], 'ratings' => 'array',
            'ratings.manager' => 'nullable|integer|between:1,5', 'ratings.pay' => 'nullable|integer|between:1,5',
            'ratings.work' => 'nullable|integer|between:1,5', 'ratings.growth' => 'nullable|integer|between:1,5',
            'would_rejoin' => 'nullable|boolean', 'comments' => 'nullable|string|max:2000',
        ]);

        return response()->json(['success' => true, 'message' => 'Exit interview saved', 'data' => $this->present($this->separations->interview($this->scoped($request, $id), $data, $request->user()))]);
    }

    public function relieve(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'Relieved: marked inactive and login switched off', 'data' => $this->present($this->separations->relieve($this->scoped($request, $id)))]);
    }

    /** Exits in a period by type and reason, with the exit interview averages. */
    public function report(Request $request)
    {
        $from = $request->query('from') ?: Carbon::parse(SeparationService::today())->subYear()->addDay()->toDateString();
        $to = $request->query('to') ?: SeparationService::today();
        $rows = $this->scope->apply(HrSeparation::query(), $request->user())->whereIn('status', ['ACCEPTED', 'RELIEVED', 'SETTLED'])
            ->whereBetween('last_working_day', [$from, $to])->get();
        $ratings = fn (string $key) => ($values = $rows->pluck("exit_interview.ratings.{$key}")->filter())->isNotEmpty() ? round($values->avg(), 1) : null;

        return response()->json(['success' => true, 'data' => [
            'from' => $from, 'to' => $to, 'total' => $rows->count(),
            'by_type' => $rows->countBy('type'),
            'by_reason' => $rows->countBy(fn ($s) => $s->exit_interview['reason_category'] ?? 'NOT_RECORDED'),
            'by_month' => $rows->countBy(fn ($s) => $s->last_working_day->format('Y-m'))->sortKeys(),
            'ratings' => ['manager' => $ratings('manager'), 'pay' => $ratings('pay'), 'work' => $ratings('work'), 'growth' => $ratings('growth')],
            'would_rejoin' => $rows->filter(fn ($s) => ($s->exit_interview['would_rejoin'] ?? null) === true)->count(),
            'interviewed' => $rows->filter(fn ($s) => $s->exit_interview)->count(),
        ]]);
    }

    private function scoped(Request $request, $id): HrSeparation
    {
        $separation = HrSeparation::findOrFail($id);
        if (! $this->scope->canSee($request->user(), $separation->employee_id)) {
            throw ValidationException::withMessages(['status' => "Only the employee's manager or HR can do this."]);
        }

        return $separation;
    }

    private function present(HrSeparation $separation): array
    {
        return $separation->toArray() + ['employee_name' => $separation->employee?->name, 'employee_code' => $separation->employee?->code];
    }
}
