<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\HrDepartment;
use App\Models\HrSalaryComponent;
use App\Models\HrSalaryStructureLine;
use App\Services\Hr\PayrollSetup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Pay heads (components) and how each Salary Structure splits the gross into them. A structure is the HR
 * Configuration "Salary Structure" record that employees already choose on their form.
 */
class SalaryStructureController extends Controller
{
    public function __construct(private readonly PayrollSetup $setup) {}

    public function index(Request $request)
    {
        $this->setup->ensureDefaults($request->attributes->get('store_context_id'));
        $components = HrSalaryComponent::orderBy('sort')->orderBy('id')->get();
        $structures = HrDepartment::where('configuration_type', 'salary_structure')->orderBy('name')->get(['id', 'name', 'code', 'is_active']);
        $lines = HrSalaryStructureLine::whereIn('structure_id', $structures->pluck('id'))->orderBy('sort')->orderBy('id')->get()->groupBy('structure_id');

        return response()->json(['success' => true, 'data' => [
            'components' => $components,
            'structures' => $structures->map(fn ($s) => $s->only(['id', 'name', 'code', 'is_active']) + ['lines' => ($lines->get($s->id) ?? collect())->values()])->values(),
        ]]);
    }

    /** Adds a structure (an HR Configuration record) and its lines. */
    public function store(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:120']);
        $storeId = $this->storeId($request);
        $structure = HrDepartment::forceCreate(['store_id' => $storeId, 'name' => $data['name'], 'code' => 'PAY-'.strtoupper(substr(uniqid(), -5)),
            'configuration_type' => 'salary_structure', 'is_active' => true]);
        $this->saveLines($request, $structure);

        return response()->json(['success' => true, 'message' => 'Salary structure added', 'data' => $structure], 201);
    }

    public function update(Request $request, $id)
    {
        $structure = HrDepartment::where('configuration_type', 'salary_structure')->findOrFail($id);
        if ($request->filled('name')) {
            $structure->update(['name' => $request->validate(['name' => 'string|max:120'])['name']]);
        }
        $this->saveLines($request, $structure);

        return response()->json(['success' => true, 'message' => 'Salary structure saved', 'data' => $structure]);
    }

    public function saveComponent(Request $request, $id = null)
    {
        $storeId = $this->storeId($request);
        $component = $id ? HrSalaryComponent::findOrFail($id) : new HrSalaryComponent;
        $data = $request->validate([
            'code' => ['required', 'string', 'max:12', Rule::unique('hr_salary_components', 'code')->where('store_id', $storeId)->ignore($component->id)],
            'name' => 'required|string|max:80', 'type' => 'required|in:EARNING,DEDUCTION', 'is_active' => 'boolean',
        ]);
        if ($component->statutory && $data['type'] !== $component->type) {
            throw ValidationException::withMessages(['type' => "{$component->name} is worked out by payroll; its type can't change."]);
        }
        $component->fill($data + ['store_id' => $storeId])->save();

        return response()->json(['success' => true, 'message' => 'Pay head saved', 'data' => $component]);
    }

    private function saveLines(Request $request, HrDepartment $structure): void
    {
        $data = $request->validate([
            'lines' => 'array', 'lines.*.component_id' => 'required|integer',
            'lines.*.calc' => 'required|in:PERCENT_OF_GROSS,PERCENT_OF_BASIC,FIXED,BALANCE', 'lines.*.value' => 'nullable|numeric|min:0',
        ]);
        if (! $request->has('lines')) {
            return;
        }
        $lines = collect($data['lines']);
        if ($lines->where('calc', 'BALANCE')->count() > 1) {
            throw ValidationException::withMessages(['lines' => 'Only one line can take the balance.']);
        }
        $earnings = HrSalaryComponent::where('type', 'EARNING')->pluck('id')->all();
        DB::transaction(function () use ($structure, $lines, $earnings) {
            HrSalaryStructureLine::where('structure_id', $structure->id)->delete();
            foreach ($lines->values() as $i => $line) {
                if (in_array((int) $line['component_id'], $earnings, true)) {
                    HrSalaryStructureLine::create(['store_id' => $structure->store_id, 'structure_id' => $structure->id, 'component_id' => $line['component_id'],
                        'calc' => $line['calc'], 'value' => $line['value'] ?? 0, 'sort' => $i]);
                }
            }
        });
    }

    private function storeId(Request $request): int
    {
        $storeId = $request->attributes->get('store_context_id');
        if (! $storeId) {
            throw ValidationException::withMessages(['store' => 'Select a store first.']);
        }

        return (int) $storeId;
    }
}
