<?php

namespace App\Services\Sales;

use App\Models\CashRegisterSession;
use App\Models\Employee;
use App\Models\PosReturn;
use App\Models\PosSale;
use App\Models\SystemConfiguration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * One counter's cash drawer from Cash Opening to Cash Closing.
 *
 * A session opens with the counted float. While it is open, the drawer takes the cash part of every bill
 * billed on that counter (POS Sales and POS Old both write pos_sales) less the change handed back, and pays
 * out cash refunds. At closing the counted notes are compared with what should be there:
 *   expected = opening + cash sales - cash refunds - counter expenses;  difference = counted - expected.
 * A session without a counter covers bills and returns that have no counter.
 */
class CashRegisterService
{
    /** Notes and coins counted at opening and closing, largest first. */
    public const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

    /** @return array{0: array<string, int>, 1: float} the counts keyed by note and their total */
    public static function countDenominations(array $input): array
    {
        $counts = [];
        $total = 0;
        foreach (self::DENOMINATIONS as $note) {
            $count = max(0, (int) ($input['count_'.$note] ?? 0));
            $counts[(string) $note] = $count;
            $total += $count * $note;
        }

        return [$counts, (float) $total];
    }

    public function openSession(int $storeId, ?int $counterId): ?CashRegisterSession
    {
        return CashRegisterSession::where('store_id', $storeId)
            ->where('status', 'OPEN')
            ->when($counterId, fn ($q) => $q->where('counter_id', $counterId), fn ($q) => $q->whereNull('counter_id'))
            ->orderByDesc('id')
            ->first();
    }

    /** @return list<int> counters of this store whose drawer is open */
    public function openCounterIds(int $storeId): array
    {
        return CashRegisterSession::where('store_id', $storeId)->where('status', 'OPEN')->whereNotNull('counter_id')
            ->pluck('counter_id')->map(fn ($id) => (int) $id)->unique()->values()->all();
    }

    public function open(int $storeId, int $userId, array $data): CashRegisterSession
    {
        $counterId = isset($data['counterId']) ? (int) $data['counterId'] : null;
        [$counts, $counted] = self::countDenominations($data);
        // Another client may send the amount itself instead of the note counts.
        $openingCash = array_key_exists('opening_cash', $data) && ! array_sum($counts) ? (float) $data['opening_cash'] : $counted;

        return DB::transaction(function () use ($storeId, $userId, $data, $counterId, $counts, $openingCash) {
            $this->lockCounter($storeId, $counterId);
            if ($this->openSession($storeId, $counterId)) {
                throw ValidationException::withMessages(['counterId' => $this->counterLabel($counterId).' is already open. Close it in Cash Closing before opening it again.']);
            }

            return CashRegisterSession::create([
                'store_id' => $storeId,
                'user_id' => $userId,
                'counter_id' => $counterId,
                'location_id' => ($data['locationId'] ?? null) ?: null,
                'paid_by_employee_id' => ($data['paidByEmployeeId'] ?? null) ?: null,
                'cashier_employee_id' => ($data['cashierEmployeeId'] ?? null) ?: null,
                'opened_at' => now(),
                'opening_cash' => $openingCash,
                'opening_denominations' => $counts,
                'status' => 'OPEN',
                'notes' => $data['notes'] ?? null,
            ]);
        });
    }

