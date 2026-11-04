<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrTaxDeclaration;
use App\Models\HrTaxDeclarationItem;
use App\Services\Hr\HrScope;
use App\Services\Hr\PayrollCalculator;
use App\Services\Hr\PayrollSetup;
use App\Services\Hr\TaxDeclarationService;
use App\Services\Hr\TdsService;
use App\Services\Tenancy\BusinessPermissions;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Income tax declarations: staff choose their regime and declare tax savings with proofs (My Tax); HR sees
 * everyone's, verifies proofs, edits and closes declarations (HRMS > Income Tax).
 */
class TaxDeclarationController extends Controller
{
    public function __construct(private readonly TaxDeclarationService $declarations, private readonly TdsService $tds, private readonly PayrollCalculator $calculator,
        private readonly HrScope $scope, private readonly BusinessPermissions $permissions) {}

    public function mine(Request $request)
    {
        $employee = $this->scope->employeeFor($request->user());
        if (! $employee) {
            return response()->json(['success' => true, 'data' => ['employee' => null]]);
        }

        return response()->json(['success' => true, 'data' => $this->bundle($employee, $this->fy($request))]);
    }

    public function save(Request $request)
    {
        $employee = $this->own($request);

        return response()->json(['success' => true, 'message' => 'Declaration saved',
            'data' => $this->bundle($employee, $this->declarations->save($employee, $this->fy($request), $this->validated($request), $request->user(), false)->fy)]);
    }

    public function submit(Request $request)
    {
        $employee = $this->own($request);
        $declaration = $this->declarations->forEmployee($employee, $this->fy($request));
        $this->declarations->submit($declaration);

        return response()->json(['success' => true, 'message' => 'Declaration sent to HR', 'data' => $this->bundle($employee, $declaration->fy)]);
    }

    public function uploadProof(Request $request, $id)
    {
        $request->validate(['proof' => 'required|file|max:5120|mimes:jpg,jpeg,png,webp,pdf']);
        $item = $this->item($request, $id, true);

        return response()->json(['success' => true, 'message' => 'Proof uploaded', 'data' => $this->presentItem($this->declarations->uploadProof($item, $request->file('proof')))]);
    }

    public function proof(Request $request, $id)
    {
        $url = $this->declarations->proofUrl($this->item($request, $id, false));
        abort_unless($url, 404);

        return response()->json(['success' => true, 'data' => ['url' => $url]]);
    }

    /** HR: everyone's declaration for the year (and who has none yet). */
    public function index(Request $request)
    {
        $fy = $this->fy($request);
        $employees = $this->scope->apply(Employee::where('is_active', true), $request->user(), 'id')->orderBy('name')->get(['id', 'name', 'code', 'master_details']);
        $declarations = HrTaxDeclaration::with('items')->where('fy', $fy)->whereIn('employee_id', $employees->pluck('id'))->get()->keyBy('employee_id');

        return response()->json(['success' => true, 'data' => $employees->map(function ($employee) use ($declarations) {
            $declaration = $declarations->get($employee->id);
            $items = $declaration?->items ?? collect();

            return ['employee_id' => $employee->id, 'name' => $employee->name, 'code' => $employee->code, 'pan' => $employee->master_details['pan_number'] ?? null,
                'declaration_id' => $declaration?->id, 'regime' => $declaration?->regime ?? 'NEW', 'status' => $declaration?->status ?? 'NONE',
                'locked' => (bool) $declaration?->locked, 'declared' => round($items->sum('declared_amount'), 2),
                'to_verify' => $items->where('proof_status', 'SUBMITTED')->count(), 'verified' => $items->where('proof_status', 'VERIFIED')->count()];
        })->values(), 'meta' => ['fy' => $fy, 'sections' => TdsService::SECTIONS]]);
    }

    public function show(Request $request, $employeeId)
    {
        return response()->json(['success' => true, 'data' => $this->bundle($this->managed($request, $employeeId), $this->fy($request))]);
    }

    /** HR changes an employee's declaration (also once it is closed). */
    public function saveFor(Request $request, $employeeId)
    {
        $employee = $this->managed($request, $employeeId);

        return response()->json(['success' => true, 'message' => 'Declaration saved',
            'data' => $this->bundle($employee, $this->declarations->save($employee, $this->fy($request), $this->validated($request), $request->user(), true)->fy)]);
    }

