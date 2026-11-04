<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrPayslip;
use App\Models\HrSettlement;
use App\Models\HrTdsChallan;
use App\Models\Store;
use App\Services\Hr\HrScope;
use App\Services\Hr\PayrollSetup;
use App\Services\Hr\TaxDeclarationService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * HRMS > Income Tax: the year's tax rules, TDS deposits (challans), the TDS register, Form 16 Part B and the
 * Form 24Q data, all from submitted payrolls and full and final settlements.
 */
class IncomeTaxController extends Controller
{
    public function __construct(private readonly PayrollSetup $setup, private readonly HrScope $scope) {}

    public function rules(Request $request)
    {
        $fy = $this->fy($request);

        return response()->json(['success' => true, 'data' => ['fy' => $fy, 'rules' => $this->setup->taxRules($this->storeId($request), $fy), 'defaults' => PayrollSetup::TAX]]);
    }

    public function saveRules(Request $request)
    {
        $data = $request->validate([
            'enabled' => 'boolean', 'cess_pct' => 'numeric|min:0|max:20', 'no_pan_rate' => 'numeric|min:0|max:100', 'proof_deadline' => ['regex:/^(0[1-3])-(0[1-9]|[12]\d|3[01])$/'],
            'tan' => 'nullable|string|max:10', 'metro_cities' => 'array', 'metro_cities.*' => 'string|max:40',
            'caps' => 'array', 'caps.*' => 'numeric|min:0', 'exempt' => 'array', 'exempt.*' => 'numeric|min:0',
            'new' => 'array', 'old' => 'array', 'new.standard_deduction' => 'numeric|min:0', 'old.standard_deduction' => 'numeric|min:0',
            'new.rebate_limit' => 'numeric|min:0', 'old.rebate_limit' => 'numeric|min:0', 'new.rebate_max' => 'numeric|min:0', 'old.rebate_max' => 'numeric|min:0',
            'new.marginal_relief' => 'boolean', 'old.marginal_relief' => 'boolean',
            'new.slabs' => 'array|min:1', 'old.slabs' => 'array|min:1', 'new.slabs.*' => 'array|size:3', 'old.slabs.*' => 'array|size:3',
            'new.slabs.*.0' => 'required|numeric|min:0', 'old.slabs.*.0' => 'required|numeric|min:0', 'new.slabs.*.1' => 'nullable|numeric|min:0', 'old.slabs.*.1' => 'nullable|numeric|min:0',
            'new.slabs.*.2' => 'required|numeric|min:0|max:100', 'old.slabs.*.2' => 'required|numeric|min:0|max:100',
            'new.surcharge' => 'array', 'old.surcharge' => 'array', 'new.surcharge.*' => 'array|size:2', 'old.surcharge.*' => 'array|size:2',
        ], ['proof_deadline.regex' => 'Proof deadline is a date in January to March, like 01-31.']);
        $fy = $this->fy($request);

        return response()->json(['success' => true, 'message' => "Income tax rules for {$fy} saved", 'data' => $this->setup->saveTaxRules($this->storeId($request), $fy, $data)]);
    }

    public function challans(Request $request)
    {
        $fy = $this->fy($request);
        $challans = HrTdsChallan::where('fy', $fy)->orderBy('deposited_on')->get();

        return response()->json(['success' => true, 'data' => ['fy' => $fy, 'challans' => $challans, 'months' => $this->monthTotals($request, $fy, $challans)]]);
    }

    public function storeChallan(Request $request)
    {
        $challan = HrTdsChallan::create($this->challanData($request) + ['created_by' => $request->user()->id]);

        return response()->json(['success' => true, 'message' => 'Challan saved', 'data' => $challan], 201);
    }

    public function updateChallan(Request $request, $id)
    {
        $challan = HrTdsChallan::findOrFail($id);
        $challan->update($this->challanData($request));

        return response()->json(['success' => true, 'message' => 'Challan saved', 'data' => $challan]);
    }

    public function destroyChallan($id)
    {
        HrTdsChallan::findOrFail($id)->delete();

        return response()->json(['success' => true, 'message' => 'Challan removed']);
    }

    /** TDS deducted per employee per month, and per month deducted against deposited. */
    public function register(Request $request)
    {
        $fy = $this->fy($request);
        $quarter = $request->integer('quarter') ?: null;
        $rows = $this->payments($request, $fy)->when($quarter, fn ($c) => $c->filter(fn ($p) => self::quarterOf($p['month']) === $quarter))->values();

        return response()->json(['success' => true, 'data' => ['fy' => $fy, 'rows' => $rows,
            'months' => $this->monthTotals($request, $fy, HrTdsChallan::where('fy', $fy)->get())->when($quarter, fn ($c) => $c->where('quarter', $quarter))->values()]]);
    }

