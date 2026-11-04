<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\HrSeparation;
use App\Models\HrSettlement;
use App\Models\Store;
use App\Services\Hr\HrScope;
use App\Services\Hr\SettlementService;
use Illuminate\Http\Request;

/** HRMS > Full & Final: settle what is owed to (and by) someone who left, post it, and pay it. */
class FinalSettlementController extends Controller
{
    public function __construct(private readonly SettlementService $settlements, private readonly HrScope $scope) {}

    /** Settlements, and accepted exits still waiting for one. */
    public function index(Request $request)
    {
        $settlements = $this->scope->apply(HrSettlement::with('employee:id,name,code'), $request->user())->latest('id')->limit(1000)->get();
        $waiting = $this->scope->apply(HrSeparation::with('employee:id,name,code'), $request->user())->whereIn('status', ['ACCEPTED', 'RELIEVED'])
            ->whereNotIn('id', $settlements->pluck('separation_id'))->orderBy('last_working_day')->get();

        return response()->json(['success' => true, 'data' => [
            'settlements' => $settlements->map(fn ($s) => $this->present($s)),
            'waiting' => $waiting->map(fn ($s) => ['separation_id' => $s->id, 'employee_id' => $s->employee_id, 'employee_name' => $s->employee?->name,
                'employee_code' => $s->employee?->code, 'type' => $s->type, 'last_working_day' => $s->last_working_day?->toDateString(), 'status' => $s->status]),
        ]]);
    }

    public function show(Request $request, $id)
    {
        return response()->json(['success' => true, 'data' => $this->present($this->scoped($request, $id))]);
    }

    /** Works a settlement out (again) for an exit, with HR's leave days, notice waiver and extra lines. */
    public function prepare(Request $request)
    {
        $data = $request->validate([
            'separation_id' => 'required|integer', 'notice_waived' => 'boolean',
            'encash_days' => 'array', 'encash_days.*' => 'numeric|min:0|max:365',
            'adjustments' => 'array|max:20', 'adjustments.*.type' => 'required|in:EARNING,DEDUCTION', 'adjustments.*.name' => 'required|string|max:60',
            'adjustments.*.amount' => 'required|numeric|min:0|max:10000000',
        ]);
        $separation = HrSeparation::findOrFail($data['separation_id']);
        abort_unless($this->scope->canSee($request->user(), $separation->employee_id), 404);

        return response()->json(['success' => true, 'message' => 'Settlement worked out',
            'data' => $this->present($this->settlements->prepare($separation, $request->user(), collect($data)->except('separation_id')->all()))]);
    }

    public function submit(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'Settlement submitted and posted; the employee is relieved',
            'data' => $this->present($this->settlements->submit($this->scoped($request, $id), $request->user()))]);
    }

    public function markPaid(Request $request, $id)
    {
        $data = $request->validate(['paid_on' => 'required|date_format:Y-m-d', 'pay_mode' => 'required|in:CASH,BANK']);

        return response()->json(['success' => true, 'message' => 'Settlement paid',
            'data' => $this->present($this->settlements->markPaid($this->scoped($request, $id), $data['paid_on'], $data['pay_mode']))]);
    }

    public function reopen(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'Settlement reopened as a draft', 'data' => $this->present($this->settlements->reopen($this->scoped($request, $id)))]);
    }

    private function scoped(Request $request, $id): HrSettlement
    {
        $settlement = HrSettlement::findOrFail($id);
        abort_unless($this->scope->canSee($request->user(), $settlement->employee_id), 404);

        return $settlement;
    }

    private function present(HrSettlement $settlement): array
    {
        $settlement->loadMissing('employee:id,name,code,joining_date,designation_id,master_details', 'employee.designation:id,name', 'separation');
        $employee = $settlement->employee;
        $details = $employee?->master_details ?? [];

        return collect($settlement->toArray())->except(['employee', 'separation'])->all() + [
            'employee_name' => $employee?->name, 'employee_code' => $employee?->code, 'designation' => $employee?->designation?->name,
            'joining_date' => $employee?->joining_date?->toDateString(), 'type' => $settlement->separation?->type,
            'applied_on' => $settlement->separation?->applied_on?->toDateString(),
            'store' => ($store = Store::find($settlement->store_id)) ? ['name' => $store->name, 'address' => trim(implode(', ', array_filter([$store->address, $store->city]))), 'phone' => $store->phone] : null,
            'bank' => ['account_name' => $details['bank_account_name'] ?? null, 'account_no' => $details['bank_account_no'] ?? null, 'ifsc' => $details['bank_ifsc'] ?? null],
        ];
    }
}
