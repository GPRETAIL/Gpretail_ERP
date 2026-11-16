<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Controllers\Controller;
use App\Models\IncentiveRule;
use App\Models\IncentiveTarget;
use App\Services\Sales\IncentiveCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Settings > Incentive Configuration (rules and monthly targets) and Finance > Incentive Report (month figures,
 * line detail, approval). See Services/Sales/IncentiveCalculator for how the rules apply.
 */
class IncentiveController extends Controller
{
    public function __construct(private IncentiveCalculator $calculator) {}

    public function rules(Request $request): JsonResponse
    {
        $request->validate(['type' => ['nullable', Rule::in(IncentiveRule::TYPES)]]);
        $rules = IncentiveRule::query()->when($request->filled('type'), fn ($q) => $q->where('type', $request->input('type')))
            ->orderByDesc('is_active')->orderBy('type')->orderBy('name')->get();
        // Names for the chosen categories / brands / products / people, so the list and the form can show them.
        $ids = fn (string $scope) => $rules->where('scope_type', $scope)->flatMap(fn ($r) => (array) $r->scope_ids)->unique()->values()->all();
        $names = [
            'category' => DB::table('categories')->whereIn('id', $ids('category'))->pluck('name', 'id'),
            'brand' => DB::table('brands')->whereIn('id', $ids('brand'))->pluck('name', 'id'),
            'product' => DB::table('products')->whereIn('id', $ids('product'))->pluck('name', 'id'),
        ];
        $people = DB::table('employees')->whereIn('id', $rules->flatMap(fn ($r) => (array) $r->employee_ids)->unique()->all())->pluck('name', 'id');
        $sections = DB::table('hr_departments')->whereIn('id', $rules->flatMap(fn ($r) => (array) $r->department_ids)->unique()->all())->pluck('name', 'id');
        $rules->each(function (IncentiveRule $rule) use ($names, $people, $sections) {
            $rule->setAttribute('scope_labels', collect((array) $rule->scope_ids)->map(fn ($id) => $rule->scope_type === 'section' ? $id : ($names[$rule->scope_type][$id] ?? "#{$id}"))->values());
            $rule->setAttribute('employee_labels', collect((array) $rule->employee_ids)->map(fn ($id) => $people[$id] ?? "#{$id}")->values());
            $rule->setAttribute('department_labels', collect((array) $rule->department_ids)->map(fn ($id) => $sections[$id] ?? "#{$id}")->values());
        });

        return response()->json(['success' => true, 'data' => $rules]);
    }

    public function storeRule(Request $request): JsonResponse
    {
        $rule = IncentiveRule::create([...$this->validatedRule($request), 'store_id' => $this->storeId($request), 'created_by' => $request->user()->id]);

        return response()->json(['success' => true, 'message' => 'Rule saved.', 'data' => $rule], 201);
    }

    public function updateRule(Request $request, int $id): JsonResponse
    {
        $rule = IncentiveRule::findOrFail($id);
        $rule->update($this->validatedRule($request));

        return response()->json(['success' => true, 'message' => 'Rule saved.', 'data' => $rule->fresh()]);
    }

    public function destroyRule(int $id): JsonResponse
    {
        IncentiveRule::findOrFail($id)->delete();

        return response()->json(['success' => true, 'message' => 'Rule deleted.']);
    }

    /** The month's targets: one row per salesperson and per HR section that has one. */
    public function targets(Request $request): JsonResponse
    {
        $request->validate(['month' => 'required|date_format:Y-m']);

        return response()->json(['success' => true, 'data' => IncentiveTarget::where('month', $request->input('month'))->get()]);
    }

    /** Replaces the month's targets with the grid as saved. */
    public function saveTargets(Request $request): JsonResponse
    {
        $data = $request->validate([
            'month' => 'required|date_format:Y-m',
            'targets' => 'present|array|max:2000',
            'targets.*.employee_id' => 'nullable|integer|required_without:targets.*.department_id',
            'targets.*.department_id' => 'nullable|integer',
            'targets.*.target_amount' => 'nullable|numeric|min:0|max:9999999999',
            'targets.*.target_qty' => 'nullable|numeric|min:0|max:99999999',
        ]);
        $storeId = $this->storeId($request);
        DB::transaction(function () use ($data, $storeId) {
            IncentiveTarget::where('month', $data['month'])->delete();
            foreach ($data['targets'] as $target) {
                if ((float) ($target['target_amount'] ?? 0) <= 0 && (float) ($target['target_qty'] ?? 0) <= 0) {
                    continue;
                }
                IncentiveTarget::create(['store_id' => $storeId, 'month' => $data['month'], 'employee_id' => $target['employee_id'] ?? null,
                    'department_id' => empty($target['employee_id']) ? ($target['department_id'] ?? null) : null,
                    'target_amount' => $target['target_amount'] ?? null, 'target_qty' => $target['target_qty'] ?? null]);
            }
        });

        return response()->json(['success' => true, 'message' => 'Targets saved.', 'data' => IncentiveTarget::where('month', $data['month'])->get()]);
    }

