<?php

namespace App\Services\Accounting;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Ledger statement, daybook, trial balance, Trading / Profit & Loss account and Balance Sheet for one store. */
class AccountingReports
{
    /**
     * Every ledger with its opening balance at $from (its own opening balance plus everything before),
     * the period's debits and credits, and the closing balance at $to. Balances are signed: + is debit.
     */
    public static function balances(int $storeId, ?string $from, string $to): Collection
    {
        ChartOfAccounts::ensure($storeId);
        $before = $from
            ? DB::table('voucher_lines')->where('store_id', $storeId)->where('voucher_date', '<', $from)
                ->groupBy('ledger_account_id')->selectRaw('ledger_account_id, SUM(debit) - SUM(credit) as net')->pluck('net', 'ledger_account_id')
            : collect();
        $period = DB::table('voucher_lines')->where('store_id', $storeId)->when($from, fn ($q) => $q->where('voucher_date', '>=', $from))
            ->where('voucher_date', '<=', $to)->groupBy('ledger_account_id')
            ->selectRaw('ledger_account_id, SUM(debit) as debit, SUM(credit) as credit')->get()->keyBy('ledger_account_id');

        return DB::table('ledger_accounts')->where('store_id', $storeId)->orderBy('name')->get()->map(function ($account) use ($before, $period) {
            $group = ChartOfAccounts::GROUPS[$account->group_code] ?? ['name' => $account->group_code, 'nature' => 'asset', 'section' => 'bs'];
            $opening = round((float) $account->opening_balance + (float) ($before[$account->id] ?? 0), 2);
            $debit = round((float) ($period[$account->id]->debit ?? 0), 2);
            $credit = round((float) ($period[$account->id]->credit ?? 0), 2);

            return [
                'id' => $account->id, 'name' => $account->name, 'group_code' => $account->group_code, 'group_name' => $group['name'],
                'nature' => $group['nature'], 'section' => $group['section'], 'system_key' => $account->system_key,
                'party_type' => $account->party_type, 'party_id' => $account->party_id, 'is_active' => (bool) $account->is_active,
                'opening_balance' => round((float) $account->opening_balance, 2), 'notes' => $account->notes,
                'opening' => $opening, 'debit' => $debit, 'credit' => $credit, 'closing' => round($opening + $debit - $credit, 2),
            ];
        });
    }

    public static function trialBalance(int $storeId, ?string $from, string $to): array
    {
        $rows = self::balances($storeId, $from, $to)->filter(fn ($row) => abs($row['closing']) >= 0.01 || $row['debit'] || $row['credit'])->values();
        $openingGap = round((float) DB::table('ledger_accounts')->where('store_id', $storeId)->sum('opening_balance'), 2);

        return [
            'rows' => $rows,
            'total_debit' => round($rows->sum(fn ($row) => max(0, $row['closing'])), 2),
            'total_credit' => round($rows->sum(fn ($row) => max(0, -$row['closing'])), 2),
            // Opening balances someone entered by hand that don't net to zero (Tally shows the same line).
            'opening_difference' => $openingGap,
        ];
    }

    /** Trading account (gross profit) and Profit & Loss account (net profit) for a period. */
    public static function profitAndLoss(int $storeId, string $from, string $to): array
    {
        $rows = self::balances($storeId, $from, $to);
        $line = fn ($row) => ['account_id' => $row['id'], 'name' => $row['name'], 'group' => $row['group_name'],
            'amount' => round($row['nature'] === 'income' ? $row['credit'] - $row['debit'] : $row['debit'] - $row['credit'], 2)];
        $pick = fn (array $groups) => $rows->whereIn('group_code', $groups)->map($line)->filter(fn ($row) => abs($row['amount']) >= 0.01)->values();

        $openingStock = StockValuation::at($storeId, Carbon::parse($from)->subDay()->toDateString());
        $closingStock = StockValuation::at($storeId, $to);
        $purchases = $pick(['purchases']);
        $directExpenses = $pick(['direct_expenses']);
        $sales = $pick(['sales']);
        $directIncomes = $pick(['direct_incomes']);
        $tradingDebit = $openingStock + $purchases->sum('amount') + $directExpenses->sum('amount');
        $tradingCredit = $sales->sum('amount') + $directIncomes->sum('amount') + $closingStock;
        $grossProfit = round($tradingCredit - $tradingDebit, 2);

        $indirectExpenses = $pick(['indirect_expenses']);
        $indirectIncomes = $pick(['indirect_incomes']);
        $netProfit = round($grossProfit + $indirectIncomes->sum('amount') - $indirectExpenses->sum('amount'), 2);

        return [
            'from' => $from, 'to' => $to,
            'trading' => [
                'opening_stock' => $openingStock, 'purchases' => $purchases, 'direct_expenses' => $directExpenses,
                'sales' => $sales, 'direct_incomes' => $directIncomes, 'closing_stock' => $closingStock,
                'total_debit' => round($tradingDebit, 2), 'total_credit' => round($tradingCredit, 2), 'gross_profit' => $grossProfit,
            ],
            'profit_and_loss' => [
                'gross_profit' => $grossProfit, 'indirect_expenses' => $indirectExpenses, 'indirect_incomes' => $indirectIncomes, 'net_profit' => $netProfit,
            ],
        ];
    }

