<?php

namespace Tests\Feature\Hr;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrExpenseClaim;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveLedger;
use App\Models\HrLeaveType;
use App\Models\HrLoan;
use App\Models\HrSeparation;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\LeaveService;
use App\Services\Hr\PayrollSetup;
use App\Services\Hr\SettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExitTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-04 10:00', 'Asia/Kolkata')->utc());
        $this->store = Store::create(['name' => 'Exit store', 'code' => 'EX-'.Str::random(6)]);
        app(PayrollSetup::class)->ensureDefaults($this->store->id);
        app(PayrollSetup::class)->saveSettings($this->store->id, ['pt' => ['state' => 'KA'] + PayrollSetup::PT_PRESETS['KA']]);
        app(LeaveService::class)->ensureDefaults($this->store->id);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function user(string $role, ?Store $store = null): User
    {
        return User::factory()->create(['username' => "{$role}-".Str::random(8), 'role' => $role, 'store_id' => ($store ?? $this->store)->id, 'is_active' => true]);
    }

    private function employee(string $name, array $details, ?User $login = null, ?Employee $reportsTo = null, string $joined = '2025-01-01'): Employee
    {
        $employee = Employee::create(['name' => $name, 'code' => strtoupper(Str::random(6)), 'store_id' => $this->store->id, 'is_active' => true,
            'joining_date' => $joined, 'user_id' => $login?->id, 'reports_to_id' => $reportsTo?->id]);
        $employee->forceFill(['master_details' => $details])->save();

        return $employee;
    }

    private function attend(Employee $employee, string $month): void
    {
        $first = Carbon::parse("{$month}-01");
        for ($d = $first->copy(); $d->month === $first->month; $d->addDay()) {
            Attendance::create(['employee_id' => $employee->id, 'store_id' => $this->store->id, 'date' => $d->toDateString(), 'status' => 'PRESENT',
                'source' => 'MANUAL', 'worked_minutes' => 540, 'late_minutes' => 0, 'early_exit_minutes' => 0]);
        }
    }

    private function line(array $lines, string $code): ?float
    {
        $line = collect($lines)->firstWhere('code', $code);

        return $line ? (float) $line['amount'] : null;
    }

    private function voucher(string $source, int $id)
    {
        $voucher = DB::table('vouchers')->where('source_type', $source)->where('source_id', $id)->first();
        $this->assertNotNull($voucher, "{$source} #{$id} voucher");
        $lines = DB::table('voucher_lines')->where('voucher_id', $voucher->id)->join('ledger_accounts as l', 'l.id', '=', 'voucher_lines.ledger_account_id')
            ->get(['l.system_key', 'voucher_lines.debit', 'voucher_lines.credit']);
        $this->assertEqualsWithDelta($lines->sum('debit'), $lines->sum('credit'), 0.001, "{$source} voucher balances");

        return $lines->keyBy('system_key');
    }

    private function type(string $code): int
    {
        return HrLeaveType::where('store_id', $this->store->id)->where('code', $code)->value('id');
    }

    public function test_a_resignation_is_accepted_with_its_notice_shortfall(): void
    {
        $bossLogin = $this->user('manager');
        $boss = $this->employee('Boss', ['gross_pay' => 50000], $bossLogin);
        $ravi = $this->employee('Ravi', ['gross_pay' => 20000], $cashier = $this->user('cashier'), $boss);
        $this->employee('Mani', ['gross_pay' => 20000, 'notice_days' => 10], $mani = $this->user('cashier'), $boss);

        Sanctum::actingAs($cashier);
        $this->getJson('/api/separations/mine')->assertOk()->assertJsonPath('data.notice_days', 30);
        $first = $this->postJson('/api/separations/resign', ['reason' => 'Moving', 'requested_last_day' => '2026-11-20'])->assertCreated()->json('data');
        $this->assertSame($bossLogin->id, $first['approver_user_id']);
        $this->assertTrue(DB::table('app_notifications')->where('user_id', $bossLogin->id)->where('type', 'EXIT_REQUEST')->exists());
        $this->postJson('/api/separations/resign', ['requested_last_day' => '2026-11-20'])->assertUnprocessable(); // One at a time.
        $this->postJson("/api/separations/{$first['id']}/withdraw")->assertOk()->assertJsonPath('data.status', 'WITHDRAWN');
        $this->postJson('/api/separations/resign', ['requested_last_day' => '2026-11-01'])->assertUnprocessable(); // In the past.
        $resignation = $this->postJson('/api/separations/resign', ['requested_last_day' => '2026-11-30'])->assertCreated()->json('data.id');
        $this->postJson("/api/separations/{$resignation}/accept", ['last_working_day' => '2026-11-20'])->assertForbidden();

        Sanctum::actingAs($mani);
        $this->getJson('/api/separations/mine')->assertOk()->assertJsonPath('data.notice_days', 10); // Their own notice period.

        Sanctum::actingAs($bossLogin);
        $own = $this->postJson('/api/separations/resign', ['requested_last_day' => '2026-12-31'])->assertCreated()->json('data.id');
        $this->postJson("/api/separations/{$own}/accept", ['last_working_day' => '2026-12-31'])->assertUnprocessable(); // Never your own.
        $this->postJson("/api/separations/{$resignation}/accept", ['last_working_day' => '2026-11-03'])->assertUnprocessable(); // Before the resignation.
        $this->postJson("/api/separations/{$resignation}/accept", ['last_working_day' => '2026-11-20', 'note' => 'All the best'])
            ->assertOk()->assertJsonPath('data.status', 'ACCEPTED')->assertJsonPath('data.notice_short_days', 14); // 30 − 16 days served.
        $this->assertTrue(DB::table('app_notifications')->where('user_id', $cashier->id)->where('type', 'EXIT_DECIDED')->exists());
        $this->postJson("/api/separations/{$resignation}/amend", ['last_working_day' => '2026-12-04', 'notice_days' => 30, 'notice_waived' => false])
            ->assertOk()->assertJsonPath('data.notice_short_days', 0);
        $this->assertCount(1, $this->getJson('/api/separations?status=ACCEPTED')->assertOk()->json('data'));

        Sanctum::actingAs($cashier);
        $this->postJson("/api/separations/{$resignation}/withdraw")->assertUnprocessable(); // Accepted: only HR now.

        // HR records a termination straight away.
        Sanctum::actingAs($bossLogin);
        $other = $this->employee('Gone', ['gross_pay' => 15000]);
        $this->postJson('/api/separations', ['employee_id' => $other->id, 'type' => 'TERMINATION', 'last_working_day' => '2026-11-04', 'reason' => 'Misconduct'])
            ->assertCreated()->assertJsonPath('data.status', 'ACCEPTED')->assertJsonPath('data.notice_short_days', 0);
        $this->assertSame('ACCEPTED', HrSeparation::where('employee_id', $ravi->id)->latest('id')->value('status'));
    }

    public function test_relieving_marks_the_employee_inactive_and_switches_the_login_off(): void
    {
        $manager = $this->user('manager');
        $ravi = $this->employee('Ravi', ['gross_pay' => 20000], $cashier = $this->user('cashier'));
        $admin = $this->employee('Owner', ['gross_pay' => 90000], $adminLogin = $this->user('admin'));
        $later = $this->employee('Later', ['gross_pay' => 20000]);
        $cashier->createToken('pos');
        HrLeaveApplication::create(['store_id' => $this->store->id, 'employee_id' => $ravi->id, 'leave_type_id' => $this->type('CL'), 'from_date' => '2026-11-10',
            'to_date' => '2026-11-10', 'days' => 1, 'status' => 'PENDING']);

        Sanctum::actingAs($manager);
        foreach ([[$ravi, '2026-11-03'], [$admin, '2026-11-03'], [$later, '2026-11-10']] as [$employee, $day]) {
            $this->postJson('/api/separations', ['employee_id' => $employee->id, 'type' => 'RESIGNATION', 'applied_on' => '2026-10-01', 'last_working_day' => $day])->assertCreated();
        }
        $laterId = HrSeparation::where('employee_id', $later->id)->value('id');
        $this->postJson("/api/separations/{$laterId}/relieve")->assertUnprocessable(); // Still working.

        $this->artisan('hr:relieve-employees')->expectsOutput('2 employee(s) relieved.')->assertExitCode(0);
        $ravi->refresh();
        $this->assertFalse($ravi->is_active);
        $this->assertSame('2026-11-03', $ravi->relieving_date->toDateString());
        $this->assertFalse((bool) $cashier->refresh()->is_active);
        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $cashier->id)->count());
        $this->assertSame('CANCELLED', HrLeaveApplication::where('employee_id', $ravi->id)->value('status'));
        $this->assertSame('RELIEVED', HrSeparation::where('employee_id', $ravi->id)->value('status'));
        $this->assertFalse(Employee::find($admin->id)->is_active);
        $this->assertTrue((bool) $adminLogin->refresh()->is_active); // An admin login is never switched off here.
        $this->assertTrue(Employee::find($later->id)->is_active);
        $this->artisan('hr:relieve-employees')->expectsOutput('0 employee(s) relieved.');
    }

    public function test_monthly_payroll_leaves_the_last_month_to_the_settlement(): void
    {
        $asha = $this->employee('Asha', ['gross_pay' => 30000]);
        $stay = $this->employee('Stays', ['gross_pay' => 20000]);
        foreach (['2026-09', '2026-10'] as $month) {
            $this->attend($asha, $month);
            $this->attend($stay, $month);
        }
        Sanctum::actingAs($this->user('manager'));
        $this->postJson('/api/separations', ['employee_id' => $asha->id, 'type' => 'RESIGNATION', 'applied_on' => '2026-09-20', 'last_working_day' => '2026-10-15'])->assertCreated();
        $this->artisan('hr:relieve-employees');

        $september = $this->postJson('/api/payroll-runs/prepare', ['month' => '2026-09'])->assertOk()->json('data');
        $this->assertSame(2, $september['employees']); // Relieved in October, still paid for September.
        $this->assertEquals(50000, $september['gross']);
        $october = $this->postJson('/api/payroll-runs/prepare', ['month' => '2026-10'])->assertOk()->json('data');
        $this->assertSame(1, $october['employees']); // Asha's October goes into her full and final settlement.
    }

    public function test_full_and_final_settlement_pays_salary_leave_and_gratuity_less_notice_and_loans(): void
    {
        $manager = $this->user('manager');
        $asha = $this->employee('Asha', ['gross_pay' => 31000, 'bank_account_no' => '123'], null, null, '2021-03-01'); // 5 years 7 months by 15 October.
        $this->attend($asha, '2026-10');
        HrLeaveLedger::create(['store_id' => $this->store->id, 'employee_id' => $asha->id, 'leave_type_id' => $this->type('EL'), 'year' => 2026, 'days' => 10, 'kind' => 'ADJUSTMENT']);
        HrLeaveLedger::create(['store_id' => $this->store->id, 'employee_id' => $asha->id, 'leave_type_id' => $this->type('CL'), 'year' => 2026, 'days' => 4, 'kind' => 'ADJUSTMENT']);
        foreach ([['ADVANCE', 5000], ['LOAN', 20000]] as [$type, $amount]) {
            HrLoan::create(['store_id' => $this->store->id, 'employee_id' => $asha->id, 'type' => $type, 'amount' => $amount, 'instalments' => 1, 'instalment_amount' => $amount,
                'first_month' => '2026-10', 'status' => 'ACTIVE', 'disbursed_on' => '2026-09-01', 'pay_mode' => 'CASH']);
        }
        $claim = HrExpenseClaim::create(['store_id' => $this->store->id, 'employee_id' => $asha->id, 'claim_date' => '2026-10-10', 'category' => 'TRAVEL', 'amount' => 500,
            'status' => 'APPROVED', 'pay_via' => 'SALARY']);

        Sanctum::actingAs($manager);
        $separation = $this->postJson('/api/separations', ['employee_id' => $asha->id, 'type' => 'RESIGNATION', 'applied_on' => '2026-10-01', 'last_working_day' => '2026-10-15'])
            ->assertCreated()->assertJsonPath('data.notice_short_days', 16)->json('data.id'); // 30 − 14 days served.
        $this->assertCount(1, $this->getJson('/api/final-settlements')->assertOk()->json('data.waiting'));

        $fnf = $this->postJson('/api/final-settlements/prepare', ['separation_id' => $separation])->assertOk()->json('data');
        $this->assertSame(15.0, (float) $fnf['summary']['payable_days']);
        $this->assertEquals(15000, collect($fnf['earnings'])->whereIn('code', ['BASIC', 'HRA', 'CONV', 'SPECIAL'])->sum('amount')); // 15 of 31 days.
        $this->assertSame(10000.0, $this->line($fnf['earnings'], 'LEAVE_EXIT')); // EL only, 10 × ₹1,000; CL lapses.
        $this->assertSame(6, $fnf['summary']['gratuity_years']);
        $this->assertSame(53653.85, $this->line($fnf['earnings'], 'GRATUITY')); // 15,500 Basic × 15 ÷ 26 × 6.
        $this->assertSame(500.0, $this->line($fnf['earnings'], 'REIMBURSE'));
        $this->assertSame(16000.0, $this->line($fnf['deductions'], 'NOTICE')); // 16 days × ₹1,000.
        $this->assertNull($this->line($fnf['deductions'], 'PT')); // On the ₹15,000 salary only.
        $this->assertSame([5000.0, 20000.0], [$this->line($fnf['deductions'], 'ADVANCE'), $this->line($fnf['deductions'], 'LOAN')]);
        $this->assertEquals(79153.85, $fnf['gross']);
        $this->assertEquals(38154, $fnf['net']);
        $this->assertEquals(0, $fnf['summary']['loan_left']);
        $this->assertArrayNotHasKey('employee', $fnf); // No full employee record in the response.

        // HR waives the notice, pays only 5 EL days, adds a bonus line.
        $fnf = $this->postJson('/api/final-settlements/prepare', ['separation_id' => $separation, 'notice_waived' => true, 'encash_days' => [$this->type('EL') => 5],
            'adjustments' => [['type' => 'EARNING', 'name' => 'Diwali bonus', 'amount' => 1000]]])->assertOk()->json('data');
        $this->assertNull($this->line($fnf['deductions'], 'NOTICE'));
        $this->assertSame(5000.0, $this->line($fnf['earnings'], 'LEAVE_EXIT'));
        $this->assertSame(1000.0, $this->line($fnf['earnings'], 'ADJ_E1'));
        $this->assertEquals(50154, $fnf['net']); // 15,000 + 5,000 + 53,653.85 + 500 + 1,000 − 25,000, rounded.
        $this->postJson('/api/final-settlements/prepare', ['separation_id' => $separation, 'encash_days' => [$this->type('EL') => 11]])->assertUnprocessable(); // Beyond the balance.

        $this->postJson("/api/final-settlements/{$fnf['id']}/submit")->assertOk()->assertJsonPath('data.status', 'SUBMITTED');
        $this->assertSame(['CLOSED', 'CLOSED'], HrLoan::where('employee_id', $asha->id)->orderBy('id')->pluck('status')->all());
        $this->assertSame($fnf['id'], HrExpenseClaim::find($claim->id)->settlement_id);
        $this->assertEquals(5, (float) HrLeaveLedger::where('employee_id', $asha->id)->where('leave_type_id', $this->type('EL'))->sum('days'));
        $this->assertSame('SETTLED', HrSeparation::find($separation)->status);
        $this->assertFalse(Employee::find($asha->id)->is_active); // Relieved on submit.
        $journal = $this->voucher('fnf_settlement', $fnf['id']);
        $this->assertEquals(53653.85, $journal['gratuity']->debit);
        $this->assertEquals(500, $journal['staff_expenses']->debit);
        $this->assertEquals(25000, $journal['staff_advances']->credit);
        $this->assertEquals(50154, $journal['salary_payable']->credit);
        $this->assertArrayNotHasKey('notice_recovery', $journal->all()); // Waived.

        // Reopening gives everything back; submitting again settles it once.
        $this->postJson("/api/final-settlements/{$fnf['id']}/reopen")->assertOk()->assertJsonPath('data.status', 'DRAFT');
        $this->assertFalse(DB::table('vouchers')->where('source_type', 'fnf_settlement')->where('source_id', $fnf['id'])->exists());
        $this->assertSame(['ACTIVE', 'ACTIVE'], HrLoan::where('employee_id', $asha->id)->orderBy('id')->pluck('status')->all());
        $this->assertNull(HrExpenseClaim::find($claim->id)->settlement_id);
        $this->assertEquals(10, (float) HrLeaveLedger::where('employee_id', $asha->id)->where('leave_type_id', $this->type('EL'))->sum('days'));
        $this->postJson("/api/final-settlements/{$fnf['id']}/submit")->assertOk();
        $this->postJson("/api/final-settlements/{$fnf['id']}/mark-paid", ['paid_on' => '2026-10-16', 'pay_mode' => 'BANK'])->assertOk()->assertJsonPath('data.status', 'PAID');
        $this->assertSame('PAID', HrExpenseClaim::find($claim->id)->status);
        $paid = $this->voucher('fnf_payment', $fnf['id']);
        $this->assertEquals(50154, $paid['bank']->credit);
        $this->postJson("/api/final-settlements/{$fnf['id']}/reopen")->assertUnprocessable();
    }

    public function test_loan_recovery_on_exit_never_takes_net_pay_below_zero(): void
    {
        $low = $this->employee('Low pay', ['gross_pay' => 3100]);
        $this->attend($low, '2026-10');
        HrLoan::create(['store_id' => $this->store->id, 'employee_id' => $low->id, 'type' => 'LOAN', 'amount' => 9000, 'instalments' => 3, 'instalment_amount' => 3000,
            'first_month' => '2026-12', 'status' => 'ACTIVE', 'disbursed_on' => '2026-09-01', 'pay_mode' => 'CASH']);
        Sanctum::actingAs($this->user('manager'));
        $separation = $this->postJson('/api/separations', ['employee_id' => $low->id, 'type' => 'TERMINATION', 'last_working_day' => '2026-10-31', 'applied_on' => '2026-10-31'])->json('data.id');
        $fnf = $this->postJson('/api/final-settlements/prepare', ['separation_id' => $separation])->assertOk()->json('data');

        $this->assertSame(3100.0, $this->line($fnf['deductions'], 'LOAN')); // All the pay there is, though no instalment is due yet.
        $this->assertEquals(0, $fnf['net']);
        $this->assertEquals(5900, $fnf['summary']['loan_left']);
    }

    public function test_gratuity_follows_the_act(): void
    {
        $service = app(SettlementService::class);
        $rules = PayrollSetup::DEFAULTS['gratuity'];
        $case = fn (string $joined, string $lastDay, array $details = ['gross_pay' => 31000]) => $service->gratuity(
            $this->employee('G', $details, null, null, $joined), $lastDay, $rules, ($details['salary_mode'] ?? 'Monthly') === 'Daily');

        $this->assertSame([5, 44711.54], array_values(array_intersect_key($case('2021-10-15', '2026-10-14'), ['years' => 0, 'amount' => 0]))); // Exactly 5 years.
        $this->assertSame(5, $case('2022-03-10', '2026-10-09')['years']); // 4 years 7 months counts as 5.
        $this->assertSame(0.0, (float) $case('2022-05-10', '2026-10-09')['amount']); // 4 years 5 months: none.
        $this->assertSame(37500.0, (float) $case('2021-10-15', '2026-10-14', ['gross_pay' => 1000, 'salary_mode' => 'Daily'])['amount']); // ₹500 Basic a day × 15 × 5.
        $this->assertSame(2000000.0, (float) $case('1986-01-01', '2026-10-14', ['gross_pay' => 2000000])['amount']); // The ₹20 lakh cap.
    }

    public function test_exits_and_settlements_stay_inside_the_store_and_payroll_roles(): void
    {
        $asha = $this->employee('Asha', ['gross_pay' => 20000], $cashier = $this->user('cashier'));
        Sanctum::actingAs($this->user('manager'));
        $separation = $this->postJson('/api/separations', ['employee_id' => $asha->id, 'type' => 'RESIGNATION', 'applied_on' => '2026-11-01', 'last_working_day' => '2026-11-04'])->json('data.id');
        $this->postJson('/api/separations', ['employee_id' => $asha->id, 'type' => 'OTHER', 'last_working_day' => '2026-11-04'])->assertUnprocessable(); // Already leaving.
        $this->postJson('/api/final-settlements/prepare', ['separation_id' => $separation])->assertOk();

        Sanctum::actingAs($cashier);
        $this->getJson('/api/separations/mine')->assertOk()->assertJsonCount(1, 'data.separations');
        $this->postJson('/api/final-settlements/prepare', ['separation_id' => $separation])->assertForbidden();
        $this->postJson("/api/separations/{$separation}/relieve")->assertForbidden();

        $elsewhere = Store::create(['name' => 'Elsewhere', 'code' => 'EW-'.Str::random(6)]);
        Sanctum::actingAs($this->user('manager', $elsewhere));
        $this->getJson('/api/separations')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/final-settlements')->assertOk()->assertJsonCount(0, 'data.settlements');
        $this->postJson("/api/separations/{$separation}/relieve")->assertNotFound();
        $this->postJson('/api/final-settlements/prepare', ['separation_id' => $separation])->assertNotFound();
    }
}
