<?php

namespace Tests\Feature\Hr;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrSalaryComponent;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\PayrollCalculator;
use App\Services\Hr\PayrollSetup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PayrollTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-04 10:00', 'Asia/Kolkata')->utc());
        $this->store = Store::create(['name' => 'Payroll store', 'code' => 'PY-'.Str::random(6)]);
        app(PayrollSetup::class)->ensureDefaults($this->store->id);
        app(PayrollSetup::class)->saveSettings($this->store->id, ['pt' => ['state' => 'KA'] + PayrollSetup::PT_PRESETS['KA']]);
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

    private function employee(string $name, array $details, ?User $login = null): Employee
    {
        $employee = Employee::create(['name' => $name, 'code' => strtoupper(Str::random(6)), 'store_id' => $this->store->id, 'is_active' => true,
            'joining_date' => '2025-01-01', 'user_id' => $login?->id]);
        $employee->forceFill(['master_details' => $details])->save();

        return $employee;
    }

    /** Marks the month: PRESENT every day except the given absent days; $extra = [day => worked minutes]. */
    private function attend(Employee $employee, string $month, array $absent = [], array $extra = []): void
    {
        $first = Carbon::parse("{$month}-01");
        for ($d = $first->copy(); $d->month === $first->month; $d->addDay()) {
            Attendance::create(['employee_id' => $employee->id, 'store_id' => $this->store->id, 'date' => $d->toDateString(),
                'status' => in_array($d->day, $absent, true) ? 'ABSENT' : 'PRESENT', 'source' => 'MANUAL',
                'worked_minutes' => $extra[$d->day] ?? 540, 'late_minutes' => 0, 'early_exit_minutes' => 0]);
        }
    }

    private function line(array $lines, string $code): ?float
    {
        $line = collect($lines)->firstWhere('code', $code);

        return $line ? (float) $line['amount'] : null;
    }

    public function test_monthly_salary_is_earned_for_payable_days_and_split_by_the_structure(): void
    {
        $asha = $this->employee('Asha', ['gross_pay' => 30000, 'salary_mode' => 'Monthly', 'pf_uan' => '100200300400']);
        $this->attend($asha, '2026-09', [3, 10, 17]); // 30-day month, 3 days absent.
        $slip = app(PayrollCalculator::class)->slip($asha, '2026-09');

        $this->assertSame([27.0, 3.0], [$slip['payable_days'], $slip['lop_days']]);
        $this->assertSame(27000.0, $slip['gross_earned']);
        $this->assertSame([13500.0, 5400.0, 1600.0, 6500.0], [$this->line($slip['earnings'], 'BASIC'), $this->line($slip['earnings'], 'HRA'),
            $this->line($slip['earnings'], 'CONV'), $this->line($slip['earnings'], 'SPECIAL')]);
        $this->assertSame(1620.0, $this->line($slip['deductions'], 'PF')); // 12% of Basic within the ₹15,000 ceiling.
        $this->assertSame(1620.0, (float) $slip['employer_pf']);
        $this->assertNull($this->line($slip['deductions'], 'ESI')); // Gross above ₹21,000.
        $this->assertSame(200.0, $this->line($slip['deductions'], 'PT')); // Karnataka, ₹25,000 and above.
        $this->assertEquals(25180, $slip['net_pay']);

        $this->attend($asha, '2026-10'); // 31 days, all worked.
        $this->assertSame(30000.0, app(PayrollCalculator::class)->slip($asha, '2026-10')['gross_earned']);
    }

    public function test_daily_wages_with_overtime_incentive_batta_and_esi(): void
    {
        $setup = app(PayrollSetup::class);
        $setup->saveSettings($this->store->id, ['pt' => ['state' => 'NONE', 'frequency' => 'monthly', 'months' => [], 'slabs' => []],
            'ot' => ['multiplier' => 1.5, 'hours_per_day' => 8, 'requires_approval' => false], 'batta' => ['per_day' => 50]]);
        $ravi = $this->employee('Ravi', ['gross_pay' => 600, 'salary_mode' => 'Daily', 'e_ot' => true, 'beta' => true, 'incentive_pct' => 2, 'esi_no' => '31-00-123']);
        $this->attend($ravi, '2026-09', range(1, 10), [15 => 660, 16 => 660]); // 20 days worked, 2 of them 2h beyond the 9h shift.
        $product = Product::create(['name' => 'Shirt', 'code' => 'SH1', 'company_id' => $this->store->id]);
        $sale = DB::table('pos_sales')->insertGetId(['store_id' => $this->store->id, 'user_id' => $this->user('cashier')->id, 'invoice_no' => 'B1', 'sale_date' => '2026-09-12 11:00:00', 'status' => 'PAID']);
        DB::table('pos_sale_items')->insert(['pos_sale_id' => $sale, 'product_id' => $product->id, 'quantity' => 1, 'subtotal' => 10000, 'sales_man_id' => $ravi->id]);

        $slip = app(PayrollCalculator::class)->slip($ravi, '2026-09');
        $this->assertSame(12000.0, (float) collect($slip['earnings'])->whereIn('code', ['BASIC', 'HRA', 'CONV', 'SPECIAL'])->sum('amount')); // 20 × ₹600.
        $this->assertSame(450.0, $this->line($slip['earnings'], 'OT')); // 4h × (600 ÷ 8) × 1.5.
        $this->assertSame(200.0, $this->line($slip['earnings'], 'INCENTIVE')); // 2% of ₹10,000.
        $this->assertSame(1000.0, $this->line($slip['earnings'], 'BATTA')); // 20 × ₹50.
        $this->assertSame(13650.0, $slip['gross_earned']);
        $this->assertSame(103.0, $this->line($slip['deductions'], 'ESI')); // 0.75%, rounded up.
        $this->assertSame(444.0, (float) $slip['employer_esi']); // 3.25%, rounded up.
        $this->assertNull($this->line($slip['deductions'], 'PF')); // No PF number or date.
    }

    public function test_professional_tax_by_state_and_pf_rules(): void
    {
        $calc = app(PayrollCalculator::class);
        $ka = PayrollSetup::PT_PRESETS['KA'];
        $this->assertSame(200.0, $calc->professionalTax($ka, 30000, 11));
        $this->assertSame(300.0, $calc->professionalTax($ka, 30000, 2)); // February.
        $this->assertSame(0.0, $calc->professionalTax($ka, 20000, 11));
        $tn = PayrollSetup::PT_PRESETS['TN'];
        $this->assertSame(0.0, $calc->professionalTax($tn, 12000, 11)); // Not a deduction month.
        $this->assertSame(1250.0, $calc->professionalTax($tn, 15000, 9)); // ₹90,000 for the half year.
        $this->assertSame(425.0, $calc->professionalTax($tn, 6000, 3)); // ₹36,000.

        $high = $this->employee('High', ['gross_pay' => 60000, 'pf_eligible_date' => '2025-04-01']);
        $late = $this->employee('Joins PF later', ['gross_pay' => 60000, 'pf_eligible_date' => '2026-12-01']);
        $this->attend($high, '2026-09');
        $this->attend($late, '2026-09');
        $this->assertSame(1800.0, $this->line($calc->slip($high, '2026-09')['deductions'], 'PF')); // Capped: 12% of ₹15,000.
        app(PayrollSetup::class)->saveSettings($this->store->id, ['pf' => ['cap_wages' => false], 'pt' => PayrollSetup::PT_PRESETS['KA'] + ['state' => 'KA']]);
        $this->assertSame(3600.0, $this->line($calc->slip($high, '2026-09')['deductions'], 'PF')); // 12% of the full ₹30,000 Basic.
        $this->assertNull($this->line($calc->slip($late, '2026-09')['deductions'], 'PF'));
    }

    public function test_a_run_is_posted_on_submit_paid_without_held_salaries_and_reopened_before_payment(): void
    {
        $asha = $this->employee('Asha', ['gross_pay' => 30000, 'pf_uan' => '100200300400']);
        $held = $this->employee('On hold', ['gross_pay' => 20000, 'hold_salary' => true]);
        $this->attend($asha, '2026-09');
        $this->attend($held, '2026-09');
        Sanctum::actingAs($manager = $this->user('manager'));
        $bonus = HrSalaryComponent::where('store_id', $this->store->id)->where('code', 'BONUS')->value('id');
        $this->postJson('/api/payroll/additional', ['employee_id' => $asha->id, 'component_id' => $bonus, 'month' => '2026-09', 'amount' => 1000])->assertCreated();

        $run = $this->postJson('/api/payroll-runs/prepare', ['month' => '2026-09'])->assertOk()->assertJsonPath('data.employees', 2)->json('data');
        $this->assertEquals(51000, $run['gross']); // 30,000 + 1,000 bonus + 20,000.
        $this->postJson('/api/payroll-runs/prepare', ['month' => '2026-12'])->assertUnprocessable(); // Future.
        $this->postJson("/api/payroll-runs/{$run['id']}/submit")->assertOk()->assertJsonPath('data.status', 'SUBMITTED');
        $this->postJson('/api/payroll/additional', ['employee_id' => $asha->id, 'component_id' => $bonus, 'month' => '2026-09', 'amount' => 5])->assertUnprocessable();

        $voucher = DB::table('vouchers')->where('source_type', 'payroll')->where('source_id', $run['id'])->first();
        $lines = DB::table('voucher_lines')->where('voucher_id', $voucher->id)->join('ledger_accounts as l', 'l.id', '=', 'voucher_lines.ledger_account_id')
            ->get(['l.system_key', 'voucher_lines.debit', 'voucher_lines.credit'])->keyBy('system_key');
        $this->assertEquals($lines->sum('debit'), $lines->sum('credit'));
        $this->assertEquals(51000, $lines['salaries']->debit);
        $this->assertEquals(1800 * 2, $lines['pf_payable']->credit); // Employee + employer, capped wages.
        $this->assertEquals(200 + 0, $lines['pt_payable']->credit); // Asha only (held employee is under ₹25,000).
        $this->assertSame('2026-09-30', $voucher->voucher_date);

        $this->postJson("/api/payroll-runs/{$run['id']}/mark-paid", ['paid_on' => '2026-10-01', 'pay_mode' => 'BANK'])->assertOk();
        $payment = DB::table('vouchers')->where('source_type', 'payroll_payment')->where('source_id', $run['id'])->first();
        $ashaNet = DB::table('hr_payslips')->where('run_id', $run['id'])->where('employee_id', $asha->id)->value('net_pay');
        $this->assertEquals($ashaNet, $payment->amount); // The held salary stays owed.
        $this->postJson("/api/payroll-runs/{$run['id']}/reopen")->assertUnprocessable();

        // A submitted (unpaid) run reopens and its voucher goes.
        $this->attend($asha, '2026-10');
        $october = $this->postJson('/api/payroll-runs/prepare', ['month' => '2026-10'])->json('data.id');
        $this->postJson("/api/payroll-runs/{$october}/submit")->assertOk();
        $this->assertTrue(DB::table('vouchers')->where('source_type', 'payroll')->where('source_id', $october)->exists());
        $this->postJson("/api/payroll-runs/{$october}/reopen")->assertOk()->assertJsonPath('data.status', 'DRAFT');
        $this->assertFalse(DB::table('vouchers')->where('source_type', 'payroll')->where('source_id', $october)->exists());
    }

    public function test_staff_see_only_their_own_submitted_payslips(): void
    {
        $login = $this->user('cashier');
        $mine = $this->employee('Asha', ['gross_pay' => 18000], $login);
        $other = $this->employee('Ravi', ['gross_pay' => 25000]);
        $this->attend($mine, '2026-09');
        $this->attend($other, '2026-09');
        Sanctum::actingAs($this->user('manager'));
        $run = $this->postJson('/api/payroll-runs/prepare', ['month' => '2026-09'])->json('data.id');
        $slips = DB::table('hr_payslips')->where('run_id', $run)->pluck('id', 'employee_id');

        Sanctum::actingAs($login);
        $this->getJson('/api/my-payslips')->assertOk()->assertJsonCount(0, 'data.payslips'); // Still a draft.
        $this->getJson('/api/payroll-runs')->assertForbidden();
        $this->getJson("/api/payslips/{$slips[$other->id]}")->assertForbidden();

        Sanctum::actingAs($this->user('manager'));
        $this->postJson("/api/payroll-runs/{$run}/submit")->assertOk();
        Sanctum::actingAs($login);
        $this->getJson('/api/my-payslips')->assertOk()->assertJsonCount(1, 'data.payslips')->assertJsonPath('data.payslips.0.month', '2026-09');
        $this->getJson("/api/my-payslips/{$slips[$mine->id]}")->assertOk()->assertJsonPath('data.snapshot.name', 'Asha')->assertJsonPath('data.month_label', 'September 2026');
        $this->getJson("/api/my-payslips/{$slips[$other->id]}")->assertNotFound();
        $this->assertDatabaseHas('app_notifications', ['type' => 'PAYSLIP', 'user_id' => $login->id]);

        $otherStore = Store::create(['name' => 'Other', 'code' => 'OT-'.Str::random(6)]);
        Sanctum::actingAs(User::factory()->create(['username' => 'mgr-'.Str::random(6), 'role' => 'manager', 'store_id' => $otherStore->id]));
        $this->getJson('/api/payroll-runs')->assertOk()->assertJsonCount(0, 'data');
    }
}
