<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrLeavePolicy;
use App\Models\HrLeaveType;
use App\Services\Hr\LeaveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Leave policies: days per year for each leave type. One is the store default for employees without a policy. */
class LeavePolicyController extends Controller
{
    public function __construct(private readonly LeaveService $leave) {}

    public function index(Request $request)
    {
        $this->leave->ensureDefaults($request->attributes->get('store_context_id'));
        $counts = Employee::whereNotNull('leave_policy_id')->selectRaw('leave_policy_id, COUNT(*) AS total')->groupBy('leave_policy_id')->pluck('total', 'leave_policy_id');

        return response()->json(['success' => true, 'data' => HrLeavePolicy::with('items.leaveType:id,code,name')->orderBy('id')->get()
            ->map(fn ($p) => $p->toArray() + ['employees' => (int) ($counts[$p->id] ?? 0)])]);
    }

    public function store(Request $request)
    {
        return response()->json(['success' => true, 'message' => 'Leave policy added', 'data' => $this->save($request, new HrLeavePolicy)], 201);
    }

    public function update(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'Leave policy updated', 'data' => $this->save($request, HrLeavePolicy::findOrFail($id))]);
    }

    public function destroy($id)
    {
        $policy = HrLeavePolicy::findOrFail($id);
        if ($policy->is_default) {
            throw ValidationException::withMessages(['policy' => 'Make another policy the default before deleting this one.']);
        }
        $policy->delete(); // Employees on it fall back to the default policy.

        return response()->json(['success' => true, 'message' => 'Leave policy deleted']);
    }

    /** Credits a year's leave for every active employee (safe to run again; only missing credits are added). */
    public function allocate(Request $request)
    {
        $data = $request->validate(['year' => 'required|integer|min:2000|max:2100']);
        $storeId = $request->attributes->get('store_context_id');
        if (! $storeId) {
            throw ValidationException::withMessages(['store' => 'Select a store first.']);
        }
        $count = $this->leave->allocateYear($storeId, $data['year'], userId: $request->user()->id);

        return response()->json(['success' => true, 'message' => $count ? "{$count} leave credit(s) added for {$data['year']}" : "Leave for {$data['year']} was already allocated"]);
    }

    private function save(Request $request, HrLeavePolicy $policy): HrLeavePolicy
    {
        $data = $request->validate([
            'name' => 'required|string|max:80', 'is_default' => 'boolean',
            'items' => 'array', 'items.*.leave_type_id' => 'required|integer', 'items.*.days_per_year' => 'required|numeric|min:0|max:365',
        ]);
        $types = HrLeaveType::whereIn('id', collect($data['items'] ?? [])->pluck('leave_type_id'))->pluck('id')->all();
        DB::transaction(function () use ($policy, $data, $types) {
            $policy->fill(['name' => $data['name'], 'is_default' => (bool) ($data['is_default'] ?? $policy->is_default)])->save();
            if ($policy->is_default) {
                HrLeavePolicy::where('id', '!=', $policy->id)->update(['is_default' => false]);
            }
            $policy->items()->delete();
            foreach ($data['items'] ?? [] as $item) {
                if (in_array((int) $item['leave_type_id'], $types, true)) {
                    $policy->items()->create(['leave_type_id' => $item['leave_type_id'], 'days_per_year' => $item['days_per_year']]);
                }
            }
        });

        return $policy->load('items.leaveType:id,code,name');
    }
}
