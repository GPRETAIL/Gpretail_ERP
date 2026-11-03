<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Enums\ManualVoucherType;
use App\Http\Controllers\Controller;
use App\Models\LedgerAccount;
use App\Models\Voucher;
use App\Services\Accounting\AccountingReports;
use App\Services\Accounting\ChartOfAccounts;
use App\Services\Accounting\LedgerPoster;
use App\Services\Reports\ReportSummaryService;
use App\Services\Documents\DocumentNumberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Finance > the double-entry books of the selected store: chart of accounts, hand-entered vouchers
 * (payment, receipt, journal, contra) and the reports. Bills, purchases and payments post their own
 * vouchers (LedgerPoster); those can only be changed by changing the document itself.
 */
class AccountingController extends Controller
{

    public function accounts(Request $request): JsonResponse
    {
        $storeId = $this->store($request);
        [, $to] = $this->period($request);
        $groups = collect(ChartOfAccounts::GROUPS)->map(fn ($group, $code) => ['code' => $code] + $group)->values();

        return response()->json(['success' => true, 'data' => AccountingReports::balances($storeId, null, $to)->values(), 'groups' => $groups, 'as_of' => $to]);
    }

    public function storeAccount(Request $request): JsonResponse
    {
        $storeId = $this->store($request);
        $data = $request->validate($this->accountRules($storeId) + ['group_code' => ['required', Rule::in(array_keys(ChartOfAccounts::GROUPS))]]);
        $account = LedgerAccount::create([
            'store_id' => $storeId, 'name' => trim($data['name']), 'group_code' => $data['group_code'], 'notes' => $data['notes'] ?? null,
            'opening_balance' => $this->signedOpening($data), 'is_active' => true, 'created_by' => $request->user()->id,
        ]);

        return response()->json(['success' => true, 'message' => 'Ledger created', 'data' => $account], 201);
    }

    /** Only the fields sent are changed. Automatic and party ledgers keep their group. */
    public function updateAccount(Request $request, int $id): JsonResponse
    {
        $storeId = $this->store($request);
        $account = LedgerAccount::where('store_id', $storeId)->findOrFail($id);
        $data = $request->validate($this->accountRules($storeId, $account->id, true) + ['group_code' => ['sometimes', Rule::in(array_keys(ChartOfAccounts::GROUPS))], 'is_active' => 'sometimes|boolean']);
        if (isset($data['group_code']) && $data['group_code'] !== $account->group_code && ($account->system_key || $account->party_type)) {
            throw ValidationException::withMessages(['group_code' => 'This ledger is used by automatic postings; its group cannot change.']);
        }
        if (array_key_exists('opening_balance', $data)) {
            $data['opening_balance'] = $this->signedOpening($data);
        }
        unset($data['opening_type']);
        $account->fill(array_map(fn ($value) => is_string($value) ? trim($value) : $value, $data))->save();

        return response()->json(['success' => true, 'message' => 'Ledger updated', 'data' => $account]);
    }

    public function destroyAccount(Request $request, int $id): JsonResponse
    {
        $account = LedgerAccount::where('store_id', $this->store($request))->findOrFail($id);
        if ($account->system_key || $account->party_type) {
            throw ValidationException::withMessages(['account' => 'Automatic postings use this ledger; deactivate it instead.']);
        }
        if ($account->lines()->exists()) {
            throw ValidationException::withMessages(['account' => 'This ledger has entries; deactivate it instead of deleting it.']);
        }
        $account->delete();

        return response()->json(['success' => true, 'message' => 'Ledger deleted']);
    }

    public function ledger(Request $request, int $id): JsonResponse
    {
        [$from, $to] = $this->period($request);

        return response()->json(['success' => true, 'data' => AccountingReports::ledger($this->store($request), $id, $from, $to)]);
    }

    public function daybook(Request $request): JsonResponse
    {
        $storeId = $this->store($request);
        [$from, $to] = $this->period($request, true);
        $type = $request->input('type');

        return response()->json(['success' => true, 'data' => AccountingReports::daybook($storeId, $from, $to, $type ?: null), 'from' => $from, 'to' => $to]);
    }

