<?php

namespace App\Services\Accounting;

use Illuminate\Support\Facades\DB;

/**
 * A store's chart of accounts. Groups are fixed (Tally-style primary groups); ledgers are rows in
 * ledger_accounts. Automatic postings use "system" ledgers looked up by key, and one ledger per
 * supplier, customer or other store. Writes go through the query builder, not Eloquent, because a
 * posting can belong to a store other than the one selected in the request (a transfer received in
 * store B also posts store A's side), and the store context guard would rewrite store_id.
 */
class ChartOfAccounts
{
    /**
     * nature: asset | liability | income | expense. section: where the group reports:
     * bs = Balance Sheet, trading = Trading account (gross profit), pl = Profit & Loss.
     */
    public const GROUPS = [
        'capital' => ['name' => 'Capital Account', 'nature' => 'liability', 'section' => 'bs'],
        'loans' => ['name' => 'Loans (Liability)', 'nature' => 'liability', 'section' => 'bs'],
        'current_liabilities' => ['name' => 'Current Liabilities', 'nature' => 'liability', 'section' => 'bs'],
        'duties_taxes' => ['name' => 'Duties & Taxes', 'nature' => 'liability', 'section' => 'bs'],
        'sundry_creditors' => ['name' => 'Sundry Creditors', 'nature' => 'liability', 'section' => 'bs'],
        'fixed_assets' => ['name' => 'Fixed Assets', 'nature' => 'asset', 'section' => 'bs'],
        'current_assets' => ['name' => 'Current Assets', 'nature' => 'asset', 'section' => 'bs'],
        'cash' => ['name' => 'Cash-in-Hand', 'nature' => 'asset', 'section' => 'bs'],
        'bank' => ['name' => 'Bank Accounts', 'nature' => 'asset', 'section' => 'bs'],
        'sundry_debtors' => ['name' => 'Sundry Debtors', 'nature' => 'asset', 'section' => 'bs'],
        'branches' => ['name' => 'Branch / Store Accounts', 'nature' => 'asset', 'section' => 'bs'],
        'loans_advances' => ['name' => 'Loans & Advances (Asset)', 'nature' => 'asset', 'section' => 'bs'],
        'suspense' => ['name' => 'Suspense Account', 'nature' => 'liability', 'section' => 'bs'],
        'sales' => ['name' => 'Sales Accounts', 'nature' => 'income', 'section' => 'trading'],
        'purchases' => ['name' => 'Purchase Accounts', 'nature' => 'expense', 'section' => 'trading'],
        'direct_incomes' => ['name' => 'Direct Incomes', 'nature' => 'income', 'section' => 'trading'],
        'direct_expenses' => ['name' => 'Direct Expenses', 'nature' => 'expense', 'section' => 'trading'],
        'indirect_incomes' => ['name' => 'Indirect Incomes', 'nature' => 'income', 'section' => 'pl'],
        'indirect_expenses' => ['name' => 'Indirect Expenses', 'nature' => 'expense', 'section' => 'pl'],
    ];

    /** Ledgers the automatic postings need, by key. */
    public const SYSTEM = [
        'cash' => ['Cash in Hand', 'cash'],
        'bank' => ['Bank Account', 'bank'],
        'card_clearing' => ['Card Receipts (not yet in bank)', 'current_assets'],
        'upi_clearing' => ['UPI Receipts (not yet in bank)', 'current_assets'],
        'pos_receivable' => ['Unsettled POS Bills', 'current_assets'],
        'return_credit' => ['Return Credit Notes', 'current_liabilities'],
        'capital' => ['Capital Account', 'capital'],
        'sales' => ['Sales', 'sales'],
        'sales_return' => ['Sales Returns', 'sales'],
        'purchases' => ['Purchases', 'purchases'],
        'purchase_return' => ['Purchase Returns', 'purchases'],
        'transfer_in' => ['Stock Transfers In', 'purchases'],
        'transfer_out' => ['Stock Transfers Out', 'purchases'],
        'output_cgst' => ['Output CGST', 'duties_taxes'],
        'output_sgst' => ['Output SGST', 'duties_taxes'],
        'output_igst' => ['Output IGST', 'duties_taxes'],
        'input_cgst' => ['Input CGST', 'duties_taxes'],
        'input_sgst' => ['Input SGST', 'duties_taxes'],
        'input_igst' => ['Input IGST', 'duties_taxes'],
        'round_off' => ['Round Off', 'indirect_expenses'],
        'salaries' => ['Salaries & Wages', 'indirect_expenses'],
        'employer_pf' => ['Employer PF Contribution', 'indirect_expenses'],
        'employer_esi' => ['Employer ESI Contribution', 'indirect_expenses'],
        'salary_payable' => ['Salary Payable', 'current_liabilities'],
        'pf_payable' => ['PF Payable', 'duties_taxes'],
        'esi_payable' => ['ESI Payable', 'duties_taxes'],
        'pt_payable' => ['Professional Tax Payable', 'duties_taxes'],
    ];