    /**
     * Balance Sheet on a date. Profit & Loss A/c carries every income and expense since the books
     * started, adjusted for stock: + stock on hand now, - stock that was already on hand when the
     * books started. That opening stock was never bought through the books, so it shows as capital
     * the business started with. Both sides then tally exactly.
     */
    public static function balanceSheet(int $storeId, string $asOf): array
    {
        $rows = self::balances($storeId, null, $asOf);
        $closingStock = StockValuation::at($storeId, $asOf);
        $booksStart = DB::table('voucher_lines')->where('store_id', $storeId)->min('voucher_date');
        $startingStock = $booksStart ? StockValuation::at($storeId, Carbon::parse($booksStart)->subDay()->toDateString()) : 0.0;
        $earnings = round($rows->whereIn('nature', ['income', 'expense'])->sum(fn ($row) => -$row['closing']), 2);

        $side = function (string $nature) use ($rows) {
            return $rows->where('section', 'bs')->where('nature', $nature)->filter(fn ($row) => abs($row['closing']) >= 0.01)
                ->groupBy('group_code')->map(fn ($group, $code) => [
                    'group_code' => $code, 'group' => ChartOfAccounts::GROUPS[$code]['name'] ?? $code,
                    'accounts' => $group->map(fn ($row) => ['account_id' => $row['id'], 'name' => $row['name'],
                        'amount' => round($nature === 'asset' ? $row['closing'] : -$row['closing'], 2)])->values(),
                ])->map(fn ($group) => $group + ['total' => round(collect($group['accounts'])->sum('amount'), 2)])->values();
        };
        $liabilities = $side('liability');
        $assets = $side('asset');
        $profit = round($earnings + $closingStock - $startingStock, 2);
        $openingGap = round((float) DB::table('ledger_accounts')->where('store_id', $storeId)->sum('opening_balance'), 2);
        $liabilityTotal = round($liabilities->sum('total') + $startingStock + $profit + $openingGap, 2);
        $assetTotal = round($assets->sum('total') + $closingStock, 2);

        return [
            'as_of' => $asOf, 'books_start' => $booksStart,
            'liabilities' => $liabilities, 'assets' => $assets,
            'starting_stock' => $startingStock, 'profit_and_loss' => $profit, 'closing_stock' => $closingStock,
            'opening_difference' => $openingGap,
            'total_liabilities' => $liabilityTotal, 'total_assets' => $assetTotal, 'difference' => round($assetTotal - $liabilityTotal, 2),
        ];
    }

