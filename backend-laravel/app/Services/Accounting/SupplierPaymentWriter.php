<?php

namespace App\Services\Accounting;

use App\Models\DirectPurchase;
use App\Models\OpeningBill;
use App\Models\PurchaseInvoice;
use App\Models\SupplierPayment;
use App\Models\SupplierPaymentItem;
use App\Services\Documents\DocumentNumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Finance > Supplier Payment: one payment to a supplier, split across their purchase invoices, direct purchases and
 * opening bills (oldest first unless the screen sends its own split). Anything not allocated stays with the supplier
 * as an advance. LedgerPoster posts the payment (supplier debit, cash or bank credit).
 */
class SupplierPaymentWriter
{
    public const MODES = ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE'];

    public const TYPES = ['invoice', 'direct', 'opening'];

    /**
     * @param  array{supplier_id: int, amount: float, payment_mode: string, payment_date?: ?string, reference_no?: ?string, cheque_date?: ?string, notes?: ?string, allocations?: array<int, array{invoice_type: string, id: int, amount: float}>}  $data
     */
    public function save(Request $request, int $storeId, array $data): SupplierPayment
    {
        $amount = round((float) $data['amount'], 2);
        $supplierId = (int) $data['supplier_id'];

        return DB::transaction(function () use ($request, $storeId, $data, $amount, $supplierId) {
            $bills = $this->lockedBills($storeId, $supplierId, $data['allocations'] ?? []);
            $split = $this->split($bills, $data['allocations'] ?? [], $amount);

            $payment = SupplierPayment::create([
                'supplier_id' => $supplierId, 'store_id' => $storeId,
                'payment_no' => DocumentNumberService::resolve($request, $storeId, 'SPAY'),
                'payment_date' => ($data['payment_date'] ?? null) ?: now(config('app.business_timezone'))->toDateString(),
                'amount' => $amount, 'payment_mode' => $data['payment_mode'], 'reference_no' => $data['reference_no'] ?? null,
                'cheque_date' => $data['payment_mode'] === 'CHEQUE' ? ($data['cheque_date'] ?? null) : null,
                'notes' => $data['notes'] ?? null, 'created_by' => $request->user()?->id,
            ]);
            foreach ($split as [$type, $bill, $part]) {
                SupplierPaymentItem::create([
                    'supplier_payment_id' => $payment->id, 'amount_paid' => $part,
                    'purchase_invoice_id' => $type === 'invoice' ? $bill->id : null,
                    'direct_purchase_id' => $type === 'direct' ? $bill->id : null,
                    'opening_bill_id' => $type === 'opening' ? $bill->id : null,
                ]);
                $bill->paid_amount = round((float) $bill->paid_amount + $part, 2);
                if ($type !== 'opening') {
                    $bill->payment_status = $bill->paid_amount >= $this->total($type, $bill) - 0.005 ? 'PAID' : 'PARTIAL';
                }
                $bill->save();
            }

            return $payment;
        });
    }

    /** The bills named in the split, locked, and all of this supplier in this store. */
    private function lockedBills(int $storeId, int $supplierId, array $allocations): array
    {
        $bills = [];
        foreach ($allocations as $row) {
            $type = $row['invoice_type'];
            $bill = match ($type) {
                'invoice' => PurchaseInvoice::where('store_id', $storeId)->lockForUpdate()->find($row['id']),
                'direct' => DirectPurchase::where('store_id', $storeId)->lockForUpdate()->find($row['id']),
                default => OpeningBill::where('store_id', $storeId)->where('party_type', 'supplier')->lockForUpdate()->find($row['id']),
            };
            $owner = $bill ? (int) ($type === 'opening' ? $bill->party_id : $bill->supplier_id) : null;
            if (! $bill || $owner !== $supplierId) {
                throw ValidationException::withMessages(['allocations' => 'Every bill paid must be one of this supplier\'s bills in this store.']);
            }
            $bills[$type.':'.$bill->id] = [$type, $bill];
        }

        return $bills;
    }

    /** [type, bill, amount] per bill: each part at most the bill's balance, all parts at most the payment. */
    private function split(array $bills, array $allocations, float $amount): array
    {
        $out = [];
        $left = $amount;
        foreach ($allocations as $row) {
            [$type, $bill] = $bills[$row['invoice_type'].':'.$row['id']];
            $part = round((float) $row['amount'], 2);
            if ($part <= 0) {
                continue;
            }
            $balance = round($this->total($type, $bill) - (float) $bill->paid_amount, 2);
            if ($part > $balance + 0.005) {
                throw ValidationException::withMessages(['allocations' => 'Bill '.$this->number($type, $bill).' has only '.number_format(max(0, $balance), 2).' due.']);
            }
            if ($part > $left + 0.005) {
                throw ValidationException::withMessages(['allocations' => 'The bills add up to more than the amount paid.']);
            }
            $left = round($left - $part, 2);
            $out[] = [$type, $bill, $part];
        }

        return $out;
    }

    private function total(string $type, object $bill): float
    {
        return (float) match ($type) {
            'invoice' => $bill->grand_total,
            'direct' => $bill->total_amount,
            default => $bill->amount,
        };
    }

    private function number(string $type, object $bill): string
    {
        return (string) match ($type) {
            'invoice' => $bill->invoice_no,
            'direct' => $bill->purchase_no,
            default => $bill->bill_no,
        };
    }
}
