<?php

namespace App\Services\Accounting;

use App\Models\DealerInvoice;
use App\Models\DealerInvoiceReturn;
use App\Models\DirectPurchase;
use App\Models\HrExpenseClaim;
use App\Models\HrLoan;
use App\Models\HrLoanRecovery;
use App\Models\HrPayrollRun;
use App\Models\PosPayment;
use App\Models\PosReturn;
use App\Models\PosReturnItem;
use App\Models\PosSale;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Models\Settlement;
use App\Models\StockOutward;
use App\Models\SupplierPayment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Posts each bill, return, purchase, payment and transfer as one double-entry voucher, rebuilt from
 * the document's current state whenever it changes (so edits, settlements and deletions just
 * repost). Model events queue the documents a request touched; they are posted once the database
 * transaction that wrote them commits, and a failure is logged, never shown to the cashier:
 * `php artisan accounting:post` (nightly) catches up anything missed.
 */
class LedgerPoster
{
    /** source type => [table, store column, voucher type] */
    public const SOURCES = [
        'pos_sale' => ['pos_sales', 'store_id', 'sales'],
        'pos_return' => ['pos_returns', 'store_id', 'sales_return'],
        'settlement' => ['settlements', 'store_id', 'receipt'],
        'dealer_invoice' => ['dealer_invoices', 'store_id', 'sales'],
        'dealer_return' => ['dealer_invoice_returns', 'store_id', 'sales_return'],
        'direct_purchase' => ['direct_purchases', 'store_id', 'purchase'],
        'purchase_invoice' => ['purchase_invoices', 'store_id', 'purchase'],
        'purchase_return' => ['purchase_returns', 'store_id', 'purchase_return'],
        'supplier_payment' => ['supplier_payments', 'store_id', 'payment'],
        'transfer_out' => ['stock_outwards', 'source_store_id', 'transfer'],
        'transfer_in' => ['stock_outwards', 'target_store_id', 'transfer'],
        'payroll' => ['hr_payroll_runs', 'store_id', 'journal'],
        'payroll_payment' => ['hr_payroll_runs', 'store_id', 'payment'],
        'staff_loan' => ['hr_loans', 'store_id', 'payment'],
        'staff_loan_repayment' => ['hr_loan_recoveries', 'store_id', 'receipt'],
        'expense_claim' => ['hr_expense_claims', 'store_id', 'payment'],
    ];

    private const CLOSED = ['CANCELLED', 'CANCELED', 'VOID', 'DRAFT', 'REJECTED'];

    /** @var array<string, array{0: string, 1: int}> */
    private static array $pending = [];

    /** Registered once from AppServiceProvider. */
    public static function observe(): void
    {
        $targets = [
            PosSale::class => fn ($m) => [['pos_sale', $m->id], ['settlement', $m->settlement_id], ['pos_return', $m->applied_pos_return_id]],
            PosPayment::class => fn ($m) => [['pos_sale', $m->pos_sale_id]],
            PosReturn::class => fn ($m) => [['pos_return', $m->id], ['pos_sale', $m->credit_applied_to_sale_id]],
            PosReturnItem::class => fn ($m) => [['pos_return', $m->pos_return_id]], // Its GST splits the return.
            Settlement::class => fn ($m) => [['settlement', $m->id]],
            DealerInvoice::class => fn ($m) => [['dealer_invoice', $m->id]],
            DealerInvoiceReturn::class => fn ($m) => [['dealer_return', $m->id]],
            DirectPurchase::class => fn ($m) => [['direct_purchase', $m->id]],
            PurchaseInvoice::class => fn ($m) => [['purchase_invoice', $m->id]],
            PurchaseReturn::class => fn ($m) => [['purchase_return', $m->id]],
            PurchaseReturnItem::class => fn ($m) => [['purchase_return', $m->purchase_return_id]],
            SupplierPayment::class => fn ($m) => [['supplier_payment', $m->id]],
            StockOutward::class => fn ($m) => [['transfer_out', $m->id], ['transfer_in', $m->id]],
            HrPayrollRun::class => fn ($m) => [['payroll', $m->id], ['payroll_payment', $m->id]],
            HrLoan::class => fn ($m) => [['staff_loan', $m->id]],
            HrLoanRecovery::class => fn ($m) => [['staff_loan_repayment', $m->id]],
            HrExpenseClaim::class => fn ($m) => [['expense_claim', $m->id]],
        ];
        foreach ($targets as $class => $documents) {
            $class::saved(fn ($model) => self::queue($documents($model)));
            $class::deleted(fn ($model) => self::queue($documents($model)));
        }
    }

