<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveType;
use App\Services\Hr\LeaveService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LeaveTypeController extends Controller
{
    public function __construct(private readonly LeaveService $leave) {}

    public function index(Request $request)
    {
        $this->leave->ensureDefaults($request->attributes->get('store_context_id'));

        return response()->json(['success' => true, 'data' => HrLeaveType::orderBy('id')->get()]);
    }

    public function store(Request $request)
    {
        return response()->json(['success' => true, 'message' => 'Leave type added', 'data' => HrLeaveType::create($this->validated($request))], 201);
    }

    public function update(Request $request, $id)
    {
        $type = HrLeaveType::findOrFail($id);
        $type->update($this->validated($request, $type->id));

        return response()->json(['success' => true, 'message' => 'Leave type updated', 'data' => $type]);
    }

    public function destroy($id)
    {
        $type = HrLeaveType::findOrFail($id);
        if (HrLeaveApplication::where('leave_type_id', $type->id)->exists()) {
            // Applications keep pointing at it; switching it off hides it from new applications instead.
            $type->update(['is_active' => false]);

            return response()->json(['success' => true, 'message' => 'Leave type is in use, so it was switched off instead of deleted']);
        }
        $type->delete();

        return response()->json(['success' => true, 'message' => 'Leave type deleted']);
    }

    private function validated(Request $request, ?int $ignore = null): array
    {
        $storeId = $request->attributes->get('store_context_id');
        if (! $storeId) {
            throw ValidationException::withMessages(['store' => 'Select a store first.']);
        }

        return $request->validate([
            'code' => ['required', 'string', 'max:10', Rule::unique('hr_leave_types', 'code')->where('store_id', $storeId)->ignore($ignore)],
            'name' => 'required|string|max:80',
            'is_paid' => 'boolean', 'allow_half_day' => 'boolean', 'carry_forward' => 'boolean', 'is_active' => 'boolean',
            'max_carry_days' => 'nullable|numeric|min:0|max:365',
            'max_days_per_application' => 'nullable|numeric|min:0.5|max:365',
        ]);
    }
}