    /** One ledger's entries with a running balance. "Against" names the other ledgers on each voucher. */
    public static function ledger(int $storeId, int $accountId, string $from, string $to): array
    {
        $account = self::balances($storeId, $from, $to)->firstWhere('id', $accountId);
        abort_unless($account, 404, 'Ledger not found.');
        $lines = DB::table('voucher_lines as l')->join('vouchers as v', 'v.id', '=', 'l.voucher_id')
            ->where('l.store_id', $storeId)->where('l.ledger_account_id', $accountId)->whereBetween('l.voucher_date', [$from, $to])
            ->orderBy('l.voucher_date')->orderBy('l.voucher_id')->orderBy('l.id')
            ->get(['l.voucher_id', 'l.voucher_date', 'l.debit', 'l.credit', 'v.voucher_no', 'v.voucher_type', 'v.reference_no', 'v.narration', 'v.source_type']);
        $against = DB::table('voucher_lines as l')->join('ledger_accounts as a', 'a.id', '=', 'l.ledger_account_id')
            ->whereIn('l.voucher_id', $lines->pluck('voucher_id')->unique())->where('l.ledger_account_id', '!=', $accountId)
            ->get(['l.voucher_id', 'a.name'])->groupBy('voucher_id')->map(fn ($rows) => $rows->pluck('name')->unique()->implode(', '));

        $balance = $account['opening'];
        $entries = $lines->map(function ($line) use (&$balance, $against) {
            $balance = round($balance + (float) $line->debit - (float) $line->credit, 2);

            return ['voucher_id' => $line->voucher_id, 'date' => $line->voucher_date, 'voucher_no' => $line->voucher_no, 'voucher_type' => $line->voucher_type,
                'reference_no' => $line->reference_no, 'narration' => $line->narration, 'against' => $against[$line->voucher_id] ?? '',
                'automatic' => (bool) $line->source_type, 'debit' => (float) $line->debit, 'credit' => (float) $line->credit, 'balance' => $balance];
        });

        return ['account' => $account, 'from' => $from, 'to' => $to, 'entries' => $entries];
    }

    /** Vouchers in a period with their lines (the daybook). */
    public static function daybook(int $storeId, string $from, string $to, ?string $type = null, int $limit = 2000): Collection
    {
        $vouchers = DB::table('vouchers as v')->leftJoin('users as u', 'u.id', '=', 'v.created_by')
            ->where('v.store_id', $storeId)->whereBetween('v.voucher_date', [$from, $to])->when($type, fn ($q) => $q->where('v.voucher_type', $type))
            ->orderBy('v.voucher_date')->orderBy('v.id')->limit($limit)
            ->get(['v.id', 'v.uuid', 'v.voucher_type', 'v.voucher_no', 'v.voucher_date', 'v.reference_no', 'v.narration', 'v.amount', 'v.source_type', 'v.source_id', 'u.name as created_by_name']);
        $lines = DB::table('voucher_lines as l')->join('ledger_accounts as a', 'a.id', '=', 'l.ledger_account_id')
            ->whereIn('l.voucher_id', $vouchers->pluck('id'))->orderBy('l.id')
            ->get(['l.voucher_id', 'l.ledger_account_id', 'a.name', 'l.debit', 'l.credit', 'l.narration'])->groupBy('voucher_id');

        return $vouchers->map(fn ($voucher) => (array) $voucher + [
            'automatic' => (bool) $voucher->source_type,
            'lines' => ($lines[$voucher->id] ?? collect())->map(fn ($line) => ['ledger_account_id' => $line->ledger_account_id, 'account' => $line->name,
                'debit' => (float) $line->debit, 'credit' => (float) $line->credit, 'narration' => $line->narration])->values(),
        ]);
    }

    /** Who owes the store (receivable) or whom the store owes (payable), on a date. */
    public static function outstanding(int $storeId, string $side, string $asOf): Collection
    {
        $lastEntry = DB::table('voucher_lines')->where('store_id', $storeId)->where('voucher_date', '<=', $asOf)
            ->groupBy('ledger_account_id')->selectRaw('ledger_account_id, MAX(voucher_date) as last_date')->pluck('last_date', 'ledger_account_id');

        return self::balances($storeId, null, $asOf)
            ->filter(fn ($row) => $side === 'payable' ? $row['group_code'] === 'sundry_creditors'
                : $row['group_code'] === 'sundry_debtors' || $row['system_key'] === 'pos_receivable')
            ->map(fn ($row) => ['account_id' => $row['id'], 'name' => $row['name'], 'party_type' => $row['party_type'], 'party_id' => $row['party_id'],
                'amount' => round($side === 'payable' ? -$row['closing'] : $row['closing'], 2), 'last_entry' => $lastEntry[$row['id']] ?? null])
            ->filter(fn ($row) => abs($row['amount']) >= 0.01)->sortByDesc('amount')->values();
    }
}
