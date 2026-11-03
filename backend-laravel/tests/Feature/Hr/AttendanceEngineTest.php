<?php

namespace Tests\Feature\Hr;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrDepartment;
use App\Models\HrHoliday;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\AttendanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceEngineTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->store = Store::create(['name' => 'Attendance store', 'code' => 'AT-'.Str::random(6)]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** 2026-11-04 is a Wednesday. */
    private function at(string $localTime, string $date = '2026-11-04'): void
    {
        Carbon::setTestNow(Carbon::parse("{$date} {$localTime}", 'Asia/Kolkata')->utc());
    }

    private function user(string $role, ?Store $store = null): User
    {
        return User::factory()->create(['username' => "{$role}-".Str::random(8), 'role' => $role, 'store_id' => ($store ?? $this->store)->id]);
    }

    private function employee(string $name, ?User $login = null, array $details = [], ?Employee $reportsTo = null, ?Store $store = null): Employee
    {
        $employee = Employee::create(['name' => $name, 'code' => strtoupper(Str::random(6)), 'store_id' => ($store ?? $this->store)->id,
            'is_active' => true, 'joining_date' => '2026-01-01', 'user_id' => $login?->id, 'reports_to_id' => $reportsTo?->id]);
        if ($details) {
            $employee->forceFill(['master_details' => $details])->save();
        }

        return $employee;
    }

    private function row(Employee $employee, string $date = '2026-11-04'): ?Attendance
    {
        return Attendance::where('employee_id', $employee->id)->whereDate('date', $date)->first();
    }

    public function test_a_self_check_in_uses_the_business_day_and_the_late_rule(): void
    {
        $login = $this->user('cashier');
        $employee = $this->employee('Asha', $login);
        Sanctum::actingAs($login);

        // 09:45 IST is 04:15 UTC: still the 4th in India, and within the store's 10:00 late cut-off.
        $this->at('09:45');
        $this->postJson('/api/attendance/self-punch', ['type' => 'IN'])->assertOk();
        $row = $this->row($employee);
        $this->assertSame('PRESENT', $row->status);
        $this->assertSame('09:45:00', $row->check_in);
        $this->assertSame(0, $row->late_minutes);

        $other = $this->employee('Ravi', $this->user('cashier'));
        Sanctum::actingAs($other->user);
        $this->at('10:20');
        $this->postJson('/api/attendance/self-punch', ['type' => 'IN'])->assertOk();
        $this->assertSame(50, $this->row($other)->late_minutes); // Against the 09:30 start, beyond the 30-minute grace.

        $this->getJson('/api/attendance/me')->assertOk()->assertJsonPath('data.next', 'OUT')->assertJsonPath('data.employee.name', 'Ravi');
    }

    public function test_the_working_hour_decides_full_day_half_day_and_early_exit(): void
    {
        $shift = HrDepartment::create(['name' => 'Day shift', 'code' => 'DAY', 'configuration_type' => 'working_hour', 'store_id' => $this->store->id]);
        $shift->forceFill(['master_details' => ['from_time' => '09:00', 'to_time' => '18:00', 'minimum_full_day' => '08:00', 'minimum_present' => '04:00', 'grace_minutes' => 10]])->save();
        $employee = $this->employee('Meena', null, ['working_hour_id' => $shift->id]);
        $service = app(AttendanceService::class);

        $this->at('09:05');
        $service->punch($employee, 'IN', 'MANAGER');
        $this->at('14:00');
        $row = $service->punch($employee, 'OUT', 'MANAGER');
        $this->assertSame('HALF_DAY', $row->status);
        $this->assertSame(295, $row->worked_minutes);
        $this->assertSame(240, $row->early_exit_minutes);
        $this->assertSame(0, $row->late_minutes);

        $this->at('18:10');
        $row = $service->punch($employee, 'OUT', 'MANAGER'); // A later check-out replaces the earlier one.
        $this->assertSame('PRESENT', $row->status);
        $this->assertSame(545, $row->worked_minutes);
    }

    public function test_self_check_in_is_allowed_only_near_the_store(): void
    {
        $this->store->update(['attendance_settings' => ['lat' => 13.0827, 'lng' => 80.2707, 'radius_m' => 100]]);
        $login = $this->user('cashier');
        $employee = $this->employee('Asha', $login);
        Sanctum::actingAs($login);
        $this->at('09:40');

        $this->postJson('/api/attendance/self-punch', ['type' => 'IN'])->assertUnprocessable()->assertJsonValidationErrors('location');
        $this->postJson('/api/attendance/self-punch', ['type' => 'IN', 'lat' => 13.0917, 'lng' => 80.2707])
            ->assertUnprocessable()->assertJsonFragment(['You are 1001 m from the store. Check-in is allowed within 100 m.']);
        $this->assertNull($this->row($employee));

        $this->postJson('/api/attendance/self-punch', ['type' => 'IN', 'lat' => 13.0831, 'lng' => 80.2707])->assertOk();
        $this->assertDatabaseHas('hr_checkins', ['employee_id' => $employee->id, 'source' => 'SELF', 'distance_m' => 44]);
    }

    public function test_a_manual_marking_is_kept_until_a_manager_changes_it(): void
    {
        $login = $this->user('cashier');
        $employee = $this->employee('Asha', $login);
        $manager = $this->user('manager');
        Sanctum::actingAs($manager);
        $this->at('09:00');
        $this->postJson('/api/attendance/mark', ['employee_ids' => [$employee->id], 'date' => '2026-11-04', 'status' => 'HALF_DAY', 'remarks' => 'Doctor visit'])->assertOk();

        Sanctum::actingAs($login);
        $this->at('13:00');
        $this->postJson('/api/attendance/self-punch', ['type' => 'IN'])->assertOk();
        $this->assertSame('HALF_DAY', $this->row($employee)->status);
        $this->assertSame('MANUAL', $this->row($employee)->source);

        Sanctum::actingAs($manager);
        $this->postJson('/api/attendance/mark', ['employee_ids' => [$employee->id], 'date' => '2026-11-04', 'status' => 'AUTO'])->assertOk();
        $this->assertSame('AUTO', $this->row($employee)->source);
        $this->assertSame('13:00:00', $this->row($employee)->check_in);
        $this->postJson('/api/attendance/mark', ['employee_ids' => [$employee->id], 'date' => '2026-11-06', 'status' => 'ABSENT'])->assertUnprocessable();
    }

    public function test_closing_a_day_marks_absent_holiday_and_weekly_off(): void
    {
        $absent = $this->employee('Absent');
        $weekOff = $this->employee('Off on Wednesday', null, ['week_off' => 'Wednesday']);
        $worked = $this->employee('Worked');
        $notJoined = Employee::create(['name' => 'Joins later', 'code' => 'LATE1', 'store_id' => $this->store->id, 'is_active' => true, 'joining_date' => '2026-12-01']);
        $this->at('09:30');
        app(AttendanceService::class)->punch($worked, 'IN', 'MANAGER');
        $this->at('09:00', '2026-11-05');

        $this->artisan('hr:close-attendance')->assertSuccessful();
        $this->assertSame('ABSENT', $this->row($absent)->status);
        $this->assertSame('WEEK_OFF', $this->row($weekOff)->status);
        $this->assertSame('PRESENT', $this->row($worked)->status);
        $this->assertSame('No check-out', $this->row($worked)->remarks);
        $this->assertNull($this->row($notJoined));

        HrHoliday::create(['store_id' => $this->store->id, 'date' => '2026-11-05', 'name' => 'Festival']);
        $this->at('09:00', '2026-11-06');
        $this->artisan('hr:close-attendance')->assertSuccessful();
        $this->assertSame('HOLIDAY', $this->row($absent, '2026-11-05')->status);
        $this->assertSame('Festival', $this->row($absent, '2026-11-05')->remarks);
    }

    public function test_staff_see_themselves_and_their_team_and_cannot_mark_others(): void
    {
        $leadLogin = $this->user('supervisor');
        $lead = $this->employee('Lead', $leadLogin);
        $member = $this->employee('Member', null, [], $lead);
        $this->employee('Elsewhere in the store');
        $otherStore = Store::create(['name' => 'Other', 'code' => 'OT-'.Str::random(6)]);
        $foreign = $this->employee('Other store', null, [], null, $otherStore);
        $this->at('11:00');

        Sanctum::actingAs($leadLogin);
        $names = collect($this->getJson('/api/attendance/today')->assertOk()->json('data.rows'))->pluck('name')->sort()->values()->all();
        $this->assertSame(['Lead', 'Member'], $names);
        $this->postJson('/api/attendance/mark', ['employee_ids' => [$member->id], 'date' => '2026-11-04', 'status' => 'PRESENT'])->assertForbidden();

        Sanctum::actingAs($this->user('manager'));
        $names = collect($this->getJson('/api/attendance/today')->assertOk()->json('data.rows'))->pluck('name')->all();
        $this->assertCount(3, $names);
        $this->assertNotContains('Other store', $names);
        $this->postJson('/api/attendance/punch', ['employee_ids' => [$foreign->id], 'type' => 'IN'])->assertOk()->assertJsonPath('data', []);
        $this->assertNull($this->row($foreign));
    }

    public function test_the_employee_form_links_the_login_by_username(): void
    {
        $login = $this->user('cashier');
        Sanctum::actingAs($this->user('manager'));
        $id = $this->postJson('/api/employees', ['name' => 'Asha', 'allow_system' => true, 'system_username' => $login->username])->assertCreated()->json('data.id');
        $this->assertSame($login->id, Employee::find($id)->user_id);

        $this->putJson("/api/employees/{$id}", ['name' => 'Asha R'])->assertOk(); // Not sent: the link stays.
        $this->assertSame($login->id, Employee::find($id)->user_id);
        $this->postJson('/api/employees', ['name' => 'Twin', 'allow_system' => true, 'system_username' => $login->username])->assertUnprocessable()->assertJsonValidationErrors('system_username');
        $this->postJson('/api/employees', ['name' => 'Ghost', 'allow_system' => true, 'system_username' => 'nobody-here'])->assertUnprocessable();

        $this->putJson("/api/employees/{$id}", ['allow_system' => false])->assertOk();
        $this->assertNull(Employee::find($id)->user_id);
    }
}