    /** @param array<int, array{0: string, 1: mixed}> $documents */
    public static function queue(array $documents): void
    {
        foreach ($documents as [$type, $id]) {
            if ($id) {
                self::$pending["$type:$id"] = [$type, (int) $id];
            }
        }
        if (! self::$pending) {
            return;
        }
        if (DB::transactionLevel() > 0) {
            // Once the bill and its lines and payments are all committed.
            DB::afterCommit(fn () => self::flush());
        } elseif (! app()->bound('accounting.flush-registered')) {
            // Written without a transaction: wait for the request to finish its other writes.
            app()->instance('accounting.flush-registered', true);
            app()->terminating(fn () => self::flush());
        }
    }

    /** Posts everything queued so far. Accounting must never break a sale, so failures are only logged. */
    public static function flush(): void
    {
        while ($pending = self::$pending) {
            self::$pending = [];
            foreach ($pending as [$type, $id]) {
                try {
                    self::post($type, $id);
                } catch (\Throwable $e) {
                    report($e);
                }
            }
        }
    }

    /** (Re)writes the voucher for one document, or removes it when the document no longer counts. */
    public static function post(string $type, int $id): void
    {
        ChartOfAccounts::flushCache();
        DB::transaction(function () use ($type, $id) {
            $entry = self::build($type, $id);
            $existing = DB::table('vouchers')->where('source_type', $type)->where('source_id', $id)->lockForUpdate()->first();
            if (! $entry) {
                if ($existing) {
                    DB::table('vouchers')->where('id', $existing->id)->delete();
                }

                return;
            }
            $entry['date'] = Carbon::parse($entry['date'])->toDateString();
            $lines = self::balance($entry['lines'], $entry['store_id'], "$type #$id");
            $header = [
                'store_id' => $entry['store_id'], 'voucher_type' => self::SOURCES[$type][2], 'voucher_no' => mb_substr((string) $entry['no'], 0, 80),
                'voucher_date' => $entry['date'], 'reference_no' => isset($entry['reference']) ? mb_substr((string) $entry['reference'], 0, 100) : null,
                'narration' => mb_substr($entry['narration'], 0, 500), 'amount' => array_sum(array_column($lines, 'debit')),
                'created_by' => $entry['created_by'] ?? null, 'updated_at' => now(),
            ];
            if ($existing) {
                DB::table('vouchers')->where('id', $existing->id)->update($header);
                DB::table('voucher_lines')->where('voucher_id', $existing->id)->delete();
                $voucherId = $existing->id;
            } else {
                $voucherId = DB::table('vouchers')->insertGetId($header + ['uuid' => (string) Str::uuid7(), 'source_type' => $type, 'source_id' => $id, 'created_at' => now()]);
            }
            DB::table('voucher_lines')->insert(array_map(fn ($line) => $line + [
                'voucher_id' => $voucherId, 'store_id' => $entry['store_id'], 'voucher_date' => $entry['date'],
            ], $lines));
        });
    }

    /**
     * Nets signed amounts (+ debit, - credit) per ledger and absorbs paise-level rounding into Round
     * Off. A larger gap means the document's own totals disagree, which must not be hidden.
     *
     * @param  array<int, array{0: int, 1: float, 2?: string}>  $lines
     */
    public static function balance(array $lines, int $storeId, string $label): array
    {
        $net = [];
        foreach ($lines as $line) {
            $net[$line[0]] = ($net[$line[0]] ?? 0) + $line[1];
        }
        $net = array_map(fn ($amount) => round($amount, 2), $net);
        $gap = round(array_sum($net), 2);
        if (abs($gap) >= 0.01) {
            if (abs($gap) > 1) {
                throw new RuntimeException("Voucher for $label does not balance (debits exceed credits by $gap).");
            }
            $roundOff = ChartOfAccounts::system($storeId, 'round_off');
            $net[$roundOff] = round(($net[$roundOff] ?? 0) - $gap, 2);
        }

        $out = [];
        foreach ($net as $account => $amount) {
            if (abs($amount) >= 0.005) {
                $out[] = ['ledger_account_id' => $account, 'debit' => max(0, $amount), 'credit' => max(0, -$amount)];
            }
        }
        if (! $out) {
            throw new RuntimeException("Voucher for $label has no amounts.");
        }

        return $out;
    }

