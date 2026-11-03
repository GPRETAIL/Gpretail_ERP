<?php

namespace Tests\Feature\Hr;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrHoliday;
use App\Models\HrLeaveLedger;
use App\Models\HrLeaveType;
use App\Models\Notification;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\LeaveService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LeaveTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private User $staffLogin;

    private Employee $staff;

    private User $leadLogin;

    private Employee $lead;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-04 10:00', 'Asia/Kolkata')->utc());
        $this->store = Store::create(['name' => 'Leave store', 'code' => 'LV-'.Str::random(6)]);
        $this->leadLogin = $this->user('supervisor');
        $this->lead = $this->employee('Lead', $this->leadLogin);
        $this->staffLogin = $this->user('cashier');
        $this->staff = $this->employee('Asha', $this->staffLogin, $this->lead, ['week_off' => 'Sunday']);
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

    private function employee(string $name, ?User $login = null, ?Employee $reportsTo = null, array $details = [], string $joined = '2025-01-01'): Employee
    {
        $employee = Employee::create(['name' => $name, 'code' => strtoupper(Str::random(6)), 'store_id' => $this->store->id, 'is_active' => true,
            'joining_date' => $joined, 'user_id' => $login?->id, 'reports_to_id' => $reportsTo?->id]);
        $details && $employee->forceFill(['master_details' => $details])->save();

        return $employee;
    }

    private function type(string $code): HrLeaveType
    {
        return HrLeaveType::where('store_id', $this->store->id)->where('code', $code)->firstOrFail();
    }

    private function balance(Employee $employee, string $code, int $year = 2026): float
    {
        return (float) HrLeaveLedger::where('employee_id', $employee->id)->where('leave_type_id', $this->type($code)->id)->where('year', $year)->sum('days');
    }

    public function test_the_year_is_allocated_once_pro_rata_for_new_joiners_with_carry_forward(): void
    {
        $service = app(LeaveService::class);
        $joiner = $this->employee('Joined in July', null, null, [], '2026-07-15');
        $this->assertGreaterThan(0, $service->allocateYear($this->store->id, 2026));
        $this->assertSame(0, $service->allocateYear($this->store->id, 2026)); // Running again adds nothing.

        $this->assertSame(12.0, $this->balance($this->staff, 'CL'));
        $this->assertSame(6.0, $this->balance($joiner, 'CL')); // July to December.
        $this->assertSame(7.5, $this->balance($joiner, 'EL')); // 15 × 6/12.
        $this->assertSame(0.0, $this->balance($this->staff, 'LOP'));

        // Earned leave carries forward up to 30 days; casual leave does not.
        HrLeaveLedger::create(['store_id' => $this->store->id, 'employee_id' => $this->staff->id, 'leave_type_id' => $this->type('EL')->id, 'year' => 2026, 'days' => 25, 'kind' => 'ADJUSTMENT']);
        $this->artisan('hr:allocate-leave', ['year' => 2027])->assertSuccessful();
        $this->assertSame(45.0, $this->balance($this->staff, 'EL', 2027)); // 15 new + 30 carried (40 left, capped).
        $this->assertSame(12.0, $this->balance($this->staff, 'CL', 2027));
    }

    public function test_applying_counts_working_days_and_checks_balance_and_overlap(): void
    {
        app(LeaveService::class)->allocateYear($this->store->id, 2026);
        HrHoliday::create(['store_id' => $this->store->id, 'date' => '2026-11-10', 'name' => 'Festival']);
        Sanctum::actingAs($this->staffLogin);

        // Mon 9th to Thu 12th, minus the festival on the 10th: 3 days. The 8th is her Sunday off.
        $this->postJson('/api/leave-applications', ['leave_type_id' => $this->type('CL')->id, 'from_date' => '2026-11-08', 'to_date' => '2026-11-12', 'reason' => 'Family'])
            ->assertCreated()->assertJsonPath('data.days', 3)->assertJsonPath('data.status', 'PENDING');
        $this->postJson('/api/leave-applications', ['leave_type_id' => $this->type('SL')->id, 'from_date' => '2026-11-12'])
            ->assertUnprocessable()->assertJsonValidationErrors('from_date');
        $this->postJson('/api/leave-applications', ['leave_type_id' => $this->type('CL')->id, 'from_date' => '2026-11-16', 'to_date' => '2026-11-30'])
            ->assertUnprocessable()->assertJsonFragment(['Not enough Casual Leave: 9 day(s) available, 13 needed.']);
        $this->postJson('/api/leave-applications', ['leave_type_id' => $this->type('LOP')->id, 'from_date' => '2026-11-16', 'to_date' => '2026-11-30'])
            ->assertCreated()->assertJsonPath('data.days', 13); // Loss of pay has no balance.
        $this->postJson('/api/leave-applications', ['leave_type_id' => $this->type('SL')->id, 'from_date' => '2026-12-01', 'half_day' => true])
            ->assertCreated()->assertJsonPath('data.days', 0.5);

        $mine = $this->getJson('/api/leave/mine')->assertOk();
        $cl = collect($mine->json('data.balances'))->firstWhere('code', 'CL');
        $this->assertSame([12, 0, 3, 9], [$cl['balance'], $cl['used'], $cl['pending'], $cl['available']]);
        // The approver was told: her reporting manager's login.
        $this->assertDatabaseHas('app_notifications', ['type' => 'LEAVE_REQUEST', 'user_id' => $this->leadLogin->id]);
    }

    public function test_approval_debits_the_balance_marks_attendance_and_cancelling_reverses_it(): void
    {
        app(LeaveService::class)->allocateYear($this->store->id, 2026);
        Sanctum::actingAs($this->staffLogin);
        $id = $this->postJson('/api/leave-applications', ['leave_type_id' => $this->type('CL')->id, 'from_date' => '2026-11-05', 'to_date' => '2026-11-06'])->json('data.id');
        $this->postJson("/api/leave-applications/{$id}/approve")->assertForbidden(); // A cashier can't decide.

        Sanctum::actingAs($this->leadLogin);
        $this->assertCount(1, $this->getJson('/api/leave-applications?inbox=1&status=PENDING')->json('data'));
        $this->postJson("/api/leave-applications/{$id}/approve", ['note' => 'Enjoy'])->assertOk()->assertJsonPath('data.status', 'APPROVED');
        $this->assertSame(10.0, $this->balance($this->staff, 'CL'));
        $this->assertSame(['LEAVE', 'LEAVE'], Attendance::where('employee_id', $this->staff->id)->orderBy('date')->pluck('status')->all());
        $this->assertTrue(Notification::where('type', 'LEAVE_DECIDED')->where('user_id', $this->staffLogin->id)->exists());

        Sanctum::actingAs($this->staffLogin);
        $this->postJson("/api/leave-applications/{$id}/cancel")->assertUnprocessable(); // Approved: the manager cancels it.
        Sanctum::actingAs($this->leadLogin);
        $this->postJson("/api/leave-applications/{$id}/cancel")->assertOk()->assertJsonPath('data.status', 'CANCELLED');
        $this->assertSame(12.0, $this->balance($this->staff, 'CL'));
        $this->assertSame(0, Attendance::where('employee_id', $this->staff->id)->count());
    }

    public function test_nobody_decides_their_own_leave_or_someone_outside_their_team(): void
    {
        app(LeaveService::class)->allocateYear($this->store->id, 2026);
        Sanctum::actingAs($this->leadLogin);
        $own = $this->postJson('/api/leave-applications', ['leave_type_id' => $this->type('CL')->id, 'from_date' => '2026-11-20'])->assertCreated()->json('data.id');
        $this->postJson("/api/leave-applications/{$own}/approve")->assertUnprocessable();

        $outsider = $this->employee('Outsider', $this->user('cashier'));
        app(LeaveService::class)->allocateYear($this->store->id, 2026); // Adds only the newcomer's credits.
        $application = app(LeaveService::class)->apply($outsider, ['leave_type_id' => $this->type('CL')->id, 'from_date' => '2026-11-20'], null);
        $this->postJson("/api/leave-applications/{$application->id}/approve")->assertUnprocessable();
        $this->postJson("/api/leave-applications/{$application->id}/reject")->assertUnprocessable();

        Sanctum::actingAs($this->user('manager')); // HR decides for everyone.
        $this->postJson("/api/leave-applications/{$application->id}/reject", ['note' => 'Stock-taking week'])->assertOk()->assertJsonPath('data.status', 'REJECTED');
        $this->postJson("/api/leave-applications/{$own}/approve")->assertOk();
    }

    public function test_another_stores_leave_setup_is_never_visible(): void
    {
        $other = Store::create(['name' => 'Other', 'code' => 'OT-'.Str::random(6)]);
        app(LeaveService::class)->ensureDefaults($other->id);
        HrLeaveType::where('store_id', $other->id)->where('code', 'CL')->update(['name' => 'Other store casual']);
        Sanctum::actingAs($this->user('manager'));

        $names = collect($this->getJson('/api/leave-types')->assertOk()->json('data'))->pluck('name');
        $this->assertContains('Casual Leave', $names);
        $this->assertNotContains('Other store casual', $names);
        $this->assertCount(1, $this->getJson('/api/leave-policies')->json('data'));
        $foreignType = HrLeaveType::where('store_id', $other->id)->where('code', 'SL')->value('id');
        $this->postJson('/api/leave-applications', ['employee_id' => $this->staff->id, 'leave_type_id' => $foreignType, 'from_date' => '2026-11-20'])
            ->assertUnprocessable()->assertJsonValidationErrors('leave_type_id');
    }
}
