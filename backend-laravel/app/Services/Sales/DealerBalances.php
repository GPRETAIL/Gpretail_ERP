<?php

namespace App\Services\Sales;

use App\Services\Documents\DocumentNumberService;
use Illuminate\Support\Facades\DB;

/**
 * What is still due on dealer invoices: grand total less what was paid on the invoice, receipts allocated to it and
 * returns made against it. Cancelled invoices, receipts and returns do not count. One place for the invoice list,
 * the Dealer Receipt screen and the Finance dashboard.
 */
class DealerBalances
{
    private const CANCELLED = ['CANCELLED', 'CANCELED'];

    /**
     * @param  list<int>  $invoiceIds
     * @return array<int, array{total: float, paid_now: float, received: float, returned: float, balance: float, status: string}>
     */
    public function forInvoices(array $invoiceIds): array
    {
        $ids = array_values(array_unique(array_map('intval', $invoiceIds)));
        if ($ids === []) {
            return [];
        }
        $totals = DB::table('dealer_invoices')->whereIn('id', $ids)->pluck('grand_total', 'id');
        $paidNow = DB::table('dealer_invoice_payments')->whereIn('dealer_invoice_id', $ids)
            ->groupBy('dealer_invoice_id')->selectRaw('dealer_invoice_id, SUM(amount) as amount')->pluck('amount', 'dealer_invoice_id');
        $received = DB::table('dealer_receipt_items as i')->join('dealer_receipts as r', 'r.id', '=', 'i.dealer_receipt_id')
            ->whereIn('i.dealer_invoice_id', $ids)->whereNotIn('r.status', self::CANCELLED)
            ->groupBy('i.dealer_invoice_id')->selectRaw('i.dealer_invoice_id, SUM(i.amount) as amount')->pluck('amount', 'dealer_invoice_id');
        $returned = DB::table('dealer_invoice_returns')->whereIn('dealer_invoice_id', $ids)->whereNotIn('status', self::CANCELLED)
            ->groupBy('dealer_invoice_id')->selectRaw('dealer_invoice_id, SUM(grand_total) as amount')->pluck('amount', 'dealer_invoice_id');

        $out = [];
        foreach ($totals as $id => $total) {
            $row = ['total' => round((float) $total, 2), 'paid_now' => round((float) ($paidNow[$id] ?? 0), 2),
                'received' => round((float) ($received[$id] ?? 0), 2), 'returned' => round((float) ($returned[$id] ?? 0), 2)];
            $row['balance'] = max(0.0, round($row['total'] - $row['paid_now'] - $row['received'] - $row['returned'], 2));
            $row['status'] = $row['balance'] < 0.01 ? 'Paid' : ($row['balance'] < $row['total'] - 0.005 ? 'Part paid' : 'Credit');
            $out[(int) $id] = $row;
        }

        return $out;
    }

    /**
     * A store's open (not cancelled, balance due) dealer invoices, oldest first, optionally for one dealer.
     *
     * @return list<array<string, mixed>>
     */
    public function open(int $storeId, ?int $customerId = null): array
    {
        $invoices = DB::table('dealer_invoices as d')->leftJoin('customers as c', 'c.id', '=', 'd.customer_id')
            ->where('d.store_id', $storeId)->whereNotIn('d.status', self::CANCELLED)
            ->when($customerId, fn ($q) => $q->where('d.customer_id', $customerId))
            ->orderBy('d.invoice_date')->orderBy('d.id')
            ->get(['d.id', 'd.invoice_no', 'd.invoice_date', 'd.customer_id', 'd.grand_total', 'c.name as customer_name', 'c.phone as customer_phone']);
        $balances = $this->forInvoices($invoices->pluck('id')->all());

        return $invoices->map(fn ($i) => [
            'id' => (int) $i->id, 'invoice_no' => $i->invoice_no, 'bill_no' => DocumentNumberService::short($i->invoice_no, 'D'),
            'invoice_date' => substr((string) $i->invoice_date, 0, 10), 'customer_id' => (int) $i->customer_id, 'customer_name' => $i->customer_name, 'customer_phone' => $i->customer_phone,
            ...$balances[(int) $i->id],
        ])->filter(fn ($i) => $i['balance'] >= 0.01)->values()->all();
    }
}