    /** A stored timestamp as a date on the business calendar (sales at 00:30 IST belong to that day). */
    public static function businessDate(mixed $timestamp): string
    {
        return Carbon::parse($timestamp, config('app.timezone'))->setTimezone(config('app.business_timezone'))->toDateString();
    }

    private static function build(string $type, int $id): ?array
    {
        $entry = match ($type) {
            'pos_sale' => self::posSale($id),
            'pos_return' => self::posReturn($id),
            'settlement' => self::settlement($id),
            'dealer_invoice' => self::dealerInvoice($id),
            'dealer_return' => self::dealerReturn($id),
            'direct_purchase' => self::directPurchase($id),
            'purchase_invoice' => self::purchaseInvoice($id),
            'purchase_return' => self::purchaseReturn($id),
            'supplier_payment' => self::supplierPayment($id),
            'transfer_out' => self::transfer($id, false),
            'transfer_in' => self::transfer($id, true),
            'payroll' => self::payroll($id),
            'payroll_payment' => self::payrollPayment($id),
            'staff_loan' => self::staffLoan($id),
            'staff_loan_repayment' => self::staffLoanRepayment($id),
            'expense_claim' => self::expenseClaim($id),
            default => throw new RuntimeException("Unknown accounting source $type."),
        };

        return $entry && $entry['lines'] ? $entry : null;
    }

    private static function closed(?string $status): bool
    {
        return in_array(strtoupper((string) $status), self::CLOSED, true);
    }

    /** GST lines: IGST for inter-state, otherwise split equally into CGST and SGST. */
    private static function gst(int $storeId, string $side, float $tax, bool $igst, float $sign): array
    {
        if (abs($tax) < 0.005) {
            return [];
        }
        if ($igst) {
            return [[ChartOfAccounts::system($storeId, "{$side}_igst"), $sign * $tax]];
        }
        $central = round($tax / 2, 2);

        return [
            [ChartOfAccounts::system($storeId, "{$side}_cgst"), $sign * $central],
            [ChartOfAccounts::system($storeId, "{$side}_sgst"), $sign * ($tax - $central)],
        ];
    }

    private static function tender(int $storeId, string $mode): int
    {
        return ChartOfAccounts::system($storeId, match (strtoupper($mode)) {
            'CASH' => 'cash',
            'CARD' => 'card_clearing',
            'UPI' => 'upi_clearing',
            default => 'bank',
        });
    }

    private static function partyName(string $table, ?int $id): string
    {
        return (string) ($id ? DB::table($table)->where('id', $id)->value('name') : '');
    }

    private static function supplier(int $storeId, ?int $supplierId, ?string $fallbackName = null): int
    {
        if (! $supplierId) {
            return ChartOfAccounts::system($storeId, 'cash'); // No supplier on the bill: treat it as a cash purchase.
        }
        $supplier = DB::table('suppliers')->where('id', $supplierId)->first(['name', 'opening_balance']);

        // The supplier master's opening balance is what the store owed them: a credit.
        return ChartOfAccounts::party($storeId, 'supplier', $supplierId, (string) ($supplier->name ?? $fallbackName), -(float) ($supplier->opening_balance ?? 0));
    }

