<?php

namespace App\Services\Dashboards;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrDepartment;
use App\Models\HrHoliday;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveType;
use App\Models\HrPayrollRun;
use App\Models\HrSeparation;
use App\Models\HrTaxDeclarationItem;
use App\Models\User;
use App\Services\Hr\AttendanceService;
use App\Services\Hr\HrInbox;
use App\Services\Hr\HrScope;
use App\Services\Hr\StaffAppAccess;
use App\Services\Tenancy\BusinessPermissions;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * HR tab of the main Dashboard (and HRMS > Dashboard): workforce, today's attendance, approvals, leave,
 * payroll, exits and people events. Store-scoped by the request's store context like every model read, and
 * people-scoped by HrScope: HR roles see the store, a manager their team, anyone else themselves. Pay
 * figures are left out for users without payroll access.
 */
class HrDashboardService
{
    private const TREND_DAYS = 31;

    public function __construct(
        private readonly HrScope $scope,
        private readonly AttendanceService $attendance,
        private readonly HrInbox $inbox,
        private readonly BusinessPermissions $permissions,
    ) {}

    public function getDashboardData(array $filters, User $user): array
    {
        $today = CarbonImmutable::parse($this->attendance->today());
        $from = $this->date($filters['date_from'] ?? null) ?? $today->startOfMonth();
        $to = $this->date($filters['date_to'] ?? null) ?? $today;
        if ($to->lessThan($from)) {
            [$from, $to] = [$to, $from];
        }
        $ids = $this->scope->employeeIds($user);
        $people = fn () => Employee::query()->when($ids !== null, fn ($q) => $q->whereIn('id', $ids));
        $active = $people()->where('is_active', true)->with(['designation:id,name', 'department:id,name'])->orderBy('name')->get();
        $own = $this->scope->employeeFor($user);
        $seesPay = $this->permissions->allows($user, 'payroll.view');
        $isHr = $this->permissions->allows($user, 'hr.manage');

        $todayCounts = $this->todayCounts($active, $today->toDateString());
        $approvals = $this->permissions->allows($user, 'approvals.decide') ? $this->inbox->items($user, $own)->countBy('type')->all() : [];
        if ($this->permissions->allows($user, 'payroll.manage')) {
            $approvals['tax_proof'] = HrTaxDeclarationItem::where('proof_status', 'SUBMITTED')->count();
        }
        $approvals = array_filter($approvals);
        $joiners = $people()->whereBetween('joining_date', [$from->toDateString(), $to->toDateString()])->with('designation:id,name')->orderBy('joining_date')->get();
        $exits = HrSeparation::with('employee:id,name,designation_id', 'employee.designation:id,name')->whereIn('status', ['ACCEPTED', 'RELIEVED', 'SETTLED'])
            // Left in the range, plus accepted resignations leaving in the next 30 days (shown as upcoming).
            ->whereBetween('last_working_day', [$from->toDateString(), $to->addDays(30)->toDateString()])
            ->when($ids !== null, fn ($q) => $q->whereIn('employee_id', $ids))->orderBy('last_working_day')->get();
        $payroll = $seesPay ? $this->payroll($today) : null;
        $working = $todayCounts['total'] - $todayCounts['week_off'] - $todayCounts['holiday'];

        return [
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString(), 'today' => $today->toDateString()],
            'scope' => $ids === null ? 'store' : (count($ids) > 1 ? 'team' : 'self'),
            'summary' => [
                'headcount' => $active->count(),
                'joiners' => $joiners->count(),
                'exits' => $exits->filter(fn ($s) => $s->last_working_day->lessThanOrEqualTo($to))->count(),
                'upcoming_exits' => $exits->filter(fn ($s) => $s->last_working_day->greaterThan($to))->count(),
                'present_today' => $todayCounts['present'] + $todayCounts['half_day'],
                'attendance_pct' => $working > 0 ? round(($todayCounts['present'] + $todayCounts['half_day']) / $working * 100, 1) : null,
                'on_leave_today' => $todayCounts['leave'],
                'approvals_waiting' => array_sum($approvals),
                'payroll' => $payroll ? $payroll['latest'] : null,
            ],
            'today' => $todayCounts,
            'attendance_trend' => $this->attendanceTrend($active->pluck('id'), $from, $to->min($today)),
            'by_department' => $active->groupBy(fn ($e) => $e->department?->name ?: 'No department')
                ->map(fn ($group, $name) => ['department' => $name, 'count' => $group->count()])->sortByDesc('count')->values(),
            'approvals' => $approvals,
            'leave' => $this->leave($active->pluck('id'), $today, $from, $to),
            'payroll' => $payroll ? ['runs' => $payroll['runs'], 'last_month_pending' => $payroll['last_month_pending']] : null,
            'people' => [
                'joiners' => $joiners->map(fn ($e) => ['id' => $e->id, 'name' => $e->name, 'designation' => $e->designation?->name, 'date' => $e->joining_date?->toDateString()])->values(),
                'exits' => $exits->map(fn ($s) => ['id' => $s->employee_id, 'name' => $s->employee?->name, 'designation' => $s->employee?->designation?->name,
                    'date' => $s->last_working_day?->toDateString(), 'status' => $s->status, 'upcoming' => $s->last_working_day->greaterThan($to)])->values(),
                'celebrations' => $this->celebrations($active, $today),
                'holidays' => HrHoliday::whereDate('date', '>=', $today->toDateString())->orderBy('date')->limit(5)->get(['date', 'name'])
                    ->map(fn ($h) => ['date' => substr((string) $h->date, 0, 10), 'name' => $h->name])->values(),
            ],
            'action_required' => $this->actionRequired($approvals, $payroll, $isHr ? $active : collect()),
        ];
    }

    private function date(?string $value): ?CarbonImmutable
    {
        return $value && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? CarbonImmutable::parse($value) : null;
    }

    /** Today's status of everyone in view, by the same rule as Employee In/Out (AttendanceService::dayStatus). */
    private function todayCounts(Collection $active, string $today): array
    {
        $rows = Attendance::whereDate('date', $today)->whereIn('employee_id', $active->pluck('id'))->get()->keyBy('employee_id');
        $counts = ['total' => $active->count(), 'present' => 0, 'half_day' => 0, 'late' => 0, 'absent' => 0, 'not_marked' => 0, 'leave' => 0, 'week_off' => 0, 'holiday' => 0, 'on_duty' => 0];
        foreach ($active as $employee) {
            $row = $rows->get($employee->id);
            $key = match ($this->attendance->dayStatus($employee, $row, $today)) {
                'PRESENT' => 'present', 'HALF_DAY' => 'half_day', 'ABSENT' => 'absent', 'LEAVE' => 'leave', 'WEEK_OFF' => 'week_off',
                'HOLIDAY' => 'holiday', 'ON_DUTY' => 'on_duty', default => 'not_marked',
            };
            $counts[$key]++;
            if (($row?->late_minutes ?? 0) > 0) {
                $counts['late']++;
            }
        }

        return $counts;
    }

    /** Present % per day (on duty and half days count as present) over at most the last 31 days of the range; weekly beyond that. */
    private function attendanceTrend(Collection $ids, CarbonImmutable $from, CarbonImmutable $to): array
    {
        if ($ids->isEmpty() || $to->lessThan($from)) {
            return [];
        }
        $weekly = $from->diffInDays($to) >= self::TREND_DAYS;
        $rows = Attendance::whereIn('employee_id', $ids)->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->get(['date', 'status'])->groupBy(fn ($row) => $weekly ? $row->date->startOfWeek()->toDateString() : $row->date->toDateString());
        $points = [];
        for ($day = $weekly ? $from->startOfWeek() : $from; $day->lessThanOrEqualTo($to); $day = $weekly ? $day->addWeek() : $day->addDay()) {
            $group = $rows->get($day->toDateString(), collect());
            $working = $group->whereNotIn('status', ['WEEK_OFF', 'HOLIDAY'])->count();
            $present = $group->whereIn('status', ['PRESENT', 'ON_DUTY'])->count() + 0.5 * $group->where('status', 'HALF_DAY')->count();
            $points[] = ['date' => $day->toDateString(), 'label' => $weekly ? 'Wk '.$day->format('d M') : $day->format('d M'),
                'present_pct' => $working > 0 ? round($present / $working * 100, 1) : null, 'absent' => $group->where('status', 'ABSENT')->count(),
                'leave' => $group->where('status', 'LEAVE')->count()];
        }

        return $points;
    }

    private function leave(Collection $ids, CarbonImmutable $today, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $weekStart = $today->startOfWeek();
        $weekEnd = $today->endOfWeek();
        $types = HrLeaveType::pluck('name', 'id');
        $thisWeek = HrLeaveApplication::with('employee:id,name')->whereIn('employee_id', $ids)->where('status', 'APPROVED')
            ->whereDate('from_date', '<=', $weekEnd->toDateString())->whereDate('to_date', '>=', $weekStart->toDateString())->orderBy('from_date')->limit(50)->get();
        $taken = HrLeaveApplication::whereIn('employee_id', $ids)->where('status', 'APPROVED')
            ->whereBetween('from_date', [$from->toDateString(), $to->toDateString()])->get(['leave_type_id', 'days'])
            ->groupBy('leave_type_id')->map(fn ($group, $type) => ['type' => $types[$type] ?? 'Leave', 'days' => round((float) $group->sum('days'), 1)])->sortByDesc('days')->values();

        return [
            'this_week' => $thisWeek->map(fn ($a) => ['name' => $a->employee?->name, 'type' => $types[$a->leave_type_id] ?? 'Leave',
                'from' => $a->from_date?->toDateString(), 'to' => $a->to_date?->toDateString(), 'days' => (float) $a->days])->values(),
            'taken_by_type' => $taken,
        ];
    }

    private function payroll(CarbonImmutable $today): array
    {
        $runs = HrPayrollRun::orderByDesc('month')->limit(6)->get(['month', 'status', 'employees', 'gross', 'net', 'employer_cost']);
        $lastMonth = $today->subMonthNoOverflow()->format('Y-m');
        $lastRun = $runs->firstWhere('month', $lastMonth);
        $latest = $runs->first();

        return [
            'latest' => $latest ? ['month' => $latest->month, 'status' => $latest->status, 'employees' => (int) $latest->employees,
                'net' => (float) $latest->net, 'employer_cost' => (float) $latest->employer_cost] : null,
            'runs' => $runs->sortBy('month')->map(fn ($r) => ['month' => $r->month, 'status' => $r->status, 'employees' => (int) $r->employees,
                'gross' => (float) $r->gross, 'net' => (float) $r->net, 'employer_cost' => (float) $r->employer_cost])->values(),
            'last_month_pending' => ! $lastRun || $lastRun->status === 'DRAFT' ? $lastMonth : null,
        ];
    }

    /** Birthdays (master_details.date_of_birth) and work anniversaries in the next 30 days, soonest first. */
    private function celebrations(Collection $active, CarbonImmutable $today): array
    {
        $events = [];
        foreach ($active as $employee) {
            $dob = $employee->master_details['date_of_birth'] ?? null;
            foreach ([['birthday', $dob], ['anniversary', $employee->joining_date?->toDateString()]] as [$kind, $date]) {
                if (! $date || ! preg_match('/^\d{4}-\d{2}-\d{2}/', (string) $date)) {
                    continue;
                }
                $original = CarbonImmutable::parse(substr((string) $date, 0, 10));
                $next = $original->setYear($today->year);
                if ($original->format('m-d') === '02-29' && ! $next->isLeapYear()) {
                    $next = $next->setDate($today->year, 2, 28);
                }
                if ($next->lessThan($today)) {
                    $next = $next->addYearNoOverflow();
                }
                $years = $next->year - $original->year;
                if ($next->diffInDays($today, true) > 30 || ($kind === 'anniversary' && $years < 1)) {
                    continue;
                }
                $events[] = ['kind' => $kind, 'name' => $employee->name, 'designation' => $employee->designation?->name,
                    'date' => $next->toDateString(), 'years' => $kind === 'anniversary' ? $years : null];
            }
        }
        usort($events, fn ($a, $b) => [$a['date'], $a['name']] <=> [$b['date'], $b['name']]);

        return array_slice($events, 0, 20);
    }

    private function actionRequired(array $approvals, ?array $payroll, Collection $staff): array
    {
        $labels = ['leave' => ['leave request', '/hrms/leave-approvals'], 'attendance' => ['attendance correction', '/hrms/request-approvals'],
            'shift' => ['shift change', '/hrms/request-approvals'], 'overtime' => ['overtime day', '/hrms/ot-approvals'],
            'claim' => ['expense claim', '/hrms/expense-claims'], 'loan' => ['advance or loan request', '/hrms/loans'],
            'resignation' => ['resignation', '/hrms/exits'], 'tax_proof' => ['tax proof to verify', '/hrms/income-tax']];
        $items = [];
        foreach ($approvals as $type => $count) {
            [$label, $link] = $labels[$type] ?? [$type, '/hrms/dashboard'];
            $items[] = ['type' => $type, 'severity' => $type === 'resignation' ? 'high' : 'medium', 'link' => $link,
                'message' => $count.' '.$label.($count === 1 ? '' : 's').' waiting'];
        }
        if ($payroll && $payroll['last_month_pending']) {
            $items[] = ['type' => 'payroll', 'severity' => 'high', 'link' => '/hrms/salary-management',
                'message' => CarbonImmutable::parse($payroll['last_month_pending'].'-01')->format('F Y').' payroll is not submitted yet'];
        }
        $noPhone = $staff->filter(fn ($e) => strlen(StaffAppAccess::phoneKey($e->phone)) !== 10)->count();
        if ($noPhone > 0) {
            $items[] = ['type' => 'staff_app', 'severity' => 'low', 'link' => '/hrms/staff-app',
                'message' => $noPhone.' employee'.($noPhone === 1 ? ' has' : 's have').' no mobile number, so cannot use the staff app'];
        }

        return $items;
    }
}