    /**
     * The cash that should be in an open drawer before counter expenses.
     *
     * @return array{opening: float, cash_sales: float, cash_refunds: float, expected_before_expenses: float}
     */
    public function position(CashRegisterSession $session, ?Carbon $until = null): array
    {
        $until ??= now();
        $sales = PosSale::where('store_id', $session->store_id)
            ->where('sale_date', '>=', $session->opened_at)->where('sale_date', '<=', $until)
            ->when($session->counter_id, fn ($q) => $q->where('counter_id', $session->counter_id), fn ($q) => $q->whereNull('counter_id'));
        $saleIds = (clone $sales)->select('id');
        $cashTaken = (float) DB::table('pos_payments')->whereIn('pos_sale_id', $saleIds)->where('payment_mode', 'CASH')->sum('amount');
        $changeGiven = (float) (clone $sales)->sum('change_amount');

        // A return paid out in cash leaves the drawer. One applied as credit to a new bill only leaves it by
        // the part the bill didn't use up.
        $returns = PosReturn::where('store_id', $session->store_id)->where('refund_mode', 'CASH')
            ->where('return_date', '>=', $session->opened_at)->where('return_date', '<=', $until)
            ->when($session->counter_id, fn ($q) => $q->where('counter_id', $session->counter_id), fn ($q) => $q->whereNull('counter_id'))
            ->get(['total_refund', 'credit_applied_to_sale_id']);
        $appliedTo = PosSale::whereIn('id', $returns->pluck('credit_applied_to_sale_id')->filter())->pluck('grand_total', 'id');
        $cashRefunds = $returns->sum(fn ($return) => $return->credit_applied_to_sale_id
            ? max(0, (float) $return->total_refund - (float) ($appliedTo[$return->credit_applied_to_sale_id] ?? 0))
            : (float) $return->total_refund);

        $opening = (float) $session->opening_cash;
        $cashSales = round($cashTaken - $changeGiven, 2);
        $cashRefunds = round($cashRefunds, 2);

        return [
            'opening' => $opening,
            'cash_sales' => $cashSales,
            'cash_refunds' => $cashRefunds,
            'expected_before_expenses' => round($opening + $cashSales - $cashRefunds, 2),
        ];
    }

    public function close(int $storeId, array $data): CashRegisterSession
    {
        $counterId = isset($data['counterId']) ? (int) $data['counterId'] : null;
        [$counts, $counted] = self::countDenominations($data);
        $closingCash = array_key_exists('closing_cash', $data) && ! array_sum($counts) ? (float) $data['closing_cash'] : $counted;
        $expenses = round(max(0, (float) ($data['counterExpenses'] ?? 0)), 2);

        return DB::transaction(function () use ($storeId, $data, $counterId, $counts, $closingCash, $expenses) {
            $this->lockCounter($storeId, $counterId);
            $session = $this->openSession($storeId, $counterId);
            if (! $session) {
                throw ValidationException::withMessages(['counterId' => $this->counterLabel($counterId).' is not open. Open it in Cash Opening first.']);
            }
            $closedAt = now();
            $position = $this->position($session, $closedAt);
            $expected = round($position['expected_before_expenses'] - $expenses, 2);
            $session->update([
                'closed_at' => $closedAt,
                'closing_cash' => $closingCash,
                'closing_denominations' => $counts,
                'counter_expenses' => $expenses,
                'cash_sales' => $position['cash_sales'],
                'cash_refunds' => $position['cash_refunds'],
                'expected_cash' => $expected,
                'difference' => round($closingCash - $expected, 2),
                'received_by_employee_id' => ($data['receivedByEmployeeId'] ?? null) ?: null,
                'cashier_employee_id' => ($data['cashierEmployeeId'] ?? null) ?: $session->cashier_employee_id,
                'notes' => trim((string) ($data['notes'] ?? '')) ?: $session->notes,
                'status' => 'CLOSED',
                'closing_no' => $this->nextClosingNo($storeId),
            ]);

            return $session->refresh();
        });
    }

    public function nextClosingNo(int $storeId): int
    {
        return (int) CashRegisterSession::where('store_id', $storeId)->max('closing_no') + 1;
    }

    /** Dropdown options: the store's active counters, locations and employees. */
    public function configOptions(string $type): Collection
    {
        return SystemConfiguration::where('is_active', true)
            ->where(fn ($q) => $q->where('key', $type)->orWhere('config_key', $type)->orWhere('group', $type)->orWhere('group_name', $type))
            ->orderBy('id')->get()
            ->map(fn ($row) => ['id' => $row->id, 'name' => $row->value ?? $row->config_value]);
    }

    public function employeeOptions(): Collection
    {
        return Employee::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
            ->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'employee_code' => $row->code]);
    }

    /** Serialises opening and closing of the same counter so two tills can't open or close it at once. */
    private function lockCounter(int $storeId, ?int $counterId): void
    {
        CashRegisterSession::where('store_id', $storeId)
            ->when($counterId, fn ($q) => $q->where('counter_id', $counterId), fn ($q) => $q->whereNull('counter_id'))
            ->lockForUpdate()->get(['id']);
    }

    private function counterLabel(?int $counterId): string
    {
        $name = $counterId ? SystemConfiguration::whereKey($counterId)->value('value') : null;

        return $name ? "Counter {$name}" : 'This counter';
    }
}