    /**
     * Sales (net of discount) and output GST are credited; what came in is debited: each tender at
     * the till (cash net of change), a return credit note used on the bill, and anything still owed
     * by the credit customer, or by "Unsettled POS Bills" until Credit Sale Collection settles it.
     * Collections made later belong to the settlement's own receipt voucher.
     */
    private static function posSale(int $id): ?array
    {
        $sale = PosSale::withoutGlobalScopes()->find($id);
        if (! $sale || self::closed($sale->status)) {
            return null;
        }
        $store = (int) $sale->store_id;
        $total = (float) $sale->grand_total;
        $tax = (float) $sale->tax_amount;
        $round = (float) $sale->round_off;
        $lines = [[ChartOfAccounts::system($store, 'sales'), -($total - $tax - $round)]];
        array_push($lines, ...self::gst($store, 'output', $tax, (bool) $sale->igst, -1));
        if (abs($round) >= 0.005) {
            $lines[] = [ChartOfAccounts::system($store, 'round_off'), -$round];
        }

        $received = 0.0;
        if ($sale->applied_pos_return_id) {
            $credit = min($total, (float) DB::table('pos_returns')->where('id', $sale->applied_pos_return_id)->value('total_refund'));
            if ($credit > 0) {
                $lines[] = [ChartOfAccounts::system($store, 'return_credit'), $credit];
                $received += $credit;
            }
        }
        $settlementNo = $sale->settlement_id ? DB::table('settlements')->where('id', $sale->settlement_id)->value('batch_no') : null;
        $tenders = DB::table('pos_payments')->where('pos_sale_id', $id)
            ->when($settlementNo, fn ($q) => $q->where(fn ($q) => $q->whereNull('reference_no')->orWhere('reference_no', '!=', $settlementNo)))
            ->selectRaw('UPPER(payment_mode) as mode, SUM(amount) as amount')->groupByRaw('UPPER(payment_mode)')->pluck('amount', 'mode');
        $change = (float) $sale->change_amount;
        foreach ($tenders as $mode => $amount) {
            $amount = (float) $amount - ($mode === 'CASH' ? $change : 0);
            $lines[] = [self::tender($store, $mode), $amount];
            $received += $amount;
        }
        if ($change > 0 && ! isset($tenders['CASH'])) {
            $lines[] = [ChartOfAccounts::system($store, 'cash'), -$change]; // Change handed back from the drawer.
            $received -= $change;
        }
        $due = round($total - $received, 2);
        if ($due >= 0.01) {
            $lines[] = [$sale->is_credit && $sale->customer_id
                ? ChartOfAccounts::party($store, 'customer', (int) $sale->customer_id, self::partyName('customers', (int) $sale->customer_id))
                : ChartOfAccounts::system($store, 'pos_receivable'), $due];
        }

        return ['store_id' => $store, 'no' => $sale->invoice_no, 'reference' => $sale->bill_no, 'date' => self::businessDate($sale->sale_date ?? $sale->created_at),
            'narration' => 'POS bill '.$sale->bill_no.($sale->is_credit ? ' (credit)' : ''), 'created_by' => $sale->user_id, 'lines' => $lines];
    }

    /** Sales return and its GST are debited; the refund is credited to cash, or to Return Credit Notes when the customer used it on a later bill. */
    private static function posReturn(int $id): ?array
    {
        $return = DB::table('pos_returns')->where('id', $id)->first();
        if (! $return || self::closed($return->status)) {
            return null;
        }
        $store = (int) $return->store_id;
        $total = (float) $return->total_refund;
        $tax = (float) DB::table('pos_return_items')->where('pos_return_id', $id)->sum('tax_amount');
        $igst = $return->pos_sale_id && (bool) DB::table('pos_sales')->where('id', $return->pos_sale_id)->value('igst');
        $lines = [[ChartOfAccounts::system($store, 'sales_return'), $total - $tax], ...self::gst($store, 'output', $tax, $igst, 1)];
        $usedOnBill = $return->credit_applied_to_sale_id && DB::table('pos_sales')->where('id', $return->credit_applied_to_sale_id)->exists();
        $refundTo = $usedOnBill || in_array(strtoupper((string) $return->refund_mode), ['CREDIT', 'CREDIT_NOTE', 'STORE_CREDIT'], true)
            ? ChartOfAccounts::system($store, 'return_credit')
            : self::tender($store, (string) ($return->refund_mode ?: 'CASH'));
        $lines[] = [$refundTo, -$total];

        return ['store_id' => $store, 'no' => $return->return_no, 'date' => self::businessDate($return->return_date ?? $return->created_at),
            'narration' => 'POS return '.$return->return_no.($usedOnBill ? ' (credit used on a later bill)' : ''), 'created_by' => $return->created_by, 'lines' => $lines];
    }

