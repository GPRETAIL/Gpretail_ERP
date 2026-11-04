<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrCheckin;
use App\Models\HrRequest;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Employee requests, decided like leave (the reporting manager, or HR): fix a day's attendance (a missed
 * check-in/out, or a status such as on duty outside the store) or change the shift on some days.
 */
class HrRequestService
{
    public function __construct(private readonly AttendanceService $attendance, private readonly RosterService $roster) {}

    public function apply(Employee $employee, array $data, ?User $by): HrRequest
    {
        $type = $data['type'];
        $from = $data['from_date'];
        $to = $type === 'ATTENDANCE' ? $from : ($data['to_date'] ?? $from);
        if ($to < $from) {
            throw ValidationException::withMessages(['to_date' => 'The end date is before the start date.']);
        }
        if ($type === 'ATTENDANCE') {
            if ($from > $this->attendance->today()) {
                throw ValidationException::withMessages(['from_date' => 'Attendance can be fixed only for today or earlier.']);
            }
            $payload = array_filter(['check_in' => $data['check_in'] ?? null, 'check_out' => $data['check_out'] ?? null, 'status' => $data['status'] ?? null]);
            if (! $payload) {
                throw ValidationException::withMessages(['check_in' => 'Give the check-in or check-out time, or the status for the day.']);
            }
            if (isset($payload['check_in'], $payload['check_out']) && $payload['check_out'] <= $payload['check_in']) {
                throw ValidationException::withMessages(['check_out' => 'The check-out time is before the check-in.']);
            }
        } else {
            if (Carbon::parse($from)->diffInDays(Carbon::parse($to)) > 31) {
                throw ValidationException::withMessages(['to_date' => 'Ask for at most a month at a time.']);
            }
            $isOff = (bool) ($data['is_off'] ?? false);
            if (! $isOff) {
                $this->roster->checkShift($employee->store_id, isset($data['working_hour_id']) ? (int) $data['working_hour_id'] : null);
            }
            $payload = ['is_off' => $isOff, 'working_hour_id' => $isOff ? null : (int) $data['working_hour_id']];
        }
        $overlap = HrRequest::withoutGlobalScopes()->where('employee_id', $employee->id)->where('type', $type)->where('status', 'PENDING')
            ->whereDate('from_date', '<=', $to)->whereDate('to_date', '>=', $from)->exists();
        if ($overlap) {
            throw ValidationException::withMessages(['from_date' => 'There is already a pending request for these dates.']);
        }

        $request = HrRequest::create([
            'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'type' => $type, 'from_date' => $from, 'to_date' => $to,
            'payload' => $payload, 'reason' => $data['reason'] ?? null, 'status' => 'PENDING', 'applied_by' => $by?->id,
            'approver_user_id' => $employee->reportsTo?->user_id,
        ]);
        $what = $type === 'ATTENDANCE' ? "to fix attendance on {$from}" : "a shift change from {$from}".($to !== $from ? " to {$to}" : '');
        $this->notify($request->approver_user_id, $employee->store_id, 'HR_REQUEST', 'Request to approve', "{$employee->name} asked {$what}.", $request);

        return $request;
    }

    public function approve(HrRequest $request, User $by, ?string $note = null): HrRequest
    {
        $this->decidable($request, $by);
        $employee = Employee::withoutGlobalScopes()->findOrFail($request->employee_id);
        DB::transaction(function () use ($request, $by, $note, $employee) {
            if ($request->type === 'ATTENDANCE') {
                $this->applyAttendance($request, $employee, $by);
            } else {
                for ($d = $request->from_date->copy(); $d->lte($request->to_date); $d->addDay()) {
                    $this->roster->set($employee, $d->toDateString(), $request->payload['working_hour_id'] ?? null, (bool) ($request->payload['is_off'] ?? false), 'REQUEST', $by->id);
                }
            }
            $request->update(['status' => 'APPROVED', 'decided_by' => $by->id, 'decided_at' => now(), 'decision_note' => $note]);
        });
        $this->notify($employee->user_id, $employee->store_id, 'HR_REQUEST_DECIDED', 'Request approved', $this->label($request).' was approved.'.($note ? " {$note}" : ''), $request, true);

        return $request->refresh();
    }

    public function reject(HrRequest $request, User $by, ?string $note = null): HrRequest
    {
        $this->decidable($request, $by);
        $request->update(['status' => 'REJECTED', 'decided_by' => $by->id, 'decided_at' => now(), 'decision_note' => $note]);
        $userId = Employee::withoutGlobalScopes()->whereKey($request->employee_id)->value('user_id');
        $this->notify($userId, $request->store_id, 'HR_REQUEST_DECIDED', 'Request rejected', $this->label($request).' was rejected.'.($note ? " {$note}" : ''), $request, true);

        return $request->refresh();
    }

    /** The requested punches are added (or the status marked) and the day is worked out again. */
    private function applyAttendance(HrRequest $request, Employee $employee, User $by): void
    {
        $date = $request->from_date->toDateString();
        $payload = $request->payload;
        foreach (['IN' => $payload['check_in'] ?? null, 'OUT' => $payload['check_out'] ?? null] as $type => $time) {
            if ($time) {
                HrCheckin::withoutGlobalScopes()->create(['store_id' => $employee->store_id, 'employee_id' => $employee->id, 'type' => $type, 'source' => 'REQUEST',
                    'punched_at' => Carbon::parse("{$date} {$time}", AttendanceService::timezone())->utc(), 'created_by' => $by->id]);
            }
        }
        if (! empty($payload['check_in']) || ! empty($payload['check_out'])) {
            $this->attendance->rebuild($employee, $date, force: true);
        }
        if (! empty($payload['status'])) {
            $status = $payload['status'] === 'ON_DUTY' ? 'PRESENT' : $payload['status'];
            $this->attendance->mark($employee, $date, $status, $payload['status'] === 'ON_DUTY' ? 'On duty (approved request)' : 'Approved request');
        }
    }

    private function decidable(HrRequest $request, User $by): void
    {
        if ($request->status !== 'PENDING') {
            throw ValidationException::withMessages(['status' => 'This request has already been decided.']);
        }
        $own = Employee::withoutGlobalScopes()->whereKey($request->employee_id)->value('user_id');
        if ($own && (int) $own === (int) $by->id) {
            throw ValidationException::withMessages(['status' => "You can't approve or reject your own request."]);
        }
    }

    private function label(HrRequest $request): string
    {
        return $request->type === 'ATTENDANCE' ? "Your attendance fix for {$request->from_date->toDateString()}" : "Your shift change from {$request->from_date->toDateString()}";
    }

    private function notify(?int $userId, ?int $storeId, string $type, string $title, string $message, HrRequest $request, bool $onlyUser = false): void
    {
        if (! $storeId || ($onlyUser && ! $userId)) {
            return;
        }
        Notification::withoutGlobalScopes()->create(['type' => $type, 'title' => $title, 'message' => $message, 'link' => $onlyUser ? '/hrms/my-requests' : '/hrms/request-approvals',
            'reference_type' => 'HR_REQUEST', 'reference_id' => $request->id, 'store_id' => $storeId, 'user_id' => $userId]);
    }
}
