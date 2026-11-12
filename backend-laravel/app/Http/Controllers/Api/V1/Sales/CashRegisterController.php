<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreCashClosingRequest;
use App\Http\Requests\Sales\StoreCashOpeningRequest;
use App\Models\CashRegisterSession;
use App\Services\Dashboards\DashboardBroadcastService;
use App\Services\Sales\CashRegisterService;
use App\Support\PaginationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Sales > Cash Opening and Cash Closing (and POS Old's Close): one counter's drawer per session. The
 * response shapes follow the two screens (features/sales/settlement); the cash math is CashRegisterService.
 */
class CashRegisterController extends Controller
{
    public function __construct(
        private readonly PaginationService $paginationService,
        private readonly CashRegisterService $registers,
    ) {}

    private const LIST_RELATIONS = ['user:id,name', 'counter:id,value,config_value', 'location:id,value,config_value',
        'paidBy:id,name,code', 'cashier:id,name,code', 'receivedBy:id,name,code'];

    // Cash Opening list
    public function openingIndex(Request $request)
    {
        $storeId = $this->resolveStoreId($request, 1);
        $query = $this->filtered(CashRegisterSession::with(self::LIST_RELATIONS)->where('store_id', $storeId), $request)
            ->when($request->filled('paidByEmployeeId'), fn ($q) => $q->where('paid_by_employee_id', $request->integer('paidByEmployeeId')))
            ->when($request->filled('locationId'), fn ($q) => $q->where('location_id', $request->integer('locationId')))
            ->when($request->filled('date'), fn ($q) => $q->whereDate('opened_at', $request->input('date')));

        if ($request->boolean('all')) {
            $sessions = $query->orderBy('opened_at', 'desc')->limit(1000)->get()->map(fn ($s) => $this->row($s));

            return response()->json(['success' => true, 'data' => $sessions, 'total' => $sessions->count()]);
        }

        return response()->json($this->rows($this->paginationService->paginate($query, 'cash_register_sessions', $request, [
            'default_sort' => 'id', 'default_order' => 'desc', 'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'opened_at', 'closed_at', 'status', 'created_at'],
        ])));
    }

    // Cash Opening action: the counted float opens the counter's drawer.
    public function openingStore(StoreCashOpeningRequest $request)
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        $session = $this->registers->open($storeId, (int) ($request->user()->id ?? 1), $request->all());
        DashboardBroadcastService::cashPositionUpdated($storeId);

        return response()->json([
            'success' => true,
            'message' => 'Cash register opened successfully',
            'data' => $this->row($session->load(self::LIST_RELATIONS)),
        ], 201);
    }

    public function openingMeta(Request $request)
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        $employees = $this->registers->employeeOptions();
        $last = CashRegisterSession::where('store_id', $storeId)->orderByDesc('id')->first();

        return response()->json([
            'success' => true,
            'data' => [
                'locations' => $this->registers->configOptions('location'),
                'counters' => $this->registers->configOptions('counter'),
                'paidByEmployees' => $employees,
                'cashiers' => $employees,
                'openCounterIds' => $this->registers->openCounterIds($storeId),
                // Kept for older callers.
                'has_open_session' => $last?->status === 'OPEN',
                'last_closing_cash' => $last?->closing_cash ?? 0,
            ],
        ]);
    }

    // Cash Closing list
    public function closingIndex(Request $request)
    {
        $storeId = $this->resolveStoreId($request, 1);
        $query = $this->filtered(CashRegisterSession::with(self::LIST_RELATIONS)->where('store_id', $storeId)->where('status', 'CLOSED'), $request)
            ->when($request->filled('receivedByEmployeeId'), fn ($q) => $q->where('received_by_employee_id', $request->integer('receivedByEmployeeId')))
            ->when($request->filled('billNo'), fn ($q) => $q->where('closing_no', (int) preg_replace('/\D/', '', (string) $request->input('billNo'))))
            ->when($request->filled('date'), fn ($q) => $q->whereDate('closed_at', $request->input('date')));

        if ($request->boolean('all')) {
            $sessions = $query->orderBy('closed_at', 'desc')->limit(1000)->get()->map(fn ($s) => $this->row($s));

            return response()->json(['success' => true, 'data' => $sessions, 'total' => $sessions->count()]);
        }

        return response()->json($this->rows($this->paginationService->paginate($query, 'cash_register_sessions', $request, [
            'default_sort' => 'id', 'default_order' => 'desc', 'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'opened_at', 'closed_at', 'status', 'created_at'],
        ])));
    }

    // Cash Closing action: the counted drawer closes the counter's open session.
    public function closingStore(StoreCashClosingRequest $request)
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        $session = $this->registers->close($storeId, $request->all());
        DashboardBroadcastService::cashPositionUpdated($storeId);

        return response()->json([
            'success' => true,
            'message' => 'Cash register closed successfully',
            'data' => $this->row($session->load(self::LIST_RELATIONS)),
        ]);
    }

    public function closingMeta(Request $request)
    {
        $employees = $this->registers->employeeOptions();

        return response()->json([
            'success' => true,
            'data' => [
                'counters' => $this->registers->configOptions('counter'),
                'receivedByEmployees' => $employees,
                'cashiers' => $employees,
                'openCounterIds' => $this->registers->openCounterIds((int) $this->resolveStoreId($request, 1)),
            ],
        ]);
    }

    public function closingNextBillNo(Request $request)
    {
        $next = $this->registers->nextClosingNo((int) $this->resolveStoreId($request, 1));

        return response()->json(['success' => true, 'data' => ['billNo' => $next], 'next_bill_no' => $next]);
    }

    /** The open drawer of a counter and the cash that should be in it so far (before counter expenses). */
    public function openingAmount(Request $request)
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        $counterId = $request->filled('counterId') ? $request->integer('counterId') : null;
        $session = $this->registers->openSession($storeId, $counterId);
        $position = $session ? $this->registers->position($session) : null;

        return response()->json([
            'success' => true,
            'data' => [
                'sessionId' => $session?->id,
                'openedAt' => $session?->opened_at,
                'openingAmount' => $position['opening'] ?? 0,
                'cashSales' => $position['cash_sales'] ?? 0,
                'cashRefunds' => $position['cash_refunds'] ?? 0,
                'expectedBeforeExpenses' => $position['expected_before_expenses'] ?? 0,
                'opening_cash' => $position['opening'] ?? 0,
            ],
        ]);
    }

    private function filtered(Builder $query, Request $request): Builder
    {
        $search = trim((string) $request->input('search', ''));

        return $query
            ->when($request->filled('counterId'), fn ($q) => $q->where('counter_id', $request->integer('counterId')))
            ->when($request->filled('cashierEmployeeId'), fn ($q) => $q->where('cashier_employee_id', $request->integer('cashierEmployeeId')))
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w->where('notes', 'like', "%{$search}%")
                ->orWhereHas('cashier', fn ($e) => $e->where('name', 'like', "%{$search}%"))
                ->orWhereHas('counter', fn ($c) => $c->where('value', 'like', "%{$search}%"))
                ->orWhere('closing_no', ctype_digit($search) ? (int) $search : -1)));
    }

    private function rows(array $result): array
    {
        $result['data'] = array_map(fn ($session) => $this->row($session), $result['data'] ?? []);

        return $result;
    }

    /**
     * A session as the Cash Opening / Cash Closing lists and the sales reports read it: counter and location as
     * {id, name}, people as {id, name, employee_code}, plus opening_at / closing_at / bill_no / amounts.
     */
    private function row(CashRegisterSession $session): array
    {
        $person = fn ($employee) => $employee ? ['id' => $employee->id, 'name' => $employee->name, 'employee_code' => $employee->code] : null;
        $config = fn ($row) => $row ? ['id' => $row->id, 'name' => $row->value ?? $row->config_value] : null;

        // These replace the loaded relations of the same name (counter, location, cashier, paidBy, receivedBy).
        return array_merge($session->toArray(), [
            'opening_at' => $session->opened_at,
            'closing_at' => $session->closed_at,
            'bill_no' => $session->closing_no,
            'counter' => $config($session->counter),
            'location' => $config($session->location),
            'paidBy' => $person($session->paidBy),
            'cashier' => $person($session->cashier) ?? ($session->user ? ['id' => null, 'name' => $session->user->name, 'employee_code' => null] : null),
            'receivedBy' => $person($session->receivedBy),
            'amount' => (float) $session->opening_cash,
            'opening_amount' => (float) $session->opening_cash,
            'closing_amount' => $session->closing_cash === null ? null : (float) $session->closing_cash,
        ]);
    }
}