    /** Credit Sale Collection: the money received (by tender) against unsettled or credit bills. */
    private static function settlement(int $id): ?array
    {
        $settlement = DB::table('settlements')->where('id', $id)->first();
        if (! $settlement) {
            return null;
        }
        $store = (int) $settlement->store_id;
        $payments = DB::table('pos_payments as p')->join('pos_sales as s', 's.id', '=', 'p.pos_sale_id')
            ->where('s.settlement_id', $id)->where('p.reference_no', $settlement->batch_no)
            ->get(['p.payment_mode', 'p.amount', 's.id as sale_id', 's.is_credit', 's.customer_id']);
        if ($payments->isEmpty()) {
            return null; // A daily settlement summary moves no money.
        }
        $lines = [];
        foreach ($payments as $payment) {
            $lines[] = [self::tender($store, (string) $payment->payment_mode), (float) $payment->amount];
            $lines[] = [$payment->is_credit && $payment->customer_id
                ? ChartOfAccounts::party($store, 'customer', (int) $payment->customer_id, self::partyName('customers', (int) $payment->customer_id))
                : ChartOfAccounts::system($store, 'pos_receivable'), -(float) $payment->amount];
        }

        return ['store_id' => $store, 'no' => $settlement->batch_no, 'date' => self::businessDate($settlement->created_at),
            'narration' => 'Credit sale collection '.$settlement->batch_no, 'created_by' => $settlement->settled_by, 'lines' => $lines];
    }

    private static function dealerInvoice(int $id): ?array
    {
        $invoice = DB::table('dealer_invoices')->where('id', $id)->first();
        if (! $invoice || self::closed($invoice->status)) {
            return null;
        }
        $store = (int) $invoice->store_id;
        $total = (float) $invoice->grand_total;
        $tax = (float) $invoice->tax_amount;
        $customer = $invoice->customer_id
            ? ChartOfAccounts::party($store, 'customer', (int) $invoice->customer_id, self::partyName('customers', (int) $invoice->customer_id))
            : ChartOfAccounts::system($store, 'pos_receivable');

        return ['store_id' => $store, 'no' => $invoice->invoice_no, 'date' => $invoice->invoice_date ?: self::businessDate($invoice->created_at),
            'narration' => 'Dealer invoice '.$invoice->invoice_no, 'created_by' => $invoice->created_by,
            'lines' => [[$customer, $total], [ChartOfAccounts::system($store, 'sales'), -($total - $tax)], ...self::gst($store, 'output', $tax, false, -1)]];
    }

    /** A dealer return reverses a dealer invoice: sales returns and output GST are debited, the customer credited. */
    private static function dealerReturn(int $id): ?array
    {
        $return = DB::table('dealer_invoice_returns')->where('id', $id)->first();
        if (! $return || self::closed($return->status)) {
            return null;
        }
        $store = (int) $return->store_id;
        $total = (float) $return->grand_total;
        $tax = (float) $return->tax_amount;
        $customer = $return->customer_id
            ? ChartOfAccounts::party($store, 'customer', (int) $return->customer_id, self::partyName('customers', (int) $return->customer_id))
            : ChartOfAccounts::system($store, 'pos_receivable');

        return ['store_id' => $store, 'no' => $return->return_no, 'date' => $return->return_date ?: self::businessDate($return->created_at),
            'narration' => 'Dealer return '.$return->return_no, 'created_by' => $return->created_by,
            'lines' => [[ChartOfAccounts::system($store, 'sales_return'), $total - $tax], ...self::gst($store, 'output', $tax, false, 1), [$customer, -$total]]];
    }

    /** Purchases and input GST are debited; the supplier is credited with the bill total. */
    private static function purchase(int $store, float $total, float $tax, bool $igst, int $supplierAccount): array
    {
        return [[ChartOfAccounts::system($store, 'purchases'), $total - $tax], ...self::gst($store, 'input', $tax, $igst, 1), [$supplierAccount, -$total]];
    }