    public function voucher(Request $request, int $id): JsonResponse
    {
        $storeId = $this->store($request);
        $voucher = Voucher::where('store_id', $storeId)->findOrFail($id);
        $date = substr((string) $voucher->voucher_date, 0, 10);
        $data = AccountingReports::daybook($storeId, $date, $date)->firstWhere('id', $voucher->id);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function storeVoucher(Request $request): JsonResponse
    {
        $storeId = $this->store($request);
        $data = $this->validVoucher($request, $storeId);
        $voucher = DB::transaction(function () use ($request, $storeId, $data) {
            $voucher = Voucher::create([
                'store_id' => $storeId, 'voucher_type' => $data['voucher_type'], 'voucher_date' => $data['voucher_date'],
                'voucher_no' => DocumentNumberService::resolve($request, $storeId, ManualVoucherType::from($data['voucher_type'])->prefix()),
                'reference_no' => $data['reference_no'] ?? null, 'narration' => $data['narration'] ?? null,
                'amount' => $data['amount'], 'created_by' => $request->user()->id,
            ]);
            $this->writeLines($voucher, $data['lines']);

            return $voucher;
        });

        return response()->json(['success' => true, 'message' => "Voucher {$voucher->voucher_no} saved", 'data' => $voucher], 201);
    }

    public function updateVoucher(Request $request, int $id): JsonResponse
    {
        $storeId = $this->store($request);
        $voucher = $this->manualVoucher($storeId, $id);
        $data = $this->validVoucher($request, $storeId);
        DB::transaction(function () use ($voucher, $data) {
            $voucher->update(['voucher_type' => $data['voucher_type'], 'voucher_date' => $data['voucher_date'], 'reference_no' => $data['reference_no'] ?? null,
                'narration' => $data['narration'] ?? null, 'amount' => $data['amount']]);
            $voucher->lines()->delete();
            $this->writeLines($voucher, $data['lines']);
        });

        return response()->json(['success' => true, 'message' => "Voucher {$voucher->voucher_no} updated", 'data' => $voucher->fresh()]);
    }

    public function destroyVoucher(Request $request, int $id): JsonResponse
    {
        $voucher = $this->manualVoucher($this->store($request), $id);
        $voucher->delete();

        return response()->json(['success' => true, 'message' => "Voucher {$voucher->voucher_no} deleted"]);
    }

    public function trialBalance(Request $request): JsonResponse
    {
        [$from, $to] = $this->period($request);

        return response()->json(['success' => true, 'data' => AccountingReports::trialBalance($this->store($request), $from, $to) + ['from' => $from, 'to' => $to]]);
    }

    public function profitAndLoss(Request $request): JsonResponse
    {
        [$from, $to] = $this->period($request);

        return response()->json(['success' => true, 'data' => AccountingReports::profitAndLoss($this->store($request), $from, $to)]);
    }

    public function balanceSheet(Request $request): JsonResponse
    {
        [, $to] = $this->period($request);

        return response()->json(['success' => true, 'data' => AccountingReports::balanceSheet($this->store($request), $to)]);
    }

    public function outstanding(Request $request): JsonResponse
    {
        [, $to] = $this->period($request);
        $side = $request->input('side') === 'payable' ? 'payable' : 'receivable';

        return response()->json(['success' => true, 'data' => AccountingReports::outstanding($this->store($request), $side, $to), 'side' => $side, 'as_of' => $to]);
    }

    /** Summary layouts of the Finance reports: Daybook from the voucher lines; Payable/Receivable by age and party. */
    public function summaryLayouts(ReportSummaryService $summaries): JsonResponse
    {
        return response()->json(['success' => true, 'data' => [
            ...$summaries->layouts('finance'),
            'outstanding' => ['dated' => false, 'layouts' => [['value' => 'age', 'label' => 'Days since last entry'], ['value' => 'party', 'label' => 'Top parties']]],
        ]]);
    }

    public function summary(Request $request, string $dataset, ReportSummaryService $summaries): JsonResponse
    {
        $storeId = $this->store($request); // The books are one store's.
        $request->validate(['layout' => 'required|string|max:40']);
        if ($dataset === 'outstanding') {
            return response()->json(['success' => true, 'data' => $this->outstandingSummary($request, $storeId)]);
        }
        [$from, $to] = $this->period($request);

        return response()->json(['success' => true, 'data' => $summaries->run('finance', $dataset, $request->input('layout'), $from, $to, [$storeId])]);
    }

    /** Payable/Receivable grouped by how long since each party's last entry, or its biggest parties. */
    private function outstandingSummary(Request $request, int $storeId): array
    {
        [, $to] = $this->period($request);
        $side = $request->input('side') === 'payable' ? 'payable' : 'receivable';
        $layout = $request->input('layout') === 'party' ? 'party' : 'age';
        $rows = AccountingReports::outstanding($storeId, $side, $to);
        $asOf = Carbon::parse($to);
        $order = ['0-30 days' => 1, '31-60 days' => 2, '61-90 days' => 3, 'Over 90 days' => 4, 'No entries' => 5];
        $groups = $layout === 'party'
            ? $rows->take(50)->map(fn ($row) => ['label' => $row['name'], 'last_entry' => $row['last_entry'] ? substr((string) $row['last_entry'], 0, 10) : null, 'parties' => 1, 'amount' => $row['amount']])
            : $rows->groupBy(function ($row) use ($asOf) {
                $days = $row['last_entry'] ? (int) Carbon::parse($row['last_entry'])->startOfDay()->diffInDays($asOf) : null;

                return match (true) {
                    $days === null => 'No entries', $days <= 30 => '0-30 days', $days <= 60 => '31-60 days', $days <= 90 => '61-90 days', default => 'Over 90 days',
                };
            })->sortBy(fn ($group, $label) => $order[$label])->map(fn ($group, $label) => ['label' => $label, 'parties' => $group->count(), 'amount' => round($group->sum('amount'), 2)]);

        return [
            'dataset' => 'outstanding', 'layout' => $layout, 'layout_label' => $layout === 'party' ? 'Top parties' : 'Days since last entry',
            'group_header' => $layout === 'party' ? ($side === 'payable' ? 'Supplier' : 'Customer') : 'Since last entry', 'dated' => false, 'from' => null, 'to' => $to,
            'columns' => [
                ...($layout === 'party' ? [['key' => 'last_entry', 'label' => 'Last entry', 'type' => 'text']] : []),
                ['key' => 'parties', 'label' => 'Parties', 'type' => 'count'], ['key' => 'amount', 'label' => 'Outstanding', 'type' => 'money'],
            ],
            'rows' => $groups->values()->map(fn ($row, $index) => ['s_no' => $index + 1, ...$row])->all(),
            'totals' => ['parties' => $rows->count(), 'amount' => round($rows->sum('amount'), 2)],
            'capped' => $layout === 'party' && $rows->count() > 50,
        ];
    }

    /** Posts anything of this store's that has no voucher yet or changed since (the nightly job, on demand). */
    public function repost(Request $request): JsonResponse
    {
        $storeId = $this->store($request);
        $failed = Artisan::call('accounting:post', ['--store' => $storeId]) !== 0;
        LedgerPoster::flush();

        return response()->json(['success' => ! $failed, 'message' => $failed
            ? 'Some documents could not be posted; their totals do not add up. Details are in the server log.'
            : 'The books are up to date.', 'output' => trim(Artisan::output())], $failed ? 422 : 200);
    }

    private function store(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id');
        if (! $storeId) {
            throw ValidationException::withMessages(['store' => 'Select a store first; each store keeps its own books.']);
        }

        return $storeId;
    }

    /** [from, to] from the request; from defaults to the start of the Indian financial year (1 April). */
    private function period(Request $request, bool $sameDay = false): array
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date|after_or_equal:from']);
        $today = Carbon::now(config('app.business_timezone'));
        $to = $request->filled('to') ? Carbon::parse($request->input('to'))->toDateString() : $today->toDateString();
        $end = Carbon::parse($to);
        $from = $request->filled('from') ? Carbon::parse($request->input('from'))->toDateString()
            : ($sameDay ? $to : Carbon::create($end->month >= 4 ? $end->year : $end->year - 1, 4, 1)->toDateString());

        return [$from, $to];
    }

