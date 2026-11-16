<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\DealerInvoicePayment;
use App\Models\DealerReceipt;
use App\Models\DealerReceiptItem;
use App\Services\Documents\DocumentNumberService;
use App\Services\Sales\DealerBalances;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Sales > Dealer Receipt: money collected from a dealer against their open dealer invoices (allocated oldest first
 * unless chosen), posted to the books by LedgerPoster (till/bank debit, dealer credit). Cancelling gives the invoices
 * their balance back.
 */
class DealerReceiptController extends Controller
{
    public function __construct(private DealerBalances $balances) {}

    /** Dealers with something due, and how much. */
    public function dealers(Request $request): JsonResponse
    {
        $open = collect($this->balances->open($this->storeId($request)));

        return response()->json(['success' => true, 'data' => $open->groupBy('customer_id')->map(fn ($rows, $id) => [
            'customer_id' => (int) $id, 'customer_name' => $rows->first()['customer_name'], 'invoices' => $rows->count(),
            'due' => round($rows->sum('balance'), 2), 'oldest' => $rows->min('invoice_date'),
        ])->sortByDesc('due')->values()]);
    }

    public function openInvoices(Request $request): JsonResponse
    {
        $request->validate(['customer_id' => 'required|integer']);

        return response()->json(['success' => true, 'data' => $this->balances->open($this->storeId($request), (int) $request->input('customer_id'))]);
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate(['customer_id' => 'nullable|integer', 'from' => 'nullable|date', 'to' => 'nullable|date']);
        $rows = DealerReceipt::with(['customer:id,name', 'creator:id,name', 'items'])
            ->when($request->filled('customer_id'), fn ($q) => $q->where('customer_id', $request->input('customer_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('receipt_date', '>=', $request->input('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('receipt_date', '<=', $request->input('to')))
            ->orderByDesc('receipt_date')->orderByDesc('id')->limit(2000)->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn ($r) => $this->present($r))->values(), 'total' => $rows->count()]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->present(DealerReceipt::with(['customer:id,name', 'creator:id,name', 'items'])->findOrFail($id), true)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01|max:999999999',
            'mode' => 'required|in:'.implode(',', DealerInvoicePayment::MODES),
            'reference_no' => 'nullable|string|max:100|required_if:mode,CHEQUE',
            'cheque_date' => 'nullable|date',
            'receipt_date' => 'nullable|date',
            'notes' => 'nullable|string|max:500',
            'allocations' => 'nullable|array|max:500',
            'allocations.*.dealer_invoice_id' => 'required|integer',
            'allocations.*.amount' => 'required|numeric|min:0',
        ], ['reference_no.required_if' => 'Enter the cheque number.']);
        $storeId = $this->storeId($request);
        abort_unless(Customer::whereKey($data['customer_id'])->exists(), 422, 'Choose a dealer of this store.');

        $receipt = DB::transaction(function () use ($request, $data, $storeId) {
            // The dealer's invoices are locked so two receipts cannot pay the same balance.
            DB::table('dealer_invoices')->where('store_id', $storeId)->where('customer_id', $data['customer_id'])->lockForUpdate()->pluck('id');
            $open = collect($this->balances->open($storeId, (int) $data['customer_id']))->keyBy('id');
            $amount = round((float) $data['amount'], 2);
            if ($amount > $open->sum('balance') + 0.005) {
                throw ValidationException::withMessages(['amount' => 'The dealer owes only ₹'.number_format($open->sum('balance'), 2).' on open invoices.']);
            }
            $allocations = $this->allocate($open, $amount, $data['allocations'] ?? null);

            $receipt = DealerReceipt::create([
                'store_id' => $storeId, 'receipt_no' => DocumentNumberService::resolve($request, $storeId, 'DREC'),
                'customer_id' => $data['customer_id'], 'receipt_date' => $data['receipt_date'] ?? now()->toDateString(),
                'mode' => $data['mode'], 'amount' => $amount, 'reference_no' => $data['reference_no'] ?? null,
                'cheque_date' => $data['cheque_date'] ?? null, 'notes' => $data['notes'] ?? null, 'status' => 'COMPLETED',
                'created_by' => $request->user()->id,
            ]);
            foreach ($allocations as $invoiceId => $part) {
                DealerReceiptItem::create(['dealer_receipt_id' => $receipt->id, 'dealer_invoice_id' => $invoiceId, 'amount' => $part]);
            }

            return $receipt;
        });

        return response()->json(['success' => true, 'message' => 'Receipt saved.',
            'data' => $this->present($receipt->load(['customer:id,name', 'creator:id,name', 'items']), true)], 201);
    }

    /** Cancels a receipt: its invoices get their balance back and its voucher is dropped. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $receipt = DealerReceipt::findOrFail($id);
        abort_if($receipt->status === 'CANCELLED', 422, 'This receipt is already cancelled.');
        $receipt->update(['status' => 'CANCELLED', 'cancelled_at' => now(), 'cancelled_by' => $request->user()->id]);

        return response()->json(['success' => true, 'message' => 'Receipt cancelled.', 'data' => $this->present($receipt->load(['customer:id,name', 'creator:id,name', 'items']))]);
    }

    /**
     * The receipt split across invoices: as chosen (each within its balance, adding up to the amount), or oldest first.
     *
     * @return array<int, float> invoice id → amount
     */
    private function allocate($open, float $amount, ?array $chosen): array
    {
        $out = [];
        if ($chosen) {
            foreach ($chosen as $row) {
                $part = round((float) $row['amount'], 2);
                if ($part <= 0) {
                    continue;
                }
                $invoice = $open->get((int) $row['dealer_invoice_id']);
                if (! $invoice) {
                    throw ValidationException::withMessages(['allocations' => 'An invoice in the allocation is not open for this dealer.']);
                }
                if ($part > $invoice['balance'] + 0.005) {
                    throw ValidationException::withMessages(['allocations' => "Only ₹{$invoice['balance']} is due on {$invoice['bill_no']}."]);
                }
                $out[$invoice['id']] = ($out[$invoice['id']] ?? 0) + $part;
            }
            if (abs(array_sum($out) - $amount) > 0.005) {
                throw ValidationException::withMessages(['allocations' => 'The amounts given to invoices must add up to the receipt amount.']);
            }

            return $out;
        }
        $left = $amount;
        foreach ($open as $invoice) {
            if ($left < 0.005) {
                break;
            }
            $part = round(min($left, $invoice['balance']), 2);
            $out[$invoice['id']] = $part;
            $left = round($left - $part, 2);
        }

        return $out;
    }

    private function present(DealerReceipt $receipt, bool $withInvoices = false): array
    {
        $numbers = $withInvoices ? DB::table('dealer_invoices')->whereIn('id', $receipt->items->pluck('dealer_invoice_id'))->pluck('invoice_no', 'id') : collect();

        return [
            'id' => $receipt->id, 'receipt_no' => $receipt->receipt_no, 'bill_no' => DocumentNumberService::short($receipt->receipt_no, 'R'),
            'receipt_date' => $receipt->receipt_date?->toDateString(), 'customer_id' => $receipt->customer_id, 'customer_name' => $receipt->customer?->name,
            'mode' => $receipt->mode, 'amount' => (float) $receipt->amount, 'reference_no' => $receipt->reference_no,
            'cheque_date' => $receipt->cheque_date?->toDateString(), 'notes' => $receipt->notes, 'status' => $receipt->status,
            'created_by' => $receipt->creator?->name, 'invoices' => $receipt->items->count(),
            'allocations' => $withInvoices ? $receipt->items->map(fn ($i) => ['dealer_invoice_id' => $i->dealer_invoice_id, 'amount' => (float) $i->amount,
                'bill_no' => DocumentNumberService::short($numbers[$i->dealer_invoice_id] ?? '', 'D')])->values() : [],
        ];
    }

    private function storeId(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');

        return $storeId;
    }
}