    private static function directPurchase(int $id): ?array
    {
        $purchase = DB::table('direct_purchases')->where('id', $id)->first();
        if (! $purchase || self::closed($purchase->status)) {
            return null;
        }
        $store = (int) $purchase->store_id;
        $total = (float) ($purchase->total_amount ?: $purchase->total);

        return ['store_id' => $store, 'no' => $purchase->purchase_no, 'reference' => $purchase->invoice_no,
            'date' => $purchase->purchase_date ?: self::businessDate($purchase->created_at), 'created_by' => $purchase->created_by,
            'narration' => 'Purchase '.$purchase->purchase_no.' (supplier bill '.$purchase->invoice_no.')',
            'lines' => self::purchase($store, $total, (float) $purchase->tax_amount, (bool) $purchase->igst,
                self::supplier($store, $purchase->supplier_id ? (int) $purchase->supplier_id : null, $purchase->supplier_name))];
    }

    private static function purchaseInvoice(int $id): ?array
    {
        $invoice = DB::table('purchase_invoices')->where('id', $id)->first();
        if (! $invoice || self::closed($invoice->status)) {
            return null;
        }
        $store = (int) $invoice->store_id;

        return ['store_id' => $store, 'no' => $invoice->invoice_no, 'reference' => $invoice->supplier_invoice_no,
            'date' => $invoice->invoice_date ?: self::businessDate($invoice->created_at), 'created_by' => $invoice->created_by,
            'narration' => 'Purchase invoice '.$invoice->invoice_no.($invoice->supplier_invoice_no ? ' (supplier bill '.$invoice->supplier_invoice_no.')' : ''),
            'lines' => self::purchase($store, (float) $invoice->grand_total, (float) $invoice->tax_amount, false,
                self::supplier($store, $invoice->supplier_id ? (int) $invoice->supplier_id : null))];
    }

    /** The supplier is debited (owed less); purchase returns and the input GST taken back are credited. */
    private static function purchaseReturn(int $id): ?array
    {
        $return = DB::table('purchase_returns')->where('id', $id)->first();
        if (! $return || self::closed($return->status)) {
            return null;
        }
        $store = (int) $return->store_id;
        $goods = (float) $return->total_amount; // Quantity x rate; the lines carry the GST separately.
        $tax = (float) DB::table('purchase_return_items')->where('purchase_return_id', $id)->sum('tax_amount');

        return ['store_id' => $store, 'no' => $return->return_no, 'date' => $return->return_date ?: self::businessDate($return->created_at),
            'narration' => 'Purchase return '.$return->return_no.($return->reason ? " ({$return->reason})" : ''), 'created_by' => $return->created_by,
            'lines' => [[self::supplier($store, $return->supplier_id ? (int) $return->supplier_id : null), $goods + $tax],
                [ChartOfAccounts::system($store, 'purchase_return'), -$goods], ...self::gst($store, 'input', $tax, false, -1)]];
    }

    private static function supplierPayment(int $id): ?array
    {
        $payment = DB::table('supplier_payments')->where('id', $id)->first();
        if (! $payment || (float) $payment->amount <= 0) {
            return null;
        }
        $store = (int) $payment->store_id;
        $amount = (float) $payment->amount;

        return ['store_id' => $store, 'no' => $payment->payment_no, 'reference' => $payment->reference_no,
            'date' => $payment->payment_date ?: self::businessDate($payment->created_at), 'created_by' => $payment->created_by,
            'narration' => 'Supplier payment '.$payment->payment_no.' ('.strtolower((string) $payment->payment_mode).')',
            'lines' => [[self::supplier($store, (int) $payment->supplier_id), $amount],
                [ChartOfAccounts::system($store, strtoupper((string) $payment->payment_mode) === 'CASH' ? 'cash' : 'bank'), -$amount]]];
    }