    /** Form 16 Part B: the year's salary, exemptions, deductions, tax and TDS for one employee. */
    public function form16(Request $request)
    {
        $fy = $this->fy($request);
        $employee = $this->scope->apply(Employee::whereKey($request->integer('employee_id')), $request->user(), 'id')->with('designation:id,name')->firstOrFail();
        $payments = $this->payments($request, $fy)->where('employee_id', $employee->id)->values();
        $last = $payments->last();
        $challans = HrTdsChallan::where('fy', $fy)->get();
        [$start, $end] = PayrollSetup::fyMonths($fy);
        $store = Store::find($employee->store_id);
        $quarters = collect([1, 2, 3, 4])->map(fn ($q) => [
            'quarter' => $q, 'paid' => round($payments->filter(fn ($p) => self::quarterOf($p['month']) === $q)->sum('gross'), 2),
            'tds' => round($payments->filter(fn ($p) => self::quarterOf($p['month']) === $q)->sum('tds'), 2),
            'challans' => $challans->where('quarter', $q)->values(),
        ]);

        return response()->json(['success' => true, 'data' => [
            'fy' => $fy, 'assessment_year' => ((int) substr($fy, 0, 4) + 1).'-'.sprintf('%02d', ((int) substr($fy, 0, 4) + 2) % 100),
            'employer' => ['name' => $store?->name, 'address' => trim(implode(', ', array_filter([$store?->address, $store?->city]))), 'tan' => $this->setup->taxRules($employee->store_id, $fy)['tan'] ?? ''],
            'employee' => ['name' => $employee->name, 'code' => $employee->code, 'pan' => $employee->master_details['pan_number'] ?? '', 'designation' => $employee->designation?->name,
                'from' => max($start.'-01', $employee->joining_date?->toDateString() ?? $start.'-01'), 'to' => $employee->relieving_date?->toDateString() ?? (new \DateTime("{$end}-01"))->format('Y-m-t')],
            'paid' => round($payments->sum('gross'), 2), 'tds' => round($payments->sum('tds'), 2), 'months' => $payments->count(),
            'computation' => $last['tax'] ?? null, 'complete' => ($last['month'] ?? '') >= $end || ($last['final'] ?? false),
            'quarters' => $quarters,
        ]]);
    }

    /** Form 24Q: Annexure I (payments and TDS in the quarter, with the challan) and, for Q4, Annexure II (the year per employee). */
    public function form24q(Request $request)
    {
        $fy = $this->fy($request);
        $quarter = max(1, min(4, $request->integer('quarter') ?: 1));
        $challans = HrTdsChallan::where('fy', $fy)->get();
        $payments = $this->payments($request, $fy);
        $annexure1 = $payments->filter(fn ($p) => self::quarterOf($p['month']) === $quarter)->map(function ($p) use ($challans) {
            $challan = $challans->first(fn ($c) => in_array($p['month'], $c->months ?? [], true));

            return collect($p)->except('tax')->all() + ['bsr_code' => $challan?->bsr_code, 'challan_no' => $challan?->challan_no, 'deposited_on' => $challan?->deposited_on?->toDateString()];
        })->values();
        $annexure2 = $quarter === 4 ? $payments->groupBy('employee_id')->map(function (Collection $rows) {
            $first = $rows->first();
            $tax = $rows->last()['tax'] ?? [];

            return ['employee_id' => $first['employee_id'], 'code' => $first['code'], 'name' => $first['name'], 'pan' => $first['pan'], 'regime' => $tax['regime'] ?? 'NEW',
                'gross' => round($rows->sum('gross'), 2), 'previous_salary' => $tax['previous_salary'] ?? 0,
                'exempt' => round(array_sum($tax['exemptions'] ?? []), 2), 'standard_deduction' => $tax['deductions']['standard'] ?? 0,
                'professional_tax' => $tax['deductions']['professional_tax'] ?? 0,
                'chapter_via' => round(collect($tax['deductions'] ?? [])->except(['standard', 'professional_tax'])->sum(), 2),
                'taxable' => $tax['taxable'] ?? 0, 'tax' => $tax['tax']['slab_tax'] ?? 0, 'rebate' => $tax['tax']['rebate'] ?? 0, 'surcharge' => $tax['tax']['surcharge'] ?? 0,
                'cess' => $tax['tax']['cess'] ?? 0, 'total_tax' => $tax['tax']['total'] ?? 0, 'tds' => round($rows->sum('tds'), 2)];
        })->values() : collect();

        return response()->json(['success' => true, 'data' => ['fy' => $fy, 'quarter' => $quarter, 'annexure1' => $annexure1, 'annexure2' => $annexure2,
            'challans' => $challans->where('quarter', $quarter)->values()]]);
    }

    public static function quarterOf(string $month): int
    {
        $m = (int) substr($month, 5, 2);

        return $m >= 4 ? intdiv($m - 4, 3) + 1 : 4;
    }

