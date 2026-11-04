<?php

namespace Tests\Feature\Hr;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrTaxDeclaration;
use App\Models\HrTaxDeclarationItem;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\LeaveService;
use App\Services\Hr\PayrollCalculator;
use App\Services\Hr\PayrollSetup;
use App\Services\Hr\TaxCalculator;
use App\Services\Hr\TdsService;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TdsTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-04 10:00', 'Asia/Kolkata')->utc());
        config(['filesystems.disks.local.root' => $root = storage_path('framework/testing/disks/tax-proofs')]);
        (new Filesystem)->cleanDirectory($root);
        Storage::forgetDisk('local');
        $this->store = Store::create(['name' => 'Tax store', 'code' => 'TX-'.Str::random(6)]);
        app(PayrollSetup::class)->ensureDefaults($this->store->id);
        app(PayrollSetup::class)->saveSettings($this->store->id, ['pt' => ['state' => 'NONE'] + PayrollSetup::PT_PRESETS['NONE']]);
        app(LeaveService::class)->ensureDefaults($this->store->id);
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

    private function employee(string $name, array $details, ?User $login = null, string $joined = '2020-01-01'): Employee
    {
        $employee = Employee::create(['name' => $name, 'code' => strtoupper(Str::random(6)), 'store_id' => $this->store->id, 'is_active' => true,
            'joining_date' => $joined, 'user_id' => $login?->id]);
        $employee->forceFill(['master_details' => $details + ['pan_number' => 'ABCDE1234F']])->save();

        return $employee->refresh();
    }

    private function attend(Employee $employee, string $month): void
    {
        $first = Carbon::parse("{$month}-01");
        for ($d = $first->copy(); $d->month === $first->month; $d->addDay()) {
            Attendance::create(['employee_id' => $employee->id, 'store_id' => $this->store->id, 'date' => $d->toDateString(), 'status' => 'PRESENT',
                'source' => 'MANUAL', 'worked_minutes' => 540, 'late_minutes' => 0, 'early_exit_minutes' => 0]);
        }
    }

    private function runMonth(string $month, array $employees, bool $submit = true): int
    {
        foreach ($employees as $employee) {
            $this->attend($employee, $month);
        }
        $run = $this->postJson('/api/payroll-runs/prepare', ['month' => $month])->assertOk()->json('data.id');
        $submit && $this->postJson("/api/payroll-runs/{$run}/submit")->assertOk();

        return $run;
    }

    private function tdsOn(int $run, Employee $employee): float
    {
        $deductions = json_decode(DB::table('hr_payslips')->where('run_id', $run)->where('employee_id', $employee->id)->value('deductions'), true);

        return (float) (collect($deductions)->firstWhere('code', 'TDS')['amount'] ?? 0);
    }

    private function declare(Employee $employee, string $regime, array $items, string $fy = '2026-27'): HrTaxDeclaration
    {
        $declaration = HrTaxDeclaration::create(['store_id' => $this->store->id, 'employee_id' => $employee->id, 'fy' => $fy, 'regime' => $regime]);
        foreach ($items as $item) {
            HrTaxDeclarationItem::create(['store_id' => $this->store->id, 'declaration_id' => $declaration->id] + $item);
        }

        return $declaration;
    }

    /** A full month's lines at the employee's pay, with PF and PT as the month's deductions. */
    private function project(Employee $employee, string $month, array $deductions = [], bool $final = false): array
    {
        $lines = app(PayrollCalculator::class)->fullMonth($employee, $month);

        return app(TdsService::class)->projection($employee, $month, ['earnings' => $lines, 'deductions' => $deductions], $lines, $final);
    }

    public function test_the_tax_follows_the_slabs_rebate_surcharge_and_cess(): void
    {
        $tax = app(TaxCalculator::class);
        $new = PayrollSetup::TAX['new'];
        $old = PayrollSetup::TAX['old'];

        $this->assertSame(0.0, (float) $tax->annualTax($new, 1200000)['total']); // Rebate up to ₹12 lakh.
        $this->assertSame(52000.0, (float) $tax->annualTax($new, 1250000)['total']); // Marginal relief: ₹50,000 + 4% cess.
        $this->assertSame(75400.0, (float) $tax->annualTax($old, 800000)['total']); // ₹10L less ₹1.5L 80C and ₹50,000.
        $this->assertSame(0.0, (float) $tax->annualTax($old, 500000)['total']);
        $this->assertSame(1578720.0, (float) $tax->annualTax($new, 6000000)['total']); // 10% surcharge above ₹50L.
        $this->assertSame(1133600.0, (float) $tax->annualTax($new, 5010000)['total']); // Surcharge relief just above ₹50L.
    }

    public function test_monthly_tds_spreads_the_years_tax_and_follows_a_pay_rise(): void
    {
        $manager = $this->employee('Manager', ['gross_pay' => 150000]);
        Sanctum::actingAs($this->user('manager'));

        $april = $this->runMonth('2026-04', [$manager]);
        $this->assertSame(12567.0, $this->tdsOn($april, $manager)); // ₹18L − ₹75,000 → ₹1,50,800 tax ÷ 12.
        $snapshot = json_decode(DB::table('hr_payslips')->where('run_id', $april)->value('snapshot'), true);
        $this->assertSame(['NEW', 1725000], [$snapshot['tax']['regime'], (int) $snapshot['tax']['taxable']]);
        $voucher = DB::table('vouchers')->where('source_type', 'payroll')->where('source_id', $april)->value('id');
        $this->assertEquals(12567, DB::table('voucher_lines')->where('voucher_id', $voucher)
            ->join('ledger_accounts as l', 'l.id', '=', 'voucher_lines.ledger_account_id')->where('l.system_key', 'tds_payable')->value('credit'));

        $may = $this->runMonth('2026-05', [$manager]);
        $this->assertSame(12567.0, $this->tdsOn($may, $manager));

        $manager->forceFill(['master_details' => ['gross_pay' => 200000] + $manager->master_details])->save();
        $june = $this->runMonth('2026-06', [$manager->refresh()]);
        $this->assertSame(24137.0, $this->tdsOn($june, $manager)); // ₹23L year → ₹2,66,500, less ₹25,134 so far, ÷ 10.

        $march = $this->project($manager, '2027-03');
        $this->assertSame(1, $march['months_left']); // March takes whatever is left.
        $this->assertEquals(max(0, $march['tax']['total'] - $march['tds_deducted']), $march['tds_month']);
    }

    public function test_old_regime_counts_hra_pf_and_declared_savings(): void
    {
        $asha = $this->employee('Asha', ['gross_pay' => 100000]);
        $this->declare($asha, 'OLD', [
            ['section' => '80C', 'declared_amount' => 100000],
            ['section' => 'HRA', 'declared_amount' => 600000, 'details' => ['rent_per_month' => 50000, 'months' => 12, 'metro' => true]],
        ]);
        $tax = $this->project($asha, '2026-04', [['code' => 'PF', 'amount' => 1800], ['code' => 'PT', 'amount' => 200]]);

        $this->assertSame(1200000.0, $tax['gross']);
        $this->assertSame(240000.0, $tax['exemptions']['hra']); // All the HRA received (₹20,000 × 12).
        $this->assertSame(121600.0, $tax['deductions']['80C']); // ₹1L declared + ₹21,600 PF.
        $this->assertSame(2400.0, $tax['deductions']['professional_tax']);
        $this->assertSame(786000, (int) $tax['taxable']);
        $this->assertSame(72488.0, (float) $tax['tax']['total']);
        $this->assertSame(6041.0, $tax['tds_month']);

        $declaration = HrTaxDeclaration::where('employee_id', $asha->id)->first();
        $declaration->update(['regime' => 'NEW']);
        $this->assertSame(0.0, (float) $this->project($asha, '2026-04')['tax']['total']); // New regime: ₹11.25L, within the rebate.
    }

    public function test_after_the_proof_deadline_only_verified_amounts_count(): void
    {
        $asha = $this->employee('Asha', ['gross_pay' => 100000]);
        $this->declare($asha, 'OLD', [
            ['section' => '80C', 'declared_amount' => 100000, 'proof_status' => 'SUBMITTED'],
            ['section' => '80D', 'declared_amount' => 25000, 'proof_status' => 'VERIFIED', 'proof_amount' => 20000],
            ['section' => '80CCD1B', 'declared_amount' => 50000, 'proof_status' => 'REJECTED'],
        ]);
        $before = $this->project($asha, '2027-02');
        $this->assertSame([100000.0, 20000.0, 0.0], [$before['deductions']['80C'], $before['deductions']['80D'], $before['deductions']['80CCD1B']]);
        $this->assertSame('declared', $before['uses']);

        Carbon::setTestNow(Carbon::parse('2027-02-05 10:00', 'Asia/Kolkata')->utc());
        $after = $this->project($asha, '2027-02');
        $this->assertSame([0.0, 20000.0], [$after['deductions']['80C'], $after['deductions']['80D']]);
        $this->assertSame('verified', $after['uses']);
        $this->artisan('hr:lock-tax-declarations')->expectsOutput('1 declaration(s) closed.');
    }

    public function test_previous_employer_and_missing_pan(): void
    {
        $joiner = $this->employee('Joiner', ['gross_pay' => 150000], null, '2026-07-01');
        $this->declare($joiner, 'NEW', [['section' => 'PREV_SALARY', 'declared_amount' => 450000], ['section' => 'PREV_TDS', 'declared_amount' => 20000]]);
        $tax = $this->project($joiner, '2026-07');
        $this->assertSame(1800000.0, $tax['gross']); // ₹4.5L before + 9 months here.
        $this->assertSame(20000.0, $tax['tds_deducted']);
        $this->assertSame(round((150800 - 20000) / 9), $tax['tds_month']);

        $noPan = $this->employee('No PAN', ['gross_pay' => 150000]);
        $noPan->forceFill(['master_details' => ['gross_pay' => 150000, 'pan_number' => '']])->save();
        $tax = $this->project($noPan->refresh(), '2026-04');
        $this->assertTrue($tax['no_pan']);
        $this->assertSame(30000.0, $tax['tds_month']); // 20% of the month's pay.
    }

    public function test_full_and_final_deducts_the_years_balance_with_gratuity_exempt(): void
    {
        $leaver = $this->employee('Leaver', ['gross_pay' => 150000], null, '2018-01-01');
        $this->declare($leaver, 'NEW', [['section' => 'PREV_SALARY', 'declared_amount' => 1500000]]);
        $this->attend($leaver, '2026-10');
        Sanctum::actingAs($this->user('manager'));
        $separation = $this->postJson('/api/separations', ['employee_id' => $leaver->id, 'type' => 'RETIREMENT', 'applied_on' => '2026-10-15', 'last_working_day' => '2026-10-15'])->json('data.id');
        $fnf = $this->postJson('/api/final-settlements/prepare', ['separation_id' => $separation])->assertOk()->json('data');
        $tax = $fnf['summary']['tax'];
        $gratuity = collect($fnf['earnings'])->firstWhere('code', 'GRATUITY')['amount'];

        $this->assertTrue($tax['final']);
        $this->assertSame(1, $tax['months_left']);
        $this->assertEquals($gratuity, $tax['exemptions']['gratuity']); // Within the ₹20 lakh exemption.
        $salary = round(150000 * 15 / 31, 2);
        $taxable = round((1500000 + $salary - 75000) / 10) * 10;
        $this->assertEquals($taxable, $tax['taxable']);
        $this->assertEquals(app(TaxCalculator::class)->annualTax(PayrollSetup::TAX['new'], $taxable)['total'], collect($fnf['deductions'])->firstWhere('code', 'TDS')['amount']);

        $this->postJson("/api/final-settlements/{$fnf['id']}/submit")->assertOk();
        $voucher = DB::table('vouchers')->where('source_type', 'fnf_settlement')->where('source_id', $fnf['id'])->value('id');
        $this->assertEquals(collect($fnf['deductions'])->firstWhere('code', 'TDS')['amount'], DB::table('voucher_lines')->where('voucher_id', $voucher)
            ->join('ledger_accounts as l', 'l.id', '=', 'voucher_lines.ledger_account_id')->where('l.system_key', 'tds_payable')->value('credit'));
    }

    public function test_challans_register_form16_and_24q_add_up(): void
    {
        $manager = $this->employee('Manager', ['gross_pay' => 150000]);
        $small = $this->employee('Small', ['gross_pay' => 20000]);
        Sanctum::actingAs($this->user('manager'));
        foreach (['2026-04', '2026-05', '2026-06'] as $month) {
            $this->runMonth($month, [$manager, $small]);
        }

        $this->postJson('/api/tds/challans', ['fy' => '2026-27', 'quarter' => 1, 'months' => ['2026-04', '2026-05'], 'tax' => 25134, 'interest' => 100, 'bsr_code' => '0510032',
            'challan_no' => '12345', 'deposited_on' => '2026-06-07', 'pay_mode' => 'BANK'])->assertCreated();
        $this->postJson('/api/tds/challans', ['fy' => '2026-27', 'quarter' => 1, 'months' => ['2026-07'], 'tax' => 1, 'bsr_code' => '0510032', 'challan_no' => '1',
            'deposited_on' => '2026-08-07', 'pay_mode' => 'BANK'])->assertUnprocessable(); // July is quarter 2.
        $challan = DB::table('hr_tds_challans')->value('id');
        $voucher = DB::table('vouchers')->where('source_type', 'tds_challan')->where('source_id', $challan)->value('id');
        $lines = DB::table('voucher_lines')->where('voucher_id', $voucher)->join('ledger_accounts as l', 'l.id', '=', 'voucher_lines.ledger_account_id')
            ->get(['l.system_key', 'debit', 'credit'])->keyBy('system_key');
        $this->assertEquals([25134, 100, 25234], [$lines['tds_payable']->debit, $lines['tds_interest']->debit, $lines['bank']->credit]);

        $register = $this->getJson('/api/tds/register?fy=2026-27&quarter=1')->assertOk()->json('data');
        $this->assertCount(6, $register['rows']);
        $this->assertEquals(37701, collect($register['rows'])->sum('tds')); // 12,567 × 3.
        $this->assertEquals([12567, 12567], [$register['months'][0]['deposited'], $register['months'][1]['deposited']]);

        $form16 = $this->getJson("/api/tds/form16?fy=2026-27&employee_id={$manager->id}")->assertOk()->json('data');
        $this->assertEquals([450000, 37701], [$form16['paid'], $form16['tds']]);
        $this->assertSame('2027-28', $form16['assessment_year']);
        $this->assertSame(1725000, (int) $form16['computation']['taxable']);
        $this->assertFalse($form16['complete']);

        $q1 = $this->getJson('/api/tds/form24q?fy=2026-27&quarter=1')->assertOk()->json('data');
        $april = collect($q1['annexure1'])->first(fn ($r) => $r['employee_id'] === $manager->id && $r['month'] === '2026-04');
        $this->assertSame(['0510032', '12345'], [$april['bsr_code'], $april['challan_no']]);
        $this->assertSame([], $q1['annexure2']); // Only in Q4.
        $this->assertCount(2, $this->getJson('/api/tds/form24q?fy=2026-27&quarter=4')->json('data.annexure2'));

        $report = $this->getJson('/api/payroll-runs/'.DB::table('hr_payroll_runs')->where('month', '2026-04')->value('id').'/report/tds')->assertOk()->json('data.rows');
        $this->assertEquals(12567, collect($report)->firstWhere('employee_id', $manager->id)['tds']);
    }

    public function test_the_estimate_splits_pay_even_before_the_store_runs_payroll(): void
    {
        $fresh = Store::create(['name' => 'No payroll yet', 'code' => 'NP-'.Str::random(6)]);
        $login = User::factory()->create(['username' => 'np-'.Str::random(8), 'role' => 'cashier', 'store_id' => $fresh->id]);
        $employee = Employee::create(['name' => 'New', 'code' => 'NP1', 'store_id' => $fresh->id, 'is_active' => true, 'joining_date' => '2024-01-01', 'user_id' => $login->id, 'salary' => 100000]);
        $declaration = HrTaxDeclaration::create(['store_id' => $fresh->id, 'employee_id' => $employee->id, 'fy' => '2026-27', 'regime' => 'OLD']);
        HrTaxDeclarationItem::create(['store_id' => $fresh->id, 'declaration_id' => $declaration->id, 'section' => 'HRA', 'declared_amount' => 480000,
            'details' => ['rent_per_month' => 40000, 'months' => 12, 'metro' => true]]);

        Sanctum::actingAs($login);
        $old = $this->getJson('/api/tax-declarations/mine')->assertOk()->json('data.estimate.old');
        $this->assertSame(100000.0, (float) $old['exemptions']['hra']); // ₹20,000 HRA × 5 months (Nov–Mar), from the Standard structure.
    }

    public function test_declarations_are_personal_until_closed_and_proofs_stay_private(): void
    {
        $cashier = $this->user('cashier');
        $asha = $this->employee('Asha', ['gross_pay' => 100000], $cashier);
        $other = $this->employee('Other', ['gross_pay' => 20000], $otherLogin = $this->user('cashier'));
        $hr = $this->user('manager');

        Sanctum::actingAs($cashier);
        $mine = $this->getJson('/api/tax-declarations/mine')->assertOk()->json('data');
        $this->assertSame(['2026-27', 'NEW'], [$mine['fy'], $mine['declaration']['regime']]);
        $this->assertArrayHasKey('old', $mine['estimate']);
        $this->putJson('/api/tax-declarations/mine', ['regime' => 'OLD', 'items' => [['section' => 'HRA', 'details' => ['rent_per_month' => 10000, 'months' => 12, 'metro' => false]]]])
            ->assertUnprocessable()->assertJsonValidationErrors('items.0.details.landlord_pan'); // ₹1.2L of rent needs the landlord's PAN.
        $saved = $this->putJson('/api/tax-declarations/mine', ['regime' => 'OLD', 'items' => [
            ['section' => 'HRA', 'details' => ['rent_per_month' => 10000, 'months' => 12, 'metro' => false, 'landlord_pan' => 'PQRST6789K']],
            ['section' => '80C', 'declared_amount' => 50000, 'description' => 'PPF'],
        ]])->assertOk()->json('data');
        $this->assertEquals(120000, collect($saved['items'])->firstWhere('section', 'HRA')['declared_amount']);
        $item = collect($saved['items'])->firstWhere('section', '80C')['id'];
        $this->post("/api/tax-declaration-items/{$item}/proof", ['proof' => UploadedFile::fake()->image('ppf.jpg')], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('data.proof_status', 'SUBMITTED')->assertJsonMissingPath('data.proof_path');
        $this->postJson('/api/tax-declarations/mine/submit')->assertOk();
        $this->getJson('/api/tax-declarations')->assertForbidden(); // Everyone's: payroll staff only.
        $this->postJson("/api/tax-declaration-items/{$item}/verify", ['action' => 'accept'])->assertForbidden();

        Sanctum::actingAs($otherLogin);
        $this->getJson("/api/tax-declaration-items/{$item}/proof")->assertNotFound();

        Sanctum::actingAs($hr);
        $this->assertStringContainsString('signature=', $this->getJson("/api/tax-declaration-items/{$item}/proof")->assertOk()->json('data.url'));
        $row = collect($this->getJson('/api/tax-declarations')->assertOk()->json('data'))->firstWhere('employee_id', $asha->id);
        $this->assertSame(['OLD', 'SUBMITTED', 1], [$row['regime'], $row['status'], $row['to_verify']]);
        $this->postJson("/api/tax-declaration-items/{$item}/verify", ['action' => 'accept', 'amount' => 45000])->assertOk()->assertJsonPath('data.proof_amount', 45000);
        $this->postJson("/api/tax-declarations/{$row['declaration_id']}/lock", ['locked' => true])->assertOk();

        Sanctum::actingAs($cashier);
        $this->putJson('/api/tax-declarations/mine', ['regime' => 'NEW', 'items' => []])->assertUnprocessable(); // Closed.

        Sanctum::actingAs($hr);
        $this->putJson("/api/tax-declarations/employee/{$asha->id}", ['regime' => 'NEW', 'items' => []])->assertOk()->assertJsonPath('data.declaration.regime', 'NEW');
        $this->assertSame(0, HrTaxDeclarationItem::count());

        $elsewhere = Store::create(['name' => 'Elsewhere', 'code' => 'EW-'.Str::random(6)]);
        Sanctum::actingAs($this->user('manager', $elsewhere));
        $this->getJson('/api/tax-declarations')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/tax-declarations/employee/{$other->id}")->assertNotFound();
        $this->getJson('/api/tds/register?fy=2026-27')->assertOk()->assertJsonCount(0, 'data.rows');
    }
}