    /**
     * A submitted month's payroll: the salary cost (and the employer's PF and ESI) against what is owed to the
     * staff and to PF, ESI and professional tax. Other deductions (fines) reduce the salary cost.
     */
    private static function payroll(int $id): ?array
    {
        $run = DB::table('hr_payroll_runs')->where('id', $id)->first();
        if (! $run || ! in_array($run->status, ['SUBMITTED', 'PAID'], true)) {
            return null;
        }
        $store = (int) $run->store_id;
        $slips = DB::table('hr_payslips')->where('run_id', $id)->get();
        $deducted = ['PF' => 0.0, 'ESI' => 0.0, 'PT' => 0.0, 'LOAN' => 0.0, 'ADVANCE' => 0.0, 'OTHER' => 0.0];
        $reimbursed = 0.0;
        foreach ($slips as $slip) {
            foreach (json_decode($slip->deductions, true) ?: [] as $line) {
                $deducted[array_key_exists($line['code'], $deducted) ? $line['code'] : 'OTHER'] += (float) $line['amount'];
            }
            foreach (json_decode($slip->earnings, true) ?: [] as $line) {
                $reimbursed += $line['code'] === 'REIMBURSE' ? (float) $line['amount'] : 0;
            }
        }
        $employerPf = (float) $slips->sum('employer_pf');
        $employerEsi = (float) $slips->sum('employer_esi');
        $month = Carbon::parse("{$run->month}-01");

        return ['store_id' => $store, 'no' => "PAY-{$run->month}", 'date' => $month->copy()->endOfMonth()->toDateString(), 'created_by' => $run->submitted_by,
            'narration' => 'Salaries for '.$month->format('F Y')." ({$slips->count()} employees)",
            'lines' => [
                [ChartOfAccounts::system($store, 'salaries'), (float) $slips->sum('gross_earned') - $reimbursed - $deducted['OTHER']],
                [ChartOfAccounts::system($store, 'staff_expenses'), $reimbursed],
                [ChartOfAccounts::system($store, 'staff_advances'), -($deducted['LOAN'] + $deducted['ADVANCE'])],
                [ChartOfAccounts::system($store, 'employer_pf'), $employerPf],
                [ChartOfAccounts::system($store, 'employer_esi'), $employerEsi],
                [ChartOfAccounts::system($store, 'salary_payable'), -(float) $slips->sum('net_pay')],
                [ChartOfAccounts::system($store, 'pf_payable'), -($deducted['PF'] + $employerPf)],
                [ChartOfAccounts::system($store, 'esi_payable'), -($deducted['ESI'] + $employerEsi)],
                [ChartOfAccounts::system($store, 'pt_payable'), -$deducted['PT']],
            ]];
    }

    /** A salary advance or staff loan paid out: money owed back by the employee. */
    private static function staffLoan(int $id): ?array
    {
        $loan = DB::table('hr_loans')->where('id', $id)->first();
        if (! $loan || ! $loan->disbursed_on || in_array($loan->status, ['REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED'], true)) {
            return null;
        }
        $store = (int) $loan->store_id;
        $name = DB::table('employees')->where('id', $loan->employee_id)->value('name');

        return ['store_id' => $store, 'no' => ($loan->type === 'ADVANCE' ? 'ADV-' : 'LOAN-').$loan->id, 'date' => $loan->disbursed_on, 'created_by' => $loan->disbursed_by,
            'narration' => ($loan->type === 'ADVANCE' ? 'Salary advance' : 'Staff loan')." to {$name}",
            'lines' => [[ChartOfAccounts::system($store, 'staff_advances'), (float) $loan->amount],
                [ChartOfAccounts::system($store, $loan->pay_mode === 'CASH' ? 'cash' : 'bank'), -(float) $loan->amount]]];
    }

    /** A loan repaid outside payroll (payroll recoveries are in the payroll voucher). */
    private static function staffLoanRepayment(int $id): ?array
    {
        $recovery = DB::table('hr_loan_recoveries')->where('id', $id)->first();
        if (! $recovery || $recovery->kind !== 'MANUAL') {
            return null;
        }
        $store = (int) $recovery->store_id;

        return ['store_id' => $store, 'no' => "LOANREP-{$recovery->id}", 'date' => $recovery->paid_on, 'created_by' => $recovery->created_by,
            'narration' => "Staff loan #{$recovery->loan_id} repaid",
            'lines' => [[ChartOfAccounts::system($store, $recovery->pay_mode === 'CASH' ? 'cash' : 'bank'), (float) $recovery->amount],
                [ChartOfAccounts::system($store, 'staff_advances'), -(float) $recovery->amount]]];
    }

