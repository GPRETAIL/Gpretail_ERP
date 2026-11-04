<?php

namespace Tests\Feature\Hr;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrExpenseClaim;
use App\Models\HrLeaveLedger;
use App\Models\HrLeaveType;
use App\Models\HrLoan;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\PayrollCalculator;
use App\Services\Hr\PayrollSetup;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffMoneyTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-04 10:00', 'Asia/Kolkata')->utc());
        // The real private disk in a scratch folder, so bill links are genuinely signed.
        config(['filesystems.disks.local.root' => $root = storage_path('framework/testing/disks/expense-claims')]);
        (new Filesystem)->cleanDirectory($root);
        Storage::forgetDisk('local');
        $this->store = Store::create(['name' => 'Money store', 'code' => 'MN-'.Str::random(6)]);
        app(PayrollSetup::class)->ensureDefaults($this->store->id);
        app(PayrollSetup::class)->saveSettings($this->store->id, ['pt' => ['state' => 'KA'] + PayrollSetup::PT_PRESETS['KA']]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function user(string $role, ?Store $store = null): User
    {
        return User::factory()->create(['username' => "{$role}-".Str::random(8), 'role' => $role, 'store_id' => ($store ?? $this->store)->id]);
    }

    private function employee(string $name, array $details, ?User $login = null, ?Employee $reportsTo = null): Employee
    {
        $employee = Employee::create(['name' => $name, 'code' => strtoupper(Str::random(6)), 'store_id' => $this->store->id, 'is_active' => true,
            'joining_date' => '2025-01-01', 'user_id' => $login?->id, 'reports_to_id' => $reportsTo?->id]);
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

    /** @return \Illuminate\Support\Collection<string, object> voucher lines keyed by ledger system key */
    private function voucher(string $source, int $id)
    {
        $voucher = DB::table('vouchers')->where('source_type', $source)->where('source_id', $id)->first();
        $this->assertNotNull($voucher, "{$source} #{$id} voucher");
        $lines = DB::table('voucher_lines')->where('voucher_id', $voucher->id)->join('ledger_accounts as l', 'l.id', '=', 'voucher_lines.ledger_account_id')
            ->get(['l.system_key', 'voucher_lines.debit', 'voucher_lines.credit']);
        $this->assertEqualsWithDelta($lines->sum('debit'), $lines->sum('credit'), 0.001, "{$source} voucher balances");

        return $lines->keyBy('system_key');
    }

    private function slip(int $runId, Employee $employee): object
    {
        $slip = DB::table('hr_payslips')->where('run_id', $runId)->where('employee_id', $employee->id)->first();
        $slip->earnings = json_decode($slip->earnings, true);
        $slip->deductions = json_decode($slip->deductions, true);

        return $slip;
    }

    public function test_an_advance_is_requested_approved_paid_out_and_recovered_from_salary(): void
    {
        $managerLogin = $this->user('manager');
        $boss = $this->employee('Boss', ['gross_pay' => 50000], $managerLogin);
        $ravi = $this->employee('Ravi', ['gross_pay' => 30000], $cashier = $this->user('cashier'), $boss);

        Sanctum::actingAs($cashier);
        $loan = $this->postJson('/api/staff-loans', ['type' => 'ADVANCE', 'amount' => 2000, 'reason' => 'School fees'])
            ->assertCreated()->assertJsonPath('data.status', 'REQUESTED')->json('data');
        $this->assertSame($managerLogin->id, $loan['approver_user_id']);
        $this->assertSame(1, $loan['instalments']);
        $this->assertTrue(DB::table('app_notifications')->where('user_id', $managerLogin->id)->where('type', 'MONEY_REQUEST')->exists());
        $this->postJson("/api/staff-loans/{$loan['id']}/decide", ['action' => 'approve'])->assertForbidden(); // Not an approver.
        $this->getJson('/api/staff-money/mine')->assertOk()->assertJsonPath('data.loans.0.balance', 2000);

        Sanctum::actingAs($managerLogin);
        $this->postJson("/api/staff-loans/{$loan['id']}/disburse", ['paid_on' => '2026-10-05', 'pay_mode' => 'CASH'])->assertUnprocessable(); // Not approved yet.
        $this->postJson("/api/staff-loans/{$loan['id']}/decide", ['action' => 'approve'])->assertOk()->assertJsonPath('data.status', 'APPROVED');
        $this->assertTrue(DB::table('app_notifications')->where('user_id', $cashier->id)->where('type', 'MONEY_DECIDED')->exists());
        $this->postJson("/api/staff-loans/{$loan['id']}/disburse", ['paid_on' => '2026-10-05', 'pay_mode' => 'CASH', 'first_month' => '2026-10'])
            ->assertOk()->assertJsonPath('data.status', 'ACTIVE');
        $paid = $this->voucher('staff_loan', $loan['id']);
        $this->assertEquals(2000, $paid['staff_advances']->debit);
        $this->assertEquals(2000, $paid['cash']->credit);

        $this->attend($ravi, '2026-10');
        $this->attend($boss, '2026-10');
        $run = $this->postJson('/api/payroll-runs/prepare', ['month' => '2026-10'])->assertOk()->json('data.id');
        $slip = $this->slip($run, $ravi);
        $this->assertSame(2000.0, $this->line($slip->deductions, 'ADVANCE'));
        $this->assertEquals(30000 - 200 - 2000, $slip->net_pay); // Karnataka PT ₹200.
        $this->assertSame('ACTIVE', HrLoan::find($loan['id'])->status); // Nothing is recovered until submit.

        $this->postJson("/api/payroll-runs/{$run}/submit")->assertOk();
        $this->assertSame('CLOSED', HrLoan::find($loan['id'])->status);
        $this->assertSame(1, DB::table('hr_loan_recoveries')->where('loan_id', $loan['id'])->where('kind', 'PAYROLL')->count());
        $this->assertEquals(2000, $this->voucher('payroll', $run)['staff_advances']->credit);

        // Reopening puts the advance back as owed; submitting again recovers it once.
        $this->postJson("/api/payroll-runs/{$run}/reopen")->assertOk();
        $this->assertSame('ACTIVE', HrLoan::find($loan['id'])->status);
        $this->assertSame(0, DB::table('hr_loan_recoveries')->where('loan_id', $loan['id'])->count());
        $this->postJson('/api/payroll-runs/prepare', ['month' => '2026-10'])->assertOk();
        $this->postJson("/api/payroll-runs/{$run}/submit")->assertOk();
        $this->assertSame('CLOSED', HrLoan::find($loan['id'])->status);
        $this->assertSame(1, DB::table('hr_loan_recoveries')->where('loan_id', $loan['id'])->count());
    }

    public function test_a_loan_is_recovered_in_instalments_skipping_a_month_and_repaid_by_hand(): void
    {
        $priya = $this->employee('Priya', ['gross_pay' => 20000]);
        Sanctum::actingAs($this->user('manager'));
        $loan = $this->postJson('/api/staff-loans', ['employee_id' => $priya->id, 'type' => 'LOAN', 'amount' => 10000, 'instalments' => 3])
            ->assertCreated()->json('data');
        $this->assertEquals(3333.34, $loan['instalment_amount']);
        $this->postJson("/api/staff-loans/{$loan['id']}/decide", ['action' => 'approve'])->assertOk();
        $this->postJson("/api/staff-loans/{$loan['id']}/disburse", ['paid_on' => '2026-07-31', 'pay_mode' => 'BANK', 'first_month' => '2026-08'])->assertOk();
        $this->assertEquals(10000, $this->voucher('staff_loan', $loan['id'])['bank']->credit);
        $this->postJson("/api/staff-loans/{$loan['id']}/skip-month", ['month' => '2026-09'])->assertOk();

        $recovered = [];
        foreach (['2026-08', '2026-09', '2026-10'] as $month) {
            $this->attend($priya, $month);
            $run = $this->postJson('/api/payroll-runs/prepare', ['month' => $month])->assertOk()->json('data.id');
            $recovered[$month] = $this->line($this->slip($run, $priya)->deductions, 'LOAN');
            $this->postJson("/api/payroll-runs/{$run}/submit")->assertOk();
        }
        $this->assertSame(['2026-08' => 3333.34, '2026-09' => null, '2026-10' => 3333.34], $recovered);
        $this->getJson('/api/staff-loans')->assertOk()->assertJsonPath('data.0.balance', 3333.32);
        $this->postJson("/api/staff-loans/{$loan['id']}/skip-month", ['month' => '2026-10'])->assertUnprocessable(); // Already recovered.

        $this->postJson("/api/staff-loans/{$loan['id']}/repay", ['amount' => 5000, 'paid_on' => '2026-11-02', 'pay_mode' => 'CASH'])->assertUnprocessable();
        $this->postJson("/api/staff-loans/{$loan['id']}/repay", ['amount' => 3333.32, 'paid_on' => '2026-11-02', 'pay_mode' => 'CASH'])
            ->assertOk()->assertJsonPath('data.status', 'CLOSED')->assertJsonPath('data.balance', 0);
        $manual = DB::table('hr_loan_recoveries')->where('loan_id', $loan['id'])->where('kind', 'MANUAL')->value('id');
        $repaid = $this->voucher('staff_loan_repayment', $manual);
        $this->assertEquals(3333.32, $repaid['cash']->debit);
        $this->assertEquals(3333.32, $repaid['staff_advances']->credit);
        $this->assertCount(3, $this->getJson("/api/staff-loans/{$loan['id']}/recoveries")->assertOk()->json('data'));
    }

    public function test_recovery_never_takes_net_pay_below_zero(): void
    {
        $low = $this->employee('Low pay', ['gross_pay' => 3000]);
        HrLoan::create(['store_id' => $this->store->id, 'employee_id' => $low->id, 'type' => 'ADVANCE', 'amount' => 5000, 'instalments' => 1,
            'instalment_amount' => 5000, 'first_month' => '2026-10', 'status' => 'ACTIVE', 'disbursed_on' => '2026-10-01', 'pay_mode' => 'CASH']);
        $this->attend($low, '2026-10');
        $slip = app(PayrollCalculator::class)->slip($low, '2026-10');

        $this->assertSame(3000.0, $this->line($slip['deductions'], 'ADVANCE'));
        $this->assertEquals(0, $slip['net_pay']);
    }

    public function test_expense_claims_with_a_bill_are_paid_with_salary_or_directly_outside_the_statutory_base(): void
    {
        $managerLogin = $this->user('manager');
        $boss = $this->employee('Boss', ['gross_pay' => 50000], $managerLogin);
        $ravi = $this->employee('Ravi', ['gross_pay' => 20000, 'esi_no' => '31-00-123'], $cashier = $this->user('cashier'), $boss);
        $outsider = $this->employee('Other', ['gross_pay' => 15000], $other = $this->user('cashier'));

        Sanctum::actingAs($cashier);
        $travel = $this->post('/api/expense-claims', ['claim_date' => '2026-10-10', 'category' => 'TRAVEL', 'amount' => 500, 'description' => 'Bus to supplier',
            'bill' => UploadedFile::fake()->image('bill.jpg')], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.has_bill', true)->json('data');
        $this->assertArrayNotHasKey('bill_path', $travel);
        Storage::disk('local')->assertExists(HrExpenseClaim::find($travel['id'])->bill_path);
        $food = $this->postJson('/api/expense-claims', ['claim_date' => '2026-10-12', 'category' => 'FOOD', 'amount' => 300])->assertCreated()->json('data');
        $this->postJson('/api/expense-claims', ['claim_date' => '2026-11-30', 'category' => 'FOOD', 'amount' => 10])->assertUnprocessable(); // Future date.
        $this->assertStringContainsString('signature=', $this->getJson("/api/expense-claims/{$travel['id']}/bill")->assertOk()->json('data.url'));

        Sanctum::actingAs($other);
        $this->getJson("/api/expense-claims/{$travel['id']}/bill")->assertNotFound(); // Not their claim or team.

        Sanctum::actingAs($managerLogin);
        $this->assertStringContainsString('signature=', $this->getJson("/api/expense-claims/{$travel['id']}/bill")->assertOk()->json('data.url'));
        $own = $this->postJson('/api/expense-claims', ['claim_date' => '2026-10-11', 'category' => 'PHONE', 'amount' => 200])->assertCreated()->json('data');
        $this->postJson("/api/expense-claims/{$own['id']}/decide", ['action' => 'approve'])->assertUnprocessable(); // Never your own.
        $inbox = collect($this->getJson('/api/expense-claims?inbox=1&status=PENDING')->assertOk()->json('data'))->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$travel['id'], $food['id']], $inbox);

        $this->postJson("/api/expense-claims/{$travel['id']}/decide", ['action' => 'approve'])->assertOk()->assertJsonPath('data.pay_via', 'SALARY');
        $this->postJson("/api/expense-claims/{$food['id']}/decide", ['action' => 'approve', 'pay_via' => 'DIRECT'])->assertOk();
        $this->postJson("/api/expense-claims/{$food['id']}/pay", ['paid_on' => '2026-10-15', 'pay_mode' => 'CASH'])->assertOk()->assertJsonPath('data.status', 'PAID');
        $direct = $this->voucher('expense_claim', $food['id']);
        $this->assertEquals(300, $direct['staff_expenses']->debit);
        $this->assertEquals(300, $direct['cash']->credit);
        $this->postJson("/api/expense-claims/{$travel['id']}/decide", ['action' => 'reject'])->assertUnprocessable(); // Already decided.

        // The salary claim rides the October payroll: ESI and PT are worked out on the salary alone.
        $this->attend($ravi, '2026-10');
        $run = $this->postJson('/api/payroll-runs/prepare', ['month' => '2026-10'])->assertOk()->json('data.id');
        $slip = $this->slip($run, $ravi);
        $this->assertSame(500.0, $this->line($slip->earnings, 'REIMBURSE'));
        $this->assertEquals(20500, $slip->gross_earned);
        $this->assertSame(150.0, $this->line($slip->deductions, 'ESI')); // 0.75% of ₹20,000, not ₹20,500.
        $this->assertNull($this->line($slip->deductions, 'PT')); // Below the Karnataka slab.
        $this->assertNull($this->line($this->slip($run, $outsider)->earnings, 'REIMBURSE'));

        $this->postJson("/api/payroll-runs/{$run}/submit")->assertOk();
        $this->assertNotNull(HrExpenseClaim::find($travel['id'])->payslip_id);
        $this->assertEquals(500, $this->voucher('payroll', $run)['staff_expenses']->debit);
        $this->postJson("/api/payroll-runs/{$run}/reopen")->assertOk();
        $this->assertNull(HrExpenseClaim::find($travel['id'])->payslip_id);
        $this->postJson("/api/payroll-runs/{$run}/submit")->assertOk();
        $this->postJson("/api/payroll-runs/{$run}/mark-paid", ['paid_on' => '2026-11-01', 'pay_mode' => 'BANK'])->assertOk();
        $this->assertSame('PAID', HrExpenseClaim::find($travel['id'])->status);

        // The November payroll does not pay it again.
        $this->attend($ravi, '2026-11');
        $this->assertNull($this->line(app(PayrollCalculator::class)->slip($ravi->refresh(), '2026-11')['earnings'], 'REIMBURSE'));
    }

    public function test_leave_encashment_takes_days_off_the_balance_and_pays_them_at_the_day_rate(): void
    {
        $asha = $this->employee('Asha', ['gross_pay' => 31000]);
        Sanctum::actingAs($this->user('manager'));
        app(\App\Services\Hr\LeaveService::class)->ensureDefaults($this->store->id);
        $el = HrLeaveType::where('store_id', $this->store->id)->where('code', 'EL')->value('id');
        $lop = HrLeaveType::where('store_id', $this->store->id)->where('code', 'LOP')->value('id');
        HrLeaveLedger::create(['store_id' => $this->store->id, 'employee_id' => $asha->id, 'leave_type_id' => $el, 'year' => 2026, 'days' => 10, 'kind' => 'ADJUSTMENT']);
        $balance = fn () => (float) HrLeaveLedger::where('employee_id', $asha->id)->where('leave_type_id', $el)->where('year', 2026)->sum('days');

        $this->postJson('/api/leave-encashments', ['employee_id' => $asha->id, 'leave_type_id' => $el, 'days' => 11, 'month' => '2026-10'])->assertUnprocessable();
        $this->postJson('/api/leave-encashments', ['employee_id' => $asha->id, 'leave_type_id' => $lop, 'days' => 1, 'month' => '2026-10'])->assertUnprocessable();
        $encashment = $this->postJson('/api/leave-encashments', ['employee_id' => $asha->id, 'leave_type_id' => $el, 'days' => 2, 'month' => '2026-10'])
            ->assertCreated()->json('data');
        $spare = $this->postJson('/api/leave-encashments', ['employee_id' => $asha->id, 'leave_type_id' => $el, 'days' => 1, 'month' => '2026-10'])->json('data');
        $this->assertSame(7.0, $balance());
        $this->postJson("/api/leave-encashments/{$spare['id']}/cancel")->assertOk();
        $this->assertSame(8.0, $balance());

        $this->attend($asha, '2026-10');
        $run = $this->postJson('/api/payroll-runs/prepare', ['month' => '2026-10'])->assertOk()->json('data.id');
        $slip = $this->slip($run, $asha);
        $this->assertSame(2000.0, $this->line($slip->earnings, 'ENCASH')); // 2 × (₹31,000 ÷ 31 days).
        $this->assertSame(200.0, $this->line($slip->deductions, 'PT')); // On the ₹31,000 salary.
        $this->postJson("/api/payroll-runs/{$run}/submit")->assertOk();
        $this->postJson("/api/leave-encashments/{$encashment['id']}/cancel")->assertUnprocessable(); // Already in a submitted payroll.
        $this->assertEquals(2000, DB::table('hr_leave_encashments')->where('id', $encashment['id'])->value('amount'));
        $this->postJson("/api/payroll-runs/{$run}/mark-paid", ['paid_on' => '2026-11-01', 'pay_mode' => 'BANK'])->assertOk();
        $this->assertSame('PAID', DB::table('hr_leave_encashments')->where('id', $encashment['id'])->value('status'));
        $this->assertEquals(33000, $this->voucher('payroll', $run)['salaries']->debit); // Encashment is a salary cost.
    }

    public function test_staff_see_only_their_own_money_and_stores_stay_apart(): void
    {
        $boss = $this->employee('Boss', ['gross_pay' => 50000], $managerLogin = $this->user('manager'));
        $ravi = $this->employee('Ravi', ['gross_pay' => 20000], $cashier = $this->user('cashier'), $boss);
        $this->employee('Mani', ['gross_pay' => 20000], $other = $this->user('cashier'), $boss);

        Sanctum::actingAs($other);
        $theirs = $this->postJson('/api/staff-loans', ['type' => 'ADVANCE', 'amount' => 1000])->assertCreated()->json('data.id');
        $this->postJson('/api/expense-claims', ['claim_date' => '2026-10-10', 'category' => 'FUEL', 'amount' => 100])->assertCreated();

        Sanctum::actingAs($cashier);
        $this->getJson('/api/staff-money/mine')->assertOk()->assertJsonCount(0, 'data.loans')->assertJsonCount(0, 'data.claims');
        $this->postJson("/api/staff-loans/{$theirs}/cancel")->assertUnprocessable();
        $this->postJson('/api/staff-loans', ['employee_id' => $boss->id, 'type' => 'ADVANCE', 'amount' => 1000])->assertUnprocessable(); // Only for yourself.
        $this->postJson('/api/staff-loans/'.$theirs.'/disburse', ['paid_on' => '2026-10-05', 'pay_mode' => 'CASH'])->assertForbidden();

        Sanctum::actingAs($other);
        $this->postJson("/api/staff-loans/{$theirs}/cancel")->assertOk();
        $this->assertSame('CANCELLED', HrLoan::find($theirs)->status);

        // A login without an employee record is told so.
        Sanctum::actingAs($this->user('cashier'));
        $this->postJson('/api/expense-claims', ['claim_date' => '2026-10-10', 'category' => 'FUEL', 'amount' => 100])->assertUnprocessable()->assertJsonValidationErrors('employee_id');

        // Another store's manager sees none of it.
        $elsewhere = Store::create(['name' => 'Elsewhere', 'code' => 'EW-'.Str::random(6)]);
        Sanctum::actingAs($this->user('manager', $elsewhere));
        $this->getJson('/api/staff-loans')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/expense-claims')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson("/api/staff-loans/{$theirs}/decide", ['action' => 'approve'])->assertNotFound();
        $this->assertSame(0, HrLoan::withoutGlobalScopes()->where('employee_id', $ravi->id)->count());
    }
}
