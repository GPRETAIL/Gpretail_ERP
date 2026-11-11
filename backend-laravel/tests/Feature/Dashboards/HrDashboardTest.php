<?php

namespace Tests\Feature\Dashboards;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrDepartment;
use App\Models\HrHoliday;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveType;
use App\Models\HrPayrollRun;
use App\Models\HrSeparation;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Dashboard > HR tab: counts, scope, payroll gating, approvals and people events. */
class HrDashboardTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private Employee $lead;

    private User $leadLogin;

    protected function setUp(): void
    {
        parent::setUp();
        // Wednesday 25 Nov 2026, 11:00 in the business timezone.
        Carbon::setTestNow(Carbon::parse('2026-11-25 11:00', 'Asia/Kolkata')->utc());
        $this->store = Store::create(['name' => 'HR dash', 'code' => 'HRD-'.Str::random(5), 'is_active' => true]);
        $this->leadLogin = $this->login('supervisor');
        $sales = HrDepartment::forceCreate(['store_id' => $this->store->id, 'code' => 'SAL', 'name' => 'Sales', 'configuration_type' => 'department']);
        $this->lead = $this->employee('Lakshmi Lead', ['department_id' => $sales->id, 'user_id' => $this->leadLogin->id, 'joining_date' => '2020-12-01']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function login(string $role, ?Store $store = null): User
    {
        return User::factory()->create(['username' => "{$role}-".Str::random(8), 'role' => $role, 'store_id' => ($store ?? $this->store)->id]);
    }

    private function employee(string $name, array $fields = [], ?Store $store = null): Employee
    {
        $details = $fields['master_details'] ?? null;
        unset($fields['master_details']);
        $employee = Employee::create($fields + ['name' => $name, 'code' => strtoupper(Str::random(6)), 'store_id' => ($store ?? $this->store)->id,
            'is_active' => true, 'joining_date' => '2024-01-10', 'phone' => '9'.random_int(100000000, 999999999)]);
        if ($details) {
            $employee->forceFill(['master_details' => $details])->save();
        }

        return $employee;
    }

    private function attend(Employee $employee, string $date, string $status, int $late = 0): void
    {
        Attendance::create(['employee_id' => $employee->id, 'store_id' => $employee->store_id, 'date' => $date, 'status' => $status,
            'source' => 'MANUAL', 'late_minutes' => $late, 'worked_minutes' => 480, 'early_exit_minutes' => 0]);
    }

    public function test_today_counts_people_events_and_payroll_for_hr(): void
    {
        $asha = $this->employee('Asha', ['reports_to_id' => $this->lead->id, 'joining_date' => '2026-11-03', 'master_details' => ['date_of_birth' => '1995-12-02']]);
        $ravi = $this->employee('Ravi', ['reports_to_id' => $this->lead->id, 'phone' => '']);
        $devi = $this->employee('Devi');
        $this->employee('Gone', ['is_active' => false]);
        $other = Store::create(['name' => 'Other', 'code' => 'OTH-'.Str::random(5), 'is_active' => true]);
        $this->employee('Elsewhere', [], $other);
        $this->attend($this->lead, '2026-11-25', 'PRESENT');
        $this->attend($asha, '2026-11-25', 'PRESENT', 25);
        $type = HrLeaveType::create(['store_id' => $this->store->id, 'code' => 'CL', 'name' => 'Casual Leave', 'is_paid' => true]);
        $this->attend($ravi, '2026-11-25', 'LEAVE');
        HrLeaveApplication::create(['store_id' => $this->store->id, 'employee_id' => $ravi->id, 'leave_type_id' => $type->id, 'from_date' => '2026-11-24',
            'to_date' => '2026-11-26', 'days' => 3, 'status' => 'APPROVED']);
        HrLeaveApplication::create(['store_id' => $this->store->id, 'employee_id' => $devi->id, 'leave_type_id' => $type->id, 'from_date' => '2026-12-01',
            'to_date' => '2026-12-01', 'days' => 1, 'status' => 'PENDING']);
        HrSeparation::create(['store_id' => $this->store->id, 'employee_id' => $devi->id, 'type' => 'RESIGNATION', 'applied_on' => '2026-11-20',
            'last_working_day' => '2026-11-28', 'notice_days' => 30, 'status' => 'ACCEPTED']);
        HrPayrollRun::create(['store_id' => $this->store->id, 'month' => '2026-09', 'status' => 'PAID', 'employees' => 4, 'gross' => 100000, 'deductions' => 8000, 'net' => 92000, 'employer_cost' => 108000]);
        HrHoliday::create(['store_id' => $this->store->id, 'date' => '2026-12-25', 'name' => 'Christmas']);

        Sanctum::actingAs($this->login('manager'));
        $data = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->getJson('/api/hrms/dashboard')->assertOk()->json('data');

        $this->assertSame('store', $data['scope']);
        $this->assertSame(['from' => '2026-11-01', 'to' => '2026-11-25', 'today' => '2026-11-25'], $data['range']);
        $this->assertSame(4, $data['summary']['headcount'], 'Active, this store only.');
        $this->assertEquals(['present' => 2, 'late' => 1, 'leave' => 1, 'not_marked' => 1], array_intersect_key($data['today'], array_flip(['present', 'late', 'leave', 'not_marked'])));
        $this->assertEquals(50, $data['summary']['attendance_pct']);
        $this->assertSame(1, $data['summary']['joiners']);
        $this->assertSame(0, $data['summary']['exits'], 'Devi leaves on the 28th, after the range.');
        $this->assertSame(1, $data['summary']['upcoming_exits']);
        $this->assertSame(['Devi', true], [$data['people']['exits'][0]['name'], $data['people']['exits'][0]['upcoming']]);
        $this->assertSame(['leave' => 1], $data['approvals'], 'The resignation is already accepted.');
        $this->assertSame('Ravi', $data['leave']['this_week'][0]['name']);
        $this->assertSame(['No department' => 3, 'Sales' => 1], collect($data['by_department'])->pluck('count', 'department')->all());
        $this->assertEquals(92000, $data['summary']['payroll']['net']);
        $this->assertSame('2026-10', $data['payroll']['last_month_pending']);
        $this->assertSame([['anniversary', 'Lakshmi Lead', '2026-12-01', 6], ['birthday', 'Asha', '2026-12-02', null]],
            collect($data['people']['celebrations'])->map(fn ($e) => [$e['kind'], $e['name'], $e['date'], $e['years']])->all(), 'Soonest first, across the month end.');
        $this->assertSame('Christmas', $data['people']['holidays'][0]['name']);
        $messages = collect($data['action_required'])->pluck('message')->all();
        $this->assertContains('October 2026 payroll is not submitted yet', $messages);
        $this->assertContains('1 employee has no mobile number, so cannot use the HRMS app', $messages);
        $this->assertNotContains('Elsewhere', collect($data['people']['joiners'])->pluck('name')->all());
    }

    public function test_a_manager_sees_their_team_without_pay_and_others_are_kept_out(): void
    {
        $asha = $this->employee('Asha', ['reports_to_id' => $this->lead->id]);
        $this->employee('Devi');
        $this->attend($asha, '2026-11-25', 'PRESENT');
        HrPayrollRun::create(['store_id' => $this->store->id, 'month' => '2026-10', 'status' => 'PAID', 'employees' => 3, 'gross' => 1, 'deductions' => 0, 'net' => 1, 'employer_cost' => 1]);

        Sanctum::actingAs($this->leadLogin);
        $data = $this->getJson('/api/hrms/dashboard')->assertOk()->json('data');
        $this->assertSame('team', $data['scope']);
        $this->assertSame(2, $data['summary']['headcount'], 'Lead and Asha, not Devi.');
        $this->assertNull($data['summary']['payroll']);
        $this->assertNull($data['payroll']);

        Sanctum::actingAs($this->login('cashier'));
        $this->assertSame(0, $this->getJson('/api/hrms/dashboard')->assertOk()->json('data.summary.headcount'), 'Not linked to an employee: sees nobody.');

        $restricted = $this->login('manager');
        $restricted->update(['page_permissions' => ['/sales/pos-sales' => ['view' => true]]]);
        Sanctum::actingAs($restricted->fresh());
        $this->getJson('/api/hrms/dashboard')->assertForbidden();
    }

    public function test_the_trend_uses_the_range_and_counts_half_days_as_half(): void
    {
        $asha = $this->employee('Asha');
        $this->attend($this->lead, '2026-11-23', 'PRESENT');
        $this->attend($asha, '2026-11-23', 'HALF_DAY');
        $this->attend($this->lead, '2026-11-24', 'ABSENT');
        $this->attend($asha, '2026-11-24', 'WEEK_OFF');

        Sanctum::actingAs($this->login('manager'));
        $trend = collect($this->getJson('/api/hrms/dashboard?date_from=2026-11-23&date_to=2026-11-24')->assertOk()->json('data.attendance_trend'))->keyBy('date');
        $this->assertEquals(75, $trend['2026-11-23']['present_pct']);
        $this->assertEquals(0, $trend['2026-11-24']['present_pct']);
        $this->getJson('/api/hrms/dashboard?date_from=23-11-2026')->assertUnprocessable();
    }
}