    /** An expense claim paid straight away (claims paid with salary are in the payroll voucher). */
    private static function expenseClaim(int $id): ?array
    {
        $claim = DB::table('hr_expense_claims')->where('id', $id)->first();
        if (! $claim || $claim->status !== 'PAID' || $claim->pay_via !== 'DIRECT') {
            return null;
        }
        $store = (int) $claim->store_id;
        $name = DB::table('employees')->where('id', $claim->employee_id)->value('name');

        return ['store_id' => $store, 'no' => "CLAIM-{$claim->id}", 'date' => $claim->paid_on, 'created_by' => $claim->decided_by,
            'narration' => "Expense claim of {$name} (".strtolower(str_replace('_', ' ', $claim->category)).')',
            'lines' => [[ChartOfAccounts::system($store, 'staff_expenses'), (float) $claim->amount],
                [ChartOfAccounts::system($store, $claim->pay_mode === 'CASH' ? 'cash' : 'bank'), -(float) $claim->amount]]];
    }

    /** Salaries paid out from the bank or cash; held salaries stay owed until they are released. */
    private static function payrollPayment(int $id): ?array
    {
        $run = DB::table('hr_payroll_runs')->where('id', $id)->first();
        if (! $run || $run->status !== 'PAID') {
            return null;
        }
        $store = (int) $run->store_id;
        $paid = (float) DB::table('hr_payslips')->where('run_id', $id)->where('held', false)->sum('net_pay');
        if ($paid <= 0) {
            return null;
        }

        return ['store_id' => $store, 'no' => "SALPAY-{$run->month}", 'date' => $run->paid_on, 'created_by' => $run->submitted_by,
            'narration' => 'Salaries paid for '.Carbon::parse("{$run->month}-01")->format('F Y').' ('.strtolower((string) $run->pay_mode).')',
            'lines' => [[ChartOfAccounts::system($store, 'salary_payable'), $paid],
                [ChartOfAccounts::system($store, $run->pay_mode === 'CASH' ? 'cash' : 'bank'), -$paid]]];
    }

    /**
     * Stock moved between stores at its transfer value, so each store's gross profit carries only the
     * stock it really bought or received. The sender posts when it dispatches, the receiver when it
     * receives (at the quantity actually received); each holds the other in a branch account.
     */
    private static function transfer(int $id, bool $receiving): ?array
    {
        $outward = DB::table('stock_outwards')->where('id', $id)->first();
        if (! $outward || self::closed($outward->status) || ($receiving && ! $outward->received_at)) {
            return null;
        }
        $store = (int) ($receiving ? $outward->target_store_id : $outward->source_store_id);
        $other = (int) ($receiving ? $outward->source_store_id : $outward->target_store_id);
        if (! $store || ! $other) {
            return null;
        }
        $value = round((float) DB::table('stock_outward_items')->where('stock_outward_id', $id)
            ->sum(DB::raw($receiving ? 'COALESCE(received_qty, 0) * unit_price' : 'quantity * unit_price')), 2);
        if ($value <= 0) {
            return null;
        }
        $branch = ChartOfAccounts::party($store, 'store', $other, (string) DB::table('stores')->where('id', $other)->value('name'));
        $lines = $receiving
            ? [[ChartOfAccounts::system($store, 'transfer_in'), $value], [$branch, -$value]]
            : [[$branch, $value], [ChartOfAccounts::system($store, 'transfer_out'), -$value]];

        return ['store_id' => $store, 'no' => $outward->outward_no, 'created_by' => $outward->created_by,
            'date' => self::businessDate(($receiving ? $outward->received_at : $outward->dispatched_at) ?? $outward->created_at),
            'narration' => ($receiving ? 'Stock received by transfer ' : 'Stock sent by transfer ').$outward->outward_no, 'lines' => $lines];
    }
}
