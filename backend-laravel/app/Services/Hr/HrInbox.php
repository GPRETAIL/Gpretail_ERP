<?php

namespace App\Services\Hr;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrExpenseClaim;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveType;
use App\Models\HrLoan;
use App\Models\HrRequest;
use App\Models\HrSeparation;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Everything waiting for one approver, across leave, attendance and shift requests, overtime, advances
 * and loans, expense claims and resignations, within the people they may see (HrScope) and never their
 * own. Used by the staff app's Approvals tab and the Dashboard's HR tab.
 */
class HrInbox
{
    public function __construct(private readonly HrScope $scope) {}

    /** @return Collection<int, array{type: string, id: int, employee_id: int, employee_name: ?string, title: string, detail: ?string, amount: ?float, date: string}> */
    public function items(User $user, ?Employee $own): Collection
    {
        $scoped = fn ($query) => $this->scope->apply($query, $user)->when($own, fn ($q) => $q->where('employee_id', '!=', $own->id));
        $names = fn (Collection $rows) => Employee::whereIn('id', $rows->pluck('employee_id')->unique())->pluck('name', 'id');

        $leave = $scoped(HrLeaveApplication::query())->where('status', 'PENDING')->limit(200)->get();
        $types = HrLeaveType::whereIn('id', $leave->pluck('leave_type_id'))->pluck('name', 'id');
        $requests = $scoped(HrRequest::query())->where('status', 'PENDING')->limit(200)->get();
        $overtime = $scoped(Attendance::query())->where('ot_minutes', '>', 0)->where('ot_status', 'PENDING')->limit(200)->get();
        $loans = $scoped(HrLoan::query())->where('status', 'REQUESTED')->limit(200)->get();
        $claims = $scoped(HrExpenseClaim::query())->where('status', 'PENDING')->limit(200)->get();
        $exits = $scoped(HrSeparation::query())->where('status', 'REQUESTED')->limit(200)->get();
        $who = $names(collect([$leave, $requests, $overtime, $loans, $claims, $exits])->flatten(1));
        $date = fn ($value) => substr((string) $value, 0, 10);

        return collect()
            ->concat($leave->map(fn ($a) => ['type' => 'leave', 'id' => $a->id, 'employee_id' => $a->employee_id, 'employee_name' => $who[$a->employee_id] ?? null,
                'title' => ($types[$a->leave_type_id] ?? 'Leave').' · '.(float) $a->days.' day'.((float) $a->days === 1.0 ? '' : 's'),
                'detail' => $date($a->from_date).($date($a->to_date) !== $date($a->from_date) ? ' to '.$date($a->to_date) : '').($a->reason ? ' · '.$a->reason : ''),
                'amount' => null, 'date' => $date($a->created_at)]))
            ->concat($requests->map(fn ($r) => ['type' => strtolower($r->type) === 'shift' ? 'shift' : 'attendance', 'id' => $r->id, 'employee_id' => $r->employee_id,
                'employee_name' => $who[$r->employee_id] ?? null, 'title' => $r->type === 'SHIFT' ? 'Shift change' : 'Attendance regularization',
                'detail' => $date($r->from_date).($r->to_date && $date($r->to_date) !== $date($r->from_date) ? ' to '.$date($r->to_date) : '').($r->reason ? ' · '.$r->reason : ''),
                'amount' => null, 'date' => $date($r->created_at)]))
            ->concat($overtime->map(fn ($a) => ['type' => 'overtime', 'id' => $a->id, 'employee_id' => $a->employee_id, 'employee_name' => $who[$a->employee_id] ?? null,
                'title' => 'Overtime · '.intdiv((int) $a->ot_minutes, 60).'h '.((int) $a->ot_minutes % 60).'m', 'detail' => $date($a->date),
                'amount' => null, 'date' => $date($a->date)]))
            ->concat($loans->map(fn ($l) => ['type' => 'loan', 'id' => $l->id, 'employee_id' => $l->employee_id, 'employee_name' => $who[$l->employee_id] ?? null,
                'title' => $l->type === 'LOAN' ? 'Loan · '.$l->instalments.' instalments' : 'Salary advance', 'detail' => $l->reason,
                'amount' => (float) $l->amount, 'date' => $date($l->created_at)]))
            ->concat($claims->map(fn ($c) => ['type' => 'claim', 'id' => $c->id, 'employee_id' => $c->employee_id, 'employee_name' => $who[$c->employee_id] ?? null,
                'title' => 'Expense · '.$c->category, 'detail' => trim($date($c->claim_date).($c->description ? ' · '.$c->description : '')),
                'amount' => (float) $c->amount, 'date' => $date($c->created_at), 'has_bill' => (bool) $c->bill_path]))
            ->concat($exits->map(fn ($s) => ['type' => 'resignation', 'id' => $s->id, 'employee_id' => $s->employee_id, 'employee_name' => $who[$s->employee_id] ?? null,
                'title' => 'Resignation', 'detail' => 'Last day asked: '.$date($s->requested_last_day ?? $s->last_working_day).($s->reason ? ' · '.$s->reason : ''),
                'amount' => null, 'date' => $date($s->applied_on ?? $s->created_at), 'last_day' => $date($s->requested_last_day ?? $s->last_working_day ?? $s->applied_on)]));
    }
}