    private function accountRules(int $storeId, ?int $ignore = null, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'name' => [$required, 'string', 'max:150', Rule::unique('ledger_accounts', 'name')->where('store_id', $storeId)->ignore($ignore)],
            'opening_balance' => 'sometimes|nullable|numeric|min:0|max:9999999999999',
            'opening_type' => 'sometimes|in:dr,cr',
            'notes' => 'sometimes|nullable|string|max:500',
        ];
    }

    private function signedOpening(array $data): float
    {
        $amount = round((float) ($data['opening_balance'] ?? 0), 2);

        return ($data['opening_type'] ?? 'dr') === 'cr' ? -$amount : $amount;
    }

    private function manualVoucher(int $storeId, int $id): Voucher
    {
        $voucher = Voucher::where('store_id', $storeId)->findOrFail($id);
        if ($voucher->source_type) {
            throw ValidationException::withMessages(['voucher' => 'This voucher was posted from a bill, purchase or payment. Change that document instead.']);
        }

        return $voucher;
    }

    private function validVoucher(Request $request, int $storeId): array
    {
        $data = $request->validate([
            'voucher_type' => ['required', Rule::enum(ManualVoucherType::class)],
            'voucher_date' => 'required|date',
            'reference_no' => 'nullable|string|max:100',
            'narration' => 'nullable|string|max:500',
            'lines' => 'required|array|min:2|max:100',
            'lines.*.ledger_account_id' => 'required|integer',
            'lines.*.debit' => 'nullable|numeric|min:0|max:9999999999999',
            'lines.*.credit' => 'nullable|numeric|min:0|max:9999999999999',
            'lines.*.narration' => 'nullable|string|max:255',
        ]);
        $accounts = DB::table('ledger_accounts')->where('store_id', $storeId)->whereIn('id', array_column($data['lines'], 'ledger_account_id'))->get()->keyBy('id');
        $debit = $credit = 0;
        foreach ($data['lines'] as $index => &$line) {
            $line['debit'] = round((float) ($line['debit'] ?? 0), 2);
            $line['credit'] = round((float) ($line['credit'] ?? 0), 2);
            if (($line['debit'] > 0) === ($line['credit'] > 0)) {
                throw ValidationException::withMessages(["lines.$index.debit" => 'Enter either a debit or a credit amount on each line.']);
            }
            $account = $accounts[$line['ledger_account_id']] ?? null;
            if (! $account || ! $account->is_active) {
                throw ValidationException::withMessages(["lines.$index.ledger_account_id" => 'Choose an active ledger of this store.']);
            }
            $debit += $line['debit'];
            $credit += $line['credit'];
        }
        unset($line);
        if (abs(round($debit - $credit, 2)) >= 0.01) {
            throw ValidationException::withMessages(['lines' => sprintf('Debits (%.2f) and credits (%.2f) must be equal.', $debit, $credit)]);
        }
        $isMoney = fn ($line) => in_array($accounts[$line['ledger_account_id']]->group_code, ['cash', 'bank'], true)
            || in_array($accounts[$line['ledger_account_id']]->system_key, ['card_clearing', 'upi_clearing'], true);
        $type = ManualVoucherType::from($data['voucher_type']);
        if ($type === ManualVoucherType::Contra && collect($data['lines'])->contains(fn ($line) => ! $isMoney($line))) {
            throw ValidationException::withMessages(['lines' => 'A contra voucher only moves money between cash, bank, card and UPI ledgers.']);
        }
        if ($type === ManualVoucherType::Payment && ! collect($data['lines'])->contains(fn ($line) => $line['credit'] > 0 && $isMoney($line))) {
            throw ValidationException::withMessages(['lines' => 'A payment voucher credits a cash or bank ledger (where the money went out from).']);
        }
        if ($type === ManualVoucherType::Receipt && ! collect($data['lines'])->contains(fn ($line) => $line['debit'] > 0 && $isMoney($line))) {
            throw ValidationException::withMessages(['lines' => 'A receipt voucher debits a cash or bank ledger (where the money came in).']);
        }
        $data['amount'] = round($debit, 2);
        $data['voucher_date'] = Carbon::parse($data['voucher_date'])->toDateString(); // Stored as a plain date: reports compare dates as text.

        return $data;
    }

    private function writeLines(Voucher $voucher, array $lines): void
    {
        foreach ($lines as $line) {
            $voucher->lines()->create(['store_id' => $voucher->store_id, 'ledger_account_id' => $line['ledger_account_id'], 'voucher_date' => $voucher->voucher_date,
                'debit' => $line['debit'], 'credit' => $line['credit'], 'narration' => $line['narration'] ?? null]);
        }
    }
}