    /** Common expense heads a new chart starts with; ordinary ledgers the store can rename or remove. */
    private const STARTER = [
        ['Rent', 'indirect_expenses'], ['Salaries & Wages', 'indirect_expenses'], ['Electricity', 'indirect_expenses'],
        ['Telephone & Internet', 'indirect_expenses'], ['Shop Expenses', 'indirect_expenses'], ['Bank Charges', 'indirect_expenses'],
        ['Freight Inward', 'direct_expenses'], ['Discount Received', 'indirect_incomes'],
    ];

    /** System ledgers that take over an ordinary ledger of the same name (a starter head the chart already has). */
    private const ADOPT = ['salaries'];

    private const PARTY_GROUPS = ['supplier' => 'sundry_creditors', 'customer' => 'sundry_debtors', 'store' => 'branches'];

    /** @var array<string, int> */
    private static array $cache = [];

    public static function flushCache(): void
    {
        self::$cache = [];
    }

    /** Creates any missing system ledgers (and, for a brand-new chart, the starter expense heads). */
    public static function ensure(int $storeId): void
    {
        self::flushCache();
        $existing = DB::table('ledger_accounts')->where('store_id', $storeId)->pluck('system_key')->filter()->all();
        // Postings create the ledgers they need as they go, but never Capital; so a chart without it
        // has not been set up yet (and a store that deletes a starter head doesn't get it back).
        $isNew = ! in_array('capital', $existing, true);
        foreach (array_diff(array_keys(self::SYSTEM), $existing) as $key) {
            self::system($storeId, $key);
        }
        if ($isNew) {
            foreach (self::STARTER as [$name, $group]) {
                // Salaries & Wages is also a system ledger (payroll) now; don't add a "(2)" copy.
                if (! DB::table('ledger_accounts')->where('store_id', $storeId)->where('name', $name)->exists()) {
                    self::insert($storeId, $name, $group, []);
                }
            }
        }
    }

    /** The id of a system ledger, created on first use. */
    public static function system(int $storeId, string $key): int
    {
        $cacheKey = "$storeId|sys|$key";
        if (isset(self::$cache[$cacheKey])) {
            return self::$cache[$cacheKey];
        }
        $id = DB::table('ledger_accounts')->where('store_id', $storeId)->where('system_key', $key)->value('id');
        if (! $id && in_array($key, self::ADOPT, true)) {
            // The starter "Salaries & Wages" head becomes the payroll ledger instead of a "(2)" twin.
            $id = DB::table('ledger_accounts')->where('store_id', $storeId)->where('name', self::SYSTEM[$key][0])->whereNull('system_key')->whereNull('party_type')->value('id');
            $id && DB::table('ledger_accounts')->where('id', $id)->update(['system_key' => $key, 'updated_at' => now()]);
        }
        if (! $id) {
            [$name, $group] = self::SYSTEM[$key];
            $id = self::insert($storeId, $name, $group, ['system_key' => $key]);
        }

        return self::$cache[$cacheKey] = (int) $id;
    }

    /** The ledger of a supplier, customer or other store, created on first use with the party's opening balance (+ debit). */
    public static function party(int $storeId, string $type, int $partyId, string $name, float $opening = 0): int
    {
        $cacheKey = "$storeId|$type|$partyId";
        if (isset(self::$cache[$cacheKey])) {
            return self::$cache[$cacheKey];
        }
        $id = DB::table('ledger_accounts')->where('store_id', $storeId)->where('party_type', $type)->where('party_id', $partyId)->value('id');
        if (! $id) {
            $id = self::insert($storeId, trim($name) ?: ucfirst($type)." #$partyId", self::PARTY_GROUPS[$type], ['party_type' => $type, 'party_id' => $partyId, 'opening_balance' => round($opening, 2)]);
        }

        return self::$cache[$cacheKey] = (int) $id;
    }

    /** Ledger names are unique per store; a clash (two suppliers called "Ravi Traders") gets a suffix. */
    private static function insert(int $storeId, string $name, string $group, array $extra): int
    {
        $base = mb_substr($name, 0, 140);
        $candidate = $base;
        for ($n = 2; DB::table('ledger_accounts')->where('store_id', $storeId)->where('name', $candidate)->exists(); $n++) {
            $candidate = $base." ($n)";
        }

        return (int) DB::table('ledger_accounts')->insertGetId([
            'store_id' => $storeId, 'name' => $candidate, 'group_code' => $group, 'opening_balance' => 0, 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(), ...$extra,
        ]);
    }
}