    public function report(Request $request): JsonResponse
    {
        $request->validate(['month' => 'required|date_format:Y-m', 'employee_id' => 'nullable|integer']);
        $employee = $request->filled('employee_id') ? (int) $request->input('employee_id') : null;

        return response()->json(['success' => true, 'data' => $this->calculator->month($this->storeId($request), (string) $request->input('month'), $employee, (bool) $employee)]);
    }

    public function approve(Request $request): JsonResponse
    {
        $request->validate(['month' => 'required|date_format:Y-m']);

        return response()->json(['success' => true, 'message' => 'Month approved. Payroll will pay these incentives.',
            'data' => $this->calculator->approve($this->storeId($request), (string) $request->input('month'), $request->user())]);
    }

    /** Which rules a product would get for a salesperson on a date (the "Test" box). */
    public function explain(Request $request): JsonResponse
    {
        $request->validate(['product_id' => 'required|integer', 'employee_id' => 'nullable|integer', 'date' => 'nullable|date']);

        return response()->json(['success' => true, 'data' => $this->calculator->explain($this->storeId($request), (int) $request->input('product_id'),
            $request->filled('employee_id') ? (int) $request->input('employee_id') : null, (string) ($request->input('date') ?: now()->toDateString()))]);
    }

    /** Pickers for the rule form: the store's product sections in use, categories, brands and HR sections. */
    public function options(Request $request): JsonResponse
    {
        $storeId = $this->storeId($request);

        return response()->json(['success' => true, 'data' => [
            'sections' => DB::table('products')->whereNotNull('section')->where('section', '!=', '')->distinct()->orderBy('section')->limit(500)->pluck('section'),
            'categories' => DB::table('categories')->orderBy('name')->limit(2000)->get(['id', 'name']),
            'brands' => DB::table('brands')->orderBy('name')->limit(2000)->get(['id', 'name']),
            'departments' => DB::table('hr_departments')->where(fn ($q) => $q->where('store_id', $storeId)->orWhereNull('store_id'))->orderBy('name')->get(['id', 'name']),
            'employees' => DB::table('employees')->where('store_id', $storeId)->where('is_active', true)->orderBy('name')->get(['id', 'code', 'name', 'department_id']),
        ]]);
    }

    private function validatedRule(Request $request): array
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(IncentiveRule::TYPES)],
            'name' => 'required|string|max:150',
            'basis' => ['required_unless:type,target', 'nullable', Rule::in(['percent', 'per_piece'])],
            'value' => 'required_unless:type,target|nullable|numeric|min:0|max:100000',
            'scope_type' => ['required', Rule::in(IncentiveRule::SCOPES)],
            'scope_ids' => 'nullable|array|max:500',
            'scope_ids.*' => 'string|max:150',
            'employee_ids' => 'nullable|array|max:500',
            'employee_ids.*' => 'integer',
            'department_ids' => 'nullable|array|max:200',
            'department_ids.*' => 'integer',
            'min_age_days' => 'required_if:type,ageing|nullable|integer|min:1|max:3650',
            'target_type' => ['required_if:type,target', 'nullable', Rule::in(['amount', 'qty'])],
            'slabs' => 'required_if:type,target|nullable|array|max:20',
            'slabs.*.from' => 'required|numeric|min:0|max:1000',
            'slabs.*.to' => 'nullable|numeric|min:0|max:1000',
            'slabs.*.type' => ['required', Rule::in(['percent', 'amount'])],
            'slabs.*.value' => 'required|numeric|min:0|max:10000000',
            'valid_from' => 'required_if:type,scheme|nullable|date',
            'valid_to' => 'required_if:type,scheme|nullable|date|after_or_equal:valid_from',
            'is_active' => 'boolean',
        ], [
            'valid_from.required_if' => 'A scheme needs its start date.', 'valid_to.required_if' => 'A scheme needs its end date.',
            'min_age_days.required_if' => 'Say how many days in stock count as old stock.', 'slabs.required_if' => 'Add at least one slab.',
        ]);
        if (($data['basis'] ?? null) === 'percent' && (float) ($data['value'] ?? 0) > 100) {
            abort(422, 'A percentage cannot be above 100.');
        }
        if ($data['scope_type'] !== 'all' && empty($data['scope_ids'])) {
            abort(422, 'Choose what the rule applies to.');
        }
        if ($data['type'] === 'target') {
            $data['basis'] = 'percent';
            $data['value'] = 0;
            $data['scope_type'] = 'all';
            $data['scope_ids'] = null;
        }

        return [...$data, 'scope_ids' => $data['scope_type'] === 'all' ? null : array_values($data['scope_ids'] ?? []),
            'employee_ids' => array_values($data['employee_ids'] ?? []) ?: null, 'department_ids' => array_values($data['department_ids'] ?? []) ?: null,
            'is_active' => $data['is_active'] ?? true];
    }

    private function storeId(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');

        return $storeId;
    }
}
