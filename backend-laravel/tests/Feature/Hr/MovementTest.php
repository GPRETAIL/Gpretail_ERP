<?php

namespace Tests\Feature\Hr;

use App\Models\Employee;
use App\Models\HrDepartment;
use App\Models\HrDesignation;
use App\Models\HrEmployeeMovement;
use App\Models\HrLeaveLedger;
use App\Models\HrLeaveType;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\LeaveService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MovementTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-04 10:00', 'Asia/Kolkata')->utc());
        $this->store = Store::create(['name' => 'Main store', 'code' => 'MV-'.Str::random(6)]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function employee(array $details = [], ?User $login = null): Employee
    {
        $employee = Employee::create(['name' => 'Asha', 'code' => 'E1', 'store_id' => $this->store->id, 'is_active' => true, 'joining_date' => '2024-01-01', 'user_id' => $login?->id]);
        $employee->forceFill(['master_details' => $details + ['classifications' => [['valid_from' => '2024-01-01', 'valid_to' => '', 'designation_id' => '', 'department_id' => '', 'section_id' => '', 'floor_id' => '']]]])->save();

        return $employee;
    }

    private function manager(): User
    {
        return User::factory()->create(['username' => 'mgr-'.Str::random(6), 'role' => 'manager', 'store_id' => $this->store->id]);
    }

    public function test_a_promotion_today_updates_the_employee_and_its_classification_history(): void
    {
        $department = HrDepartment::forceCreate(['name' => 'Sales', 'code' => 'SAL', 'store_id' => $this->store->id, 'is_active' => true, 'configuration_type' => 'department']);
        HrDesignation::forceCreate(['name' => 'Senior Cashier', 'code' => 'SC', 'department_id' => $department->id, 'store_id' => $this->store->id, 'is_active' => true]);
        $senior = HrDesignation::withoutGlobalScopes()->where('code', 'SC')->firstOrFail();
        $asha = $this->employee(['gross_pay' => 18000]);
        Sanctum::actingAs($this->manager());

        $this->postJson('/api/employee-movements', ['employee_id' => $asha->id, 'type' => 'PROMOTION', 'effective_date' => '2026-11-01',
            'values' => ['designation_id' => $senior->id, 'gross_pay' => 21000]])->assertCreated()->assertJsonPath('data.status', 'APPLIED');
        $asha->refresh();
        $this->assertSame($senior->id, $asha->designation_id);
        $this->assertEquals(21000, $asha->salary); // Gross Pay is the salary column.
        $this->assertEquals(['from' => 18000, 'to' => 21000], HrEmployeeMovement::first()->changes['gross_pay']);
        $history = $asha->master_details['classifications'];
        $this->assertSame(['2024-01-01', '2026-10-31'], [$history[0]['valid_from'], $history[0]['valid_to']]); // Closed the day before.
        $this->assertSame(['2026-11-01', '', (string) $senior->id], [$history[1]['valid_from'], $history[1]['valid_to'], $history[1]['designation_id']]);
        $this->postJson('/api/employee-movements', ['employee_id' => $asha->id, 'type' => 'SALARY_REVISION', 'effective_date' => '2026-12-01', 'values' => ['gross_pay' => 21000]])
            ->assertUnprocessable(); // Nothing changes.
    }

    public function test_a_future_salary_revision_waits_for_its_date(): void
    {
        $asha = $this->employee(['gross_pay' => 18000]);
        Sanctum::actingAs($this->manager());
        $id = $this->postJson('/api/employee-movements', ['employee_id' => $asha->id, 'type' => 'SALARY_REVISION', 'effective_date' => '2026-12-01', 'values' => ['gross_pay' => 20000]])
            ->assertCreated()->assertJsonPath('data.status', 'SCHEDULED')->json('data.id');
        $this->artisan('hr:apply-movements')->assertSuccessful();
        $this->assertEquals(18000, \App\Services\Hr\PayrollCalculator::grossOf($asha->fresh()));

        Carbon::setTestNow(Carbon::parse('2026-12-01 00:15', 'Asia/Kolkata')->utc());
        $this->artisan('hr:apply-movements')->assertSuccessful();
        $this->assertEquals(20000, $asha->fresh()->salary);
        $this->assertArrayNotHasKey('gross_pay', $asha->fresh()->master_details);
        $this->assertSame('APPLIED', HrEmployeeMovement::find($id)->status);
    }

    public function test_a_store_transfer_copies_the_employee_moves_the_login_and_carries_leave(): void
    {
        $branch = Store::create(['name' => 'Branch', 'code' => 'BR-'.Str::random(6)]);
        $admin = User::factory()->create(['username' => 'adm-'.Str::random(6), 'role' => 'admin', 'store_id' => null]);
        DB::table('user_store_access')->insert([['user_id' => $admin->id, 'store_id' => $this->store->id], ['user_id' => $admin->id, 'store_id' => $branch->id]]);
        $login = User::factory()->create(['username' => 'asha-'.Str::random(6), 'role' => 'cashier', 'store_id' => $this->store->id]);
        $asha = $this->employee(['gross_pay' => 18000, 'working_hour_id' => 99], $login);
        app(LeaveService::class)->allocateYear($this->store->id, 2026, $asha);
        Sanctum::actingAs($admin);

        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->postJson('/api/employee-movements', ['employee_id' => $asha->id, 'type' => 'STORE_TRANSFER',
            'effective_date' => '2026-11-04', 'values' => ['store_id' => $branch->id]])->assertUnprocessable()->assertJsonValidationErrors('store_id'); // Login has no branch access.
        DB::table('user_store_access')->insert(['user_id' => $login->id, 'store_id' => $branch->id]);
        $movement = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->postJson('/api/employee-movements', ['employee_id' => $asha->id, 'type' => 'STORE_TRANSFER',
            'effective_date' => '2026-11-04', 'values' => ['store_id' => $branch->id]])->assertCreated()->json('data');

        $old = Employee::withoutGlobalScopes()->find($asha->id);
        $new = Employee::withoutGlobalScopes()->find($movement['new_employee_id']);
        $this->assertFalse($old->is_active);
        $this->assertNull($old->user_id);
        $this->assertSame([$branch->id, $login->id, 'E1'], [$new->store_id, $new->user_id, $new->code]);
        $this->assertArrayNotHasKey('working_hour_id', $new->master_details); // Store-specific settings are left for the branch.
        $branchCl = HrLeaveType::withoutGlobalScopes()->where('store_id', $branch->id)->where('code', 'CL')->value('id');
        $this->assertEquals(12, HrLeaveLedger::withoutGlobalScopes()->where('employee_id', $new->id)->where('leave_type_id', $branchCl)->sum('days'));
        $this->assertEquals(0, HrLeaveLedger::withoutGlobalScopes()->where('employee_id', $asha->id)->where('year', 2026)
            ->whereIn('leave_type_id', HrLeaveType::withoutGlobalScopes()->where('store_id', $this->store->id)->where('code', 'CL')->pluck('id'))->sum('days'));

        // Each store sees only its own record.
        $this->assertSame([$new->id], array_column($this->withHeader('X-Company-Scope-Id', (string) $branch->id)->getJson('/api/employees?limit=50')->assertOk()->json('data'), 'id'));
        $this->assertSame([$asha->id], array_column($this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->getJson('/api/employees?limit=50')->assertOk()->json('data'), 'id'));
    }
}
