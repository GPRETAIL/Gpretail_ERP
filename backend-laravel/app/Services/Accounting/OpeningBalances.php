<?php

namespace App\Services\Accounting;

use App\Models\Customer;
use App\Models\OpeningBill;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Finance > Opening Balance: what each ledger stood at when the store started its books, and the bills customers and
 * suppliers owed then. A party with opening bills gets its ledger's opening from them (customer: debit, supplier:
 * credit), so the books, the Receivable/Payable reports and the bills always agree.
 */
class OpeningBalances
{
    /** Every ledger with its opening (+ debit), and for party ledgers how many opening bills set it. */
    public function ledgers(int $storeId): array
    {
        ChartOfAccounts::ensure($storeId);
        $billCounts = DB::table('opening_bills')->where('store_id', $storeId)->groupBy('party_type', 'party_id')
            ->selectRaw('party_type, party_id, COUNT(*) as n')->get()->mapWithKeys(fn ($r) => [$r->party_type.':'.$r->party_id => (int) $r->n]);
        $rows = DB::table('ledger_accounts')->where('store_id', $storeId)->orderBy('group_code')->orderBy('name')->get()
            ->map(fn ($a) => [
                'id' => $a->id, 'name' => $a->name, 'group_code' => $a->group_code, 'group_name' => ChartOfAccounts::GROUPS[$a->group_code]['name'] ?? $a->group_code,
                'nature' => ChartOfAccounts::GROUPS[$a->group_code]['nature'] ?? 'asset', 'party_type' => $a->party_type, 'party_id' => $a->party_id,
                'system_key' => $a->system_key, 'is_active' => (bool) $a->is_active, 'opening_balance' => round((float) $a->opening_balance, 2),
                'bills' => (int) ($a->party_type ? ($billCounts[$a->party_type.':'.$a->party_id] ?? 0) : 0),
            ]);

        return ['rows' => $rows->values(), ...$this->totals($rows)];
    }

    /**
     * Sets the openings of many ledgers at once. rows: [{id, opening_balance (+ debit)}]. A party ledger whose opening
     * comes from opening bills is changed through its bills.
     */
    public function saveLedgers(int $storeId, array $rows): array
    {
        $ids = array_map(fn ($row) => (int) $row['id'], $rows);
        $accounts = DB::table('ledger_accounts')->where('store_id', $storeId)->whereIn('id', $ids)->get()->keyBy('id');
        $billed = DB::table('opening_bills')->where('store_id', $storeId)->get(['party_type', 'party_id'])
            ->map(fn ($b) => $b->party_type.':'.$b->party_id)->unique()->flip();
        DB::transaction(function () use ($rows, $accounts, $billed) {
            foreach ($rows as $row) {
                $account = $accounts[(int) $row['id']] ?? null;
                if (! $account) {
                    throw ValidationException::withMessages(['rows' => 'A ledger in the list belongs to another store.']);
                }
                $amount = round((float) $row['opening_balance'], 2);
                if (abs($amount - (float) $account->opening_balance) < 0.005) {
                    continue;
                }
                if ($account->party_type && isset($billed[$account->party_type.':'.$account->party_id])) {
                    throw ValidationException::withMessages(['rows' => "{$account->name}: the opening comes from its opening bills. Change the bills instead."]);
                }
                DB::table('ledger_accounts')->where('id', $account->id)->update(['opening_balance' => $amount, 'updated_at' => now()]);
            }
        });

        return $this->ledgers($storeId);
    }

    /** Opening bills of one side, with the party's name and what is still due. */
    public function bills(int $storeId, string $partyType): Collection
    {
        $bills = OpeningBill::where('store_id', $storeId)->where('party_type', $partyType)->orderBy('bill_date')->orderBy('id')->get();
        $parties = $this->parties($partyType)->whereIn('id', $bills->pluck('party_id')->unique())->get(['id', 'name', 'phone'])->keyBy('id');

        return $bills->map(fn (OpeningBill $bill) => $this->present($bill, $parties[$bill->party_id] ?? null))->values();
    }

    public function present(OpeningBill $bill, ?object $party = null): array
    {
        return [
            'id' => $bill->id, 'party_type' => $bill->party_type, 'party_id' => $bill->party_id, 'party_name' => $party->name ?? null,
            'party_phone' => $party->phone ?? null, 'bill_no' => $bill->bill_no, 'bill_date' => $bill->bill_date?->toDateString(),
            'due_date' => $bill->due_date?->toDateString(), 'amount' => (float) $bill->amount, 'paid_amount' => (float) $bill->paid_amount,
            'balance' => $bill->balance(), 'notes' => $bill->notes,
        ];
    }

