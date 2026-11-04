<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Services\Hr\HrScope;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/** HRMS > OT Approvals: days with overtime, approved (in full or fewer minutes) or rejected before payroll pays them. */
class OvertimeController extends Controller
{
    public function __construct(private readonly HrScope $scope) {}

    public function index(Request $request)
    {
        $month = preg_match('/^\d{4}-\d{2}$/', (string) $request->query('month')) ? $request->query('month') : now(config('app.business_timezone'))->format('Y-m');
        $first = Carbon::parse("{$month}-01");
        $rows = $this->scope->apply(Attendance::with('employee:id,name,code'), $request->user())->where('ot_minutes', '>', 0)
            ->whereBetween('date', [$first->toDateString(), $first->copy()->endOfMonth()->toDateString()])
            ->when($request->query('status'), fn ($q, $status) => $q->whereIn('ot_status', explode(',', strtoupper($status))))
            ->orderBy('date')->limit(5000)->get()
            ->map(fn (Attendance $a) => [
                'id' => $a->id, 'date' => $a->date->toDateString(), 'employee_id' => $a->employee_id, 'name' => $a->employee?->name, 'code' => $a->employee?->code,
                'check_in' => $a->check_in, 'check_out' => $a->check_out, 'worked_minutes' => $a->worked_minutes,
                'ot_minutes' => $a->ot_minutes, 'ot_approved_minutes' => $a->ot_approved_minutes, 'ot_status' => $a->ot_status,
            ]);

        return response()->json(['success' => true, 'data' => $rows]);
    }

    /** Approve or reject one or many days; `minutes` approves fewer minutes than worked (one day at a time). */
    public function decide(Request $request)
    {
        $data = $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'integer', 'action' => 'required|in:approve,reject', 'minutes' => 'nullable|integer|min:0']);
        $rows = $this->scope->apply(Attendance::whereIn('id', $data['ids'])->where('ot_minutes', '>', 0), $request->user())->get();
        $own = $this->scope->employeeFor($request->user())?->id;
        if ($own && $rows->contains('employee_id', $own)) {
            throw ValidationException::withMessages(['ids' => "You can't approve your own overtime."]);
        }
        if (isset($data['minutes']) && $rows->count() !== 1) {
            throw ValidationException::withMessages(['minutes' => 'Change the minutes one day at a time.']);
        }
        foreach ($rows as $row) {
            $approve = $data['action'] === 'approve';
            $row->update([
                'ot_status' => $approve ? 'APPROVED' : 'REJECTED',
                'ot_approved_minutes' => $approve ? min((int) $row->ot_minutes, (int) ($data['minutes'] ?? $row->ot_minutes)) : 0,
                'ot_decided_by' => $request->user()->id,
            ]);
        }

        return response()->json(['success' => true, 'message' => "{$rows->count()} day(s) ".($data['action'] === 'approve' ? 'approved' : 'rejected')]);
    }
}
