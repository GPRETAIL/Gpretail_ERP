<?php

namespace Tests\Feature\Hr;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrDepartment;
use App\Models\HrShiftRoster;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\AttendanceService;
use App\Services\Hr\PayrollCalculator;
use App\Services\Hr\PayrollSetup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RosterRequestTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private HrDepartment $evening;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-04 20:00', 'Asia/Kolkata')->utc()); // A Wednesday.
        $this->store = Store::create(['name' => 'Roster store', 'code' => 'RS-'.Str::random(6)]);
        $this->evening = HrDepartment::forceCreate(['name' => 'Evening', 'code' => 'EVE', 'configuration_type' => 'working_hour', 'store_id' => $this->store->id, 'is_active' => true]);
        $this->evening->forceFill(['master_details' => ['from_time' => '14:00', 'to_time' => '22:00', 'minimum_full_day' => '08:00', 'minimum_present' => '04:00', 'grace_minutes' => 10]])->save();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function user(string $role): User
    {
        return User::factory()->create(['username' => "{$role}-".Str::random(8), 'role' => $role, 'store_id' => $this->store->id]);
    }

    private function employee(string $name, ?User $login = null, array $details = [], ?Employee $reportsTo = null): Employee
    {
        $employee = Employee::create(['name' => $name, 'code' => strtoupper(Str::random(6)), 'store_id' => $this->store->id, 'is_active' => true,
            'joining_date' => '2025-01-01', 'user_id' => $login?->id, 'reports_to_id' => $reportsTo?->id]);
        $details && $employee->forceFill(['master_details' => $details])->save();

        return $employee;
    }

    private function at(string $time, string $date = '2026-11-04'): Carbon
    {
        return Carbon::parse("{$date} {$time}", 'Asia/Kolkata');
    }

    private function row(Employee $employee, string $date = '2026-11-04'): ?Attendance
    {
        return Attendance::where('employee_id', $employee->id)->whereDate('date', $date)->first();
    }

    public function test_the_roster_overrides_the_shift_and_weekly_off(): void
    {
        $asha = $this->employee('Asha', null, ['week_off' => 'Wednesday']);
        $ravi = $this->employee('Ravi', null, ['week_off' => 'Dynamic']);
        Sanctum::actingAs($this->user('manager'));

        // Asha works her usual weekly off on the evening shift; Ravi ("Dynamic") is given Friday off.
        $this->putJson('/api/shift-roster/cell', ['employee_id' => $asha->id, 'date' => '2026-11-04', 'working_hour_id' => $this->evening->id])->assertOk();
        $this->postJson('/api/shift-roster/bulk', ['employee_ids' => [$ravi->id], 'from' => '2026-11-02', 'to' => '2026-11-15', 'is_off' => true, 'weekdays' => [5]])
            ->assertOk()->assertJsonPath('message', '2 day(s) set');
        $service = app(AttendanceService::class);
        $service->forgetRoster();
        $this->assertFalse($service->isWeekOff($asha, '2026-11-04'));
        $this->assertTrue($service->isWeekOff($ravi, '2026-11-06'));
        $this->assertFalse($service->isWeekOff($ravi, '2026-11-04'));

        // 14:20 is late on the evening shift only by its 10-minute grace: 20 minutes.
        $service->punch($asha, 'IN', 'MANAGER', at: $this->at('14:20'));
        $this->assertSame(20, $this->row($asha)->late_minutes);
        $week = $this->getJson('/api/shift-roster?from=2026-11-04')->assertOk()->json('data');
        $this->assertSame('2026-11-02', $week['from']);
        $asharow = collect($week['rows'])->firstWhere('name', 'Asha');
        $this->assertSame('Evening', $asharow['days']['2026-11-04']['shift']);
        $this->assertTrue(collect($week['rows'])->firstWhere('name', 'Ravi')['days']['2026-11-06']['is_off']);

        $this->postJson('/api/shift-roster/copy-week', ['from' => '2026-11-09'])->assertOk();
        $this->assertTrue(HrShiftRoster::where('employee_id', $asha->id)->whereDate('date', '2026-11-11')->exists());
    }

    public function test_overtime_is_paid_only_once_approved(): void
    {
        $asha = $this->employee('Asha', null, ['gross_pay' => 24000, 'e_ot' => true]);
        $other = $this->employee('No OT', null, ['gross_pay' => 24000]);
        $service = app(AttendanceService::class);
        foreach ([$asha, $other] as $employee) {
            $service->punch($employee, 'IN', 'MANAGER', at: $this->at('09:30', '2026-10-15'));
            $service->punch($employee, 'OUT', 'MANAGER', at: $this->at('20:30', '2026-10-15')); // 11h against the 9h default shift.
        }
        $this->assertSame([120, 'PENDING'], [$this->row($asha, '2026-10-15')->ot_minutes, $this->row($asha, '2026-10-15')->ot_status]);
        $this->assertSame(0, $this->row($other, '2026-10-15')->ot_minutes); // OT not ticked.

        $ot = fn () => collect(app(PayrollCalculator::class)->slip($asha->fresh(), '2026-10')['earnings'])->firstWhere('code', 'OT')['amount'] ?? 0;
        $this->assertEquals(0, $ot());

        Sanctum::actingAs($this->user('manager'));
        $list = $this->getJson('/api/overtime?month=2026-10&status=PENDING')->assertOk()->json('data');
        $this->assertCount(1, $list);
        $this->postJson('/api/overtime/decide', ['ids' => [$list[0]['id']], 'action' => 'approve', 'minutes' => 60])->assertOk();
        $this->assertEquals(96.77, $ot()); // 1h × 24,000 ÷ 31 days ÷ 8 hours.

        app(PayrollSetup::class)->saveSettings($this->store->id, ['ot' => ['requires_approval' => false]]);
        Attendance::whereKey($list[0]['id'])->update(['ot_status' => 'NONE', 'ot_approved_minutes' => null]);
        $this->assertEquals(193.55, $ot()); // Approval switched off: all 2 hours.
    }

    public function test_a_missed_check_out_is_fixed_by_an_approved_request(): void
    {
        $leadLogin = $this->user('supervisor');
        $lead = $this->employee('Lead', $leadLogin);
        $login = $this->user('cashier');
        $asha = $this->employee('Asha', $login, [], $lead);
        app(AttendanceService::class)->punch($asha, 'IN', 'MANAGER', at: $this->at('09:30', '2026-11-03'));

        Sanctum::actingAs($login);
        $id = $this->postJson('/api/staff-requests', ['type' => 'ATTENDANCE', 'from_date' => '2026-11-03', 'check_out' => '18:30', 'reason' => 'Forgot to check out'])
            ->assertCreated()->json('data.id');
        $this->postJson('/api/staff-requests', ['type' => 'ATTENDANCE', 'from_date' => '2026-11-05', 'check_in' => '09:30'])->assertUnprocessable(); // Future.
        $this->postJson("/api/staff-requests/{$id}/approve")->assertForbidden();
        $this->assertCount(1, $this->getJson('/api/staff-requests/mine')->assertOk()->json('data.requests'));

        Sanctum::actingAs($leadLogin);
        $this->postJson("/api/staff-requests/{$id}/approve", ['note' => 'OK'])->assertOk()->assertJsonPath('data.status', 'APPROVED');
        $row = $this->row($asha, '2026-11-03');
        $this->assertSame(['18:30:00', 540, 'PRESENT'], [$row->check_out, $row->worked_minutes, $row->status]);
        $this->assertDatabaseHas('hr_checkins', ['employee_id' => $asha->id, 'source' => 'REQUEST', 'type' => 'OUT']);
        $this->assertDatabaseHas('app_notifications', ['type' => 'HR_REQUEST_DECIDED', 'user_id' => $login->id]);
    }

    public function test_a_shift_request_writes_the_roster_and_nobody_decides_their_own(): void
    {
        $leadLogin = $this->user('supervisor');
        $lead = $this->employee('Lead', $leadLogin);
        $login = $this->user('cashier');
        $asha = $this->employee('Asha', $login, [], $lead);
        $outsider = $this->employee('Outsider', $this->user('cashier'));

        Sanctum::actingAs($login);
        $id = $this->postJson('/api/staff-requests', ['type' => 'SHIFT', 'from_date' => '2026-11-09', 'to_date' => '2026-11-11', 'working_hour_id' => $this->evening->id])
            ->assertCreated()->json('data.id');
        Sanctum::actingAs($leadLogin);
        $own = $this->postJson('/api/staff-requests', ['type' => 'SHIFT', 'from_date' => '2026-11-12', 'is_off' => true])->assertCreated()->json('data.id');
        $this->postJson("/api/staff-requests/{$own}/approve")->assertUnprocessable();
        $this->assertSame([$id], array_column($this->getJson('/api/staff-requests?status=PENDING')->json('data'), 'id')); // Own and others' teams left out.
        $this->postJson("/api/staff-requests/{$id}/approve")->assertOk();
        $this->assertSame(3, HrShiftRoster::where('employee_id', $asha->id)->where('source', 'REQUEST')->where('working_hour_id', $this->evening->id)->count());

        Sanctum::actingAs($this->user('manager'));
        $this->assertSame([$own], array_column($this->getJson('/api/staff-requests?status=PENDING')->json('data'), 'id')); // HR decides the lead's own request.
        $this->postJson("/api/staff-requests/{$own}/approve")->assertOk();
        $this->assertNull(Employee::find($outsider->id)->reports_to_id);
    }
}