    /** Adds or changes an opening bill and re-sets the party ledger's opening. */
    public function saveBill(int $storeId, array $data, ?int $userId, ?OpeningBill $bill = null): OpeningBill
    {
        abort_unless($this->parties($data['party_type'])->whereKey($data['party_id'])->exists(), 422, 'Choose a '.($data['party_type'] === 'supplier' ? 'supplier' : 'customer').' of this store.');
        $duplicate = OpeningBill::where('store_id', $storeId)->where('party_type', $data['party_type'])->where('party_id', $data['party_id'])
            ->where('bill_no', $data['bill_no'])->when($bill, fn ($q) => $q->whereKeyNot($bill->id))->exists();
        if ($duplicate) {
            throw ValidationException::withMessages(['bill_no' => "Bill {$data['bill_no']} is already entered for this party."]);
        }
        if ($bill && round((float) $data['amount'], 2) < (float) $bill->paid_amount) {
            throw ValidationException::withMessages(['amount' => 'The bill has '.number_format((float) $bill->paid_amount, 2).' paid already; the amount cannot be less.']);
        }
        if ($bill && (int) $bill->party_id !== (int) $data['party_id'] && (float) $bill->paid_amount > 0) {
            throw ValidationException::withMessages(['party_id' => 'Payments are recorded against this bill; its party cannot change.']);
        }

        return DB::transaction(function () use ($storeId, $data, $userId, $bill) {
            $previous = $bill ? [$bill->party_type, (int) $bill->party_id] : null;
            $bill ??= new OpeningBill(['store_id' => $storeId, 'created_by' => $userId]);
            $bill->fill([
                'store_id' => $storeId, 'party_type' => $data['party_type'], 'party_id' => $data['party_id'], 'bill_no' => trim($data['bill_no']),
                'bill_date' => $data['bill_date'], 'due_date' => $data['due_date'] ?? null, 'amount' => round((float) $data['amount'], 2), 'notes' => $data['notes'] ?? null,
            ])->save();
            if ($previous && $previous !== [$bill->party_type, (int) $bill->party_id]) {
                $this->syncParty($storeId, ...$previous);
            }
            $this->syncParty($storeId, $bill->party_type, (int) $bill->party_id);

            return $bill;
        });
    }

    public function deleteBill(int $storeId, OpeningBill $bill): void
    {
        if ((float) $bill->paid_amount > 0) {
            throw ValidationException::withMessages(['bill' => 'Payments are recorded against this bill; it cannot be deleted.']);
        }
        DB::transaction(function () use ($storeId, $bill) {
            $bill->delete();
            $this->syncParty($storeId, $bill->party_type, (int) $bill->party_id);
        });
    }

    /**
     * Excel import: rows [{party_type, party (name, phone or code), bill_no, bill_date, due_date?, amount}]. Rows whose party
     * is not found or whose bill is already entered are skipped and reported; the rest are added.
     */
    public function import(int $storeId, array $rows, ?int $userId): array
    {
        $added = 0;
        $skipped = [];
        foreach ($rows as $index => $row) {
            $line = $index + 2; // Row 1 of the sheet is the header.
            $type = strtolower(trim((string) ($row['party_type'] ?? $row['type'] ?? ''))) === 'supplier' ? 'supplier' : 'customer';
            $partyId = $this->findParty($type, trim((string) ($row['party'] ?? $row['party_name'] ?? $row['name'] ?? '')));
            $amount = (float) ($row['amount'] ?? 0);
            $billNo = trim((string) ($row['bill_no'] ?? ''));
            $date = $this->date($row['bill_date'] ?? null);
            if (! $partyId || $billNo === '' || $amount <= 0 || ! $date) {
                $skipped[] = "Row $line: ".(! $partyId ? 'party not found' : ($billNo === '' ? 'no bill number' : ($amount <= 0 ? 'no amount' : 'no valid bill date')));

                continue;
            }
            try {
                $this->saveBill($storeId, ['party_type' => $type, 'party_id' => $partyId, 'bill_no' => $billNo, 'bill_date' => $date,
                    'due_date' => $this->date($row['due_date'] ?? null), 'amount' => $amount, 'notes' => $row['notes'] ?? null], $userId);
                $added++;
            } catch (ValidationException $e) {
                $skipped[] = "Row $line: ".collect($e->errors())->flatten()->first();
            }
        }

        return ['added' => $added, 'skipped' => $skipped];
    }

    /** Sets a party ledger's opening to its opening bills' total (customer: debit, supplier: credit). */
    public function syncParty(int $storeId, string $type, int $partyId): void
    {
        $total = round((float) DB::table('opening_bills')->where('store_id', $storeId)->where('party_type', $type)->where('party_id', $partyId)->sum('amount'), 2);
        $name = (string) $this->parties($type)->withoutGlobalScopes()->whereKey($partyId)->value('name');
        $ledger = ChartOfAccounts::party($storeId, $type, $partyId, $name);
        DB::table('ledger_accounts')->where('id', $ledger)->update(['opening_balance' => $type === 'supplier' ? -$total : $total, 'updated_at' => now()]);
    }

    /** Customers or suppliers of the selected store (the models carry the store scope; DB::table would not). */
    private function parties(string $type): Builder
    {
        return $type === 'supplier' ? Supplier::query() : Customer::query();
    }

    private function totals(Collection $rows): array
    {
        $debit = round($rows->sum(fn ($r) => max(0, $r['opening_balance'])), 2);
        $credit = round($rows->sum(fn ($r) => max(0, -$r['opening_balance'])), 2);

        return ['total_debit' => $debit, 'total_credit' => $credit, 'difference' => round($debit - $credit, 2)];
    }

    private function findParty(string $type, string $text): ?int
    {
        if ($text === '') {
            return null;
        }
        // Name, phone or code; store-scoped through the model, so another store's party never matches.
        $ids = $this->parties($type)->where(fn ($q) => $q->whereRaw('LOWER(name) = ?', [mb_strtolower($text)])
            ->orWhere('phone', $text)->orWhere('code', $text))->limit(2)->pluck('id');

        return $ids->count() === 1 ? (int) $ids->first() : null;
    }

    private function date(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) { // An Excel serial day number.
            return Carbon::create(1899, 12, 30)->addDays((int) $value)->toDateString();
        }
        foreach (['Y-m-d', 'd-m-Y', 'd/m/Y', 'd.m.Y'] as $format) {
            try {
                $date = Carbon::createFromFormat('!'.$format, trim((string) $value));
                if ($date && $date->format($format) === trim((string) $value)) {
                    return $date->toDateString();
                }
            } catch (\Throwable) {
            }
        }

        return null;
    }
}