    public function verify(Request $request, $id)
    {
        $data = $request->validate(['action' => 'required|in:accept,reject', 'amount' => 'nullable|numeric|min:0', 'note' => 'nullable|string|max:255']);
        $item = $this->item($request, $id, false);

        return response()->json(['success' => true, 'message' => $data['action'] === 'accept' ? 'Proof accepted' : 'Proof rejected',
            'data' => $this->presentItem($this->declarations->verify($item, $request->user(), $data['action'] === 'accept', isset($data['amount']) ? (float) $data['amount'] : null, $data['note'] ?? null))]);
    }

    public function lock(Request $request, $id)
    {
        $data = $request->validate(['locked' => 'required|boolean']);
        $declaration = HrTaxDeclaration::findOrFail($id);
        abort_unless($this->scope->canSee($request->user(), $declaration->employee_id), 404);
        $declaration->update(['locked' => $data['locked']]);

        return response()->json(['success' => true, 'message' => $data['locked'] ? 'Declaration closed' : 'Declaration reopened for the employee']);
    }

    /** The declaration, its items and the year's estimate under both regimes. */
    private function bundle(Employee $employee, string $fy): array
    {
        $declaration = $this->declarations->forEmployee($employee, $fy)->load('items');
        $month = $fy === TaxDeclarationService::currentFy() ? null : PayrollSetup::fyMonths($fy)[0];

        return [
            'employee' => ['id' => $employee->id, 'name' => $employee->name, 'pan' => $employee->master_details['pan_number'] ?? null],
            'fy' => $fy, 'declaration' => collect($declaration->toArray())->except('items')->all(),
            'items' => $declaration->items->map(fn ($item) => $this->presentItem($item))->values(),
            'estimate' => $this->tds->estimate($employee, $this->calculator->fullMonth($employee), $month),
            'sections' => TdsService::SECTIONS,
        ];
    }

    private function presentItem(HrTaxDeclarationItem $item): array
    {
        return $item->toArray() + ['has_proof' => (bool) $item->proof_path];
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'regime' => 'required|in:NEW,OLD', 'items' => 'array|max:40',
            'items.*.id' => 'nullable|integer', 'items.*.section' => ['required', Rule::in(TdsService::SECTIONS)],
            'items.*.description' => 'nullable|string|max:255', 'items.*.declared_amount' => 'nullable|numeric|min:0|max:100000000',
            'items.*.details' => 'nullable|array', 'items.*.details.rent_per_month' => 'nullable|numeric|min:0', 'items.*.details.months' => 'nullable|integer|min:0|max:12',
            'items.*.details.metro' => 'nullable|boolean', 'items.*.details.landlord_name' => 'nullable|string|max:120',
            'items.*.details.landlord_pan' => ['nullable', 'regex:/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/'],
        ], ['items.*.details.landlord_pan.regex' => 'Enter a valid PAN (e.g. ABCDE1234F).']);
    }

    private function fy(Request $request): string
    {
        $fy = (string) ($request->input('fy') ?: TaxDeclarationService::currentFy());
        if (! preg_match('/^\d{4}-\d{2}$/', $fy)) {
            throw ValidationException::withMessages(['fy' => 'Choose a financial year like 2026-27.']);
        }

        return $fy;
    }

    private function own(Request $request): Employee
    {
        return $this->scope->employeeFor($request->user())
            ?? throw ValidationException::withMessages(['employee_id' => 'Your login is not linked to an employee. Ask HR to link it in the employee form.']);
    }

    private function managed(Request $request, $employeeId): Employee
    {
        return $this->scope->apply(Employee::whereKey($employeeId), $request->user(), 'id')->firstOrFail();
    }

    /** An item of your own declaration, or (HR) of someone you manage. */
    private function item(Request $request, $id, bool $upload): HrTaxDeclarationItem
    {
        $item = HrTaxDeclarationItem::with('declaration')->findOrFail($id);
        $own = $this->scope->employeeFor($request->user());
        $mine = $own?->id === $item->declaration->employee_id;
        if (! $mine && (! $this->scope->canSee($request->user(), $item->declaration->employee_id)
            || ! $this->permissions->allows($request->user(), $upload ? 'payroll.manage' : 'payroll.view'))) {
            abort(404); // Someone else's tax proofs: payroll staff only, not every manager in the chain.
        }

        return $item;
    }
}
