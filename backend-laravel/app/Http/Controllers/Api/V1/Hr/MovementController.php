<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrEmployeeMovement;
use App\Services\Hr\HrScope;
use App\Services\Hr\MovementService;
use App\Services\Tenancy\StoreContext;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** HRMS > Promotions & Transfers: dated promotions, transfers, salary revisions and moves to another store. */
class MovementController extends Controller
{
    public function __construct(private readonly MovementService $movements, private readonly HrScope $scope) {}

    public function index(Request $request)
    {
        $rows = $this->scope->apply(HrEmployeeMovement::with('employee:id,name,code'), $request->user())
            ->when($request->query('status'), fn ($q, $status) => $q->whereIn('status', explode(',', strtoupper($status))))
            ->when($request->query('employee_id'), fn ($q, $id) => $q->where('employee_id', $id))
            ->orderByDesc('effective_date')->orderByDesc('id')->limit(1000)->get();

        return response()->json(['success' => true, 'data' => $rows, 'stores' => app(StoreContext::class)->available($request->user())->orderBy('name')->get(['id', 'name'])]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|integer', 'type' => ['required', Rule::in(array_keys(MovementService::FIELDS))],
            'effective_date' => 'required|date_format:Y-m-d', 'values' => 'required|array', 'note' => 'nullable|string|max:255',
            'values.gross_pay' => 'nullable|numeric|min:0', 'values.store_id' => 'nullable|integer',
        ]);
        $employee = $this->scope->apply(Employee::whereKey($data['employee_id']), $request->user(), 'id')->firstOrFail();
        // Only the fields of the type are used (MovementService::FIELDS); the nested rules above don't list them all.
        $values = array_intersect_key((array) $request->input('values'), array_flip(MovementService::FIELDS[$data['type']]));
        $movement = $this->movements->create($employee, $data['type'], $data['effective_date'], $values, $data['note'] ?? null, $request->user());

        return response()->json(['success' => true, 'message' => $movement->status === 'APPLIED' ? 'Change applied' : "Change scheduled for {$data['effective_date']}",
            'data' => $movement->load('employee:id,name,code')], 201);
    }

    public function cancel($id)
    {
        return response()->json(['success' => true, 'message' => 'Change cancelled', 'data' => $this->movements->cancel(HrEmployeeMovement::findOrFail($id))]);
    }
}