    /** Salary paid in the year (submitted payrolls and settlements): taxable pay, TDS and the tax worked out with it. */
    private function payments(Request $request, string $fy): Collection
    {
        [$start, $end] = PayrollSetup::fyMonths($fy);
        $taxable = fn (array $earnings) => collect($earnings)->where('code', '!=', 'REIMBURSE')->sum('amount');
        $tds = fn (array $deductions) => (float) collect($deductions)->where('code', 'TDS')->sum('amount');
        $slips = $this->scope->apply(HrPayslip::query()->join('hr_payroll_runs as r', 'r.id', '=', 'hr_payslips.run_id')
            ->whereIn('r.status', ['SUBMITTED', 'PAID'])->whereBetween('r.month', [$start, $end]), $request->user(), 'hr_payslips.employee_id')
            ->get(['hr_payslips.*', 'r.month', 'r.paid_on as run_paid_on'])
            ->map(fn ($s) => ['employee_id' => $s->employee_id, 'code' => $s->snapshot['code'] ?? '', 'name' => $s->snapshot['name'] ?? '', 'pan' => $s->snapshot['pan_number'] ?? '',
                'month' => $s->month, 'paid_on' => $s->run_paid_on ?: (new \DateTime("{$s->month}-01"))->format('Y-m-t'), 'source' => 'Payroll',
                'gross' => round($taxable($s->earnings ?? []), 2), 'tds' => $tds($s->deductions ?? []), 'tax' => $s->snapshot['tax'] ?? null, 'final' => false]);
        $settlements = $this->scope->apply(HrSettlement::with('employee:id,name,code,master_details')->whereIn('status', ['SUBMITTED', 'PAID'])->whereBetween('month', [$start, $end]), $request->user())
            ->get()->map(fn ($s) => ['employee_id' => $s->employee_id, 'code' => $s->employee?->code ?? '', 'name' => $s->employee?->name ?? '',
                'pan' => $s->employee?->master_details['pan_number'] ?? '', 'month' => $s->month, 'paid_on' => $s->paid_on?->toDateString() ?? $s->last_working_day->toDateString(),
                'source' => 'Full and final', 'gross' => round($taxable($s->earnings ?? []), 2), 'tds' => $tds($s->deductions ?? []), 'tax' => $s->summary['tax'] ?? null, 'final' => true]);

        return $slips->concat($settlements)->sortBy([['month', 'asc'], ['name', 'asc']])->values();
    }

    /** Per month of the year: TDS deducted and deposited. */
    private function monthTotals(Request $request, string $fy, Collection $challans): Collection
    {
        $payments = $this->payments($request, $fy);
        [$start] = PayrollSetup::fyMonths($fy);

        return collect(range(0, 11))->map(function ($i) use ($start, $payments, $challans) {
            $month = (new \DateTime("{$start}-01"))->modify("+{$i} month")->format('Y-m');
            $deposited = $challans->filter(fn ($c) => in_array($month, $c->months ?? [], true))
                ->sum(fn ($c) => count($c->months ?? []) ? $c->tax / count($c->months) : 0);

            return ['month' => $month, 'quarter' => self::quarterOf($month), 'deducted' => round($payments->where('month', $month)->sum('tds'), 2), 'deposited' => round($deposited, 2)];
        });
    }

    private function challanData(Request $request): array
    {
        $data = $request->validate([
            'fy' => ['required', 'regex:/^\d{4}-\d{2}$/'], 'quarter' => 'required|integer|between:1,4', 'months' => 'required|array|min:1|max:3',
            'months.*' => ['regex:/^\d{4}-(0[1-9]|1[0-2])$/'], 'tax' => 'required|numeric|min:0', 'interest' => 'nullable|numeric|min:0', 'fee' => 'nullable|numeric|min:0',
            'bsr_code' => ['required', 'regex:/^\d{7}$/'], 'challan_no' => ['required', 'regex:/^\d{1,5}$/'], 'deposited_on' => 'required|date_format:Y-m-d',
            'pay_mode' => 'required|in:BANK,CASH', 'note' => 'nullable|string|max:255',
        ], ['bsr_code.regex' => 'The BSR code has 7 digits.', 'challan_no.regex' => 'The challan serial number has up to 5 digits.']);
        foreach ($data['months'] as $month) {
            if (PayrollSetup::fyOf($month) !== $data['fy'] || self::quarterOf($month) !== (int) $data['quarter']) {
                throw ValidationException::withMessages(['months' => "{$month} is not in quarter {$data['quarter']} of {$data['fy']}."]);
            }
        }
        $data['interest'] = (float) ($data['interest'] ?? 0);
        $data['fee'] = (float) ($data['fee'] ?? 0);
        $data['total'] = round($data['tax'] + $data['interest'] + $data['fee'], 2);

        return $data;
    }

    private function fy(Request $request): string
    {
        $fy = (string) ($request->input('fy') ?: TaxDeclarationService::currentFy());
        if (! preg_match('/^\d{4}-\d{2}$/', $fy)) {
            throw ValidationException::withMessages(['fy' => 'Choose a financial year like 2026-27.']);
        }

        return $fy;
    }

    private function storeId(Request $request): int
    {
        return (int) ($request->attributes->get('store_context_id') ?: throw ValidationException::withMessages(['store' => 'Select a store first.']));
    }
}
