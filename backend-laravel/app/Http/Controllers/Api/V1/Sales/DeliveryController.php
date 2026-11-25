<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Services\Sales\DeliveryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Sales > Delivery: look up a bill, resolve scanned barcodes, save the checked handover, and the delivery register.
 * Store scoping comes from the store context (Delivery, PosSale, DealerInvoice are store-owned models).
 */
class DeliveryController extends Controller
{
    private const REGISTER_LIMIT = 1000;

    public function __construct(private DeliveryService $deliveries) {}

    public function bill(Request $request): JsonResponse
    {
        $request->validate(['no' => 'required|string|max:100']);
        $bill = $this->deliveries->bill((string) $request->input('no'));
        if (! $bill) {
            return response()->json(['success' => false, 'message' => 'No POS bill or dealer invoice '.$request->input('no').' in this store.'], 404);
        }

        return response()->json(['success' => true, 'data' => [...$bill, 'can_verify_all' => $this->deliveries->mayVerifyAll($request->user(), (int) $this->resolveStoreId($request, null))]]);
    }

    /** Bills still waiting to be handed over (last 7 days by default), for the picker next to the bill number box. */
    public function pending(Request $request): JsonResponse
    {
        $request->validate(['days' => 'nullable|integer|min:1|max:31']);
        $rows = $this->deliveries->pending((int) $request->input('days', 7));

        return response()->json(['success' => true, 'data' => $rows, 'total' => $rows->count()]);
    }

    public function scan(Request $request): JsonResponse
    {
        $request->validate(['barcode' => 'required|string|max:100']);
        $found = $this->deliveries->scan((string) $request->input('barcode'));

        return $found
            ? response()->json(['success' => true, 'data' => $found])
            : response()->json(['success' => false, 'message' => 'Unknown barcode '.$request->input('barcode').'.'], 404);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source_type' => 'required|in:pos_sale,dealer_invoice',
            'method' => 'nullable|in:scan,click,mixed',
            'source_id' => 'required|integer|min:1',
            'items' => 'present|array|max:2000',
            'items.*.product_id' => 'required|integer',
            'items.*.variant_id' => 'nullable|integer',
            'items.*.qty' => 'required|numeric|min:0|max:100000',
            'items.*.barcodes' => 'nullable|array|max:2000',
            'items.*.barcodes.*' => 'string|max:100',
            'short_reason' => 'nullable|string|max:500',
            'approvalToken' => 'nullable|string|max:100',
        ]);
        $storeId = (int) $this->resolveStoreId($request, null);
        abort_unless($storeId > 0, 422, 'Select a store first.');
        $delivery = $this->deliveries->deliver($request->user(), $storeId, $data, (bool) $request->attributes->get('authenticated_sync_replay'));

        return response()->json([
            'success' => true,
            'message' => $delivery->status === Delivery::SHORT ? 'Handed over short.' : 'Handed over.',
            'data' => $this->deliveries->presentDelivery($delivery),
        ], 201);
    }

    /** The register: deliveries between from and to (default today), newest first. */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date', 'status' => 'nullable|in:delivered,short']);
        $from = Carbon::parse($request->input('from', now()->toDateString()))->startOfDay();
        $to = Carbon::parse($request->input('to', $from->toDateString()))->endOfDay();
        $rows = Delivery::with(['customer:id,name,phone', 'deliverer:id,name', 'approver:id,name'])
            ->whereBetween('delivered_at', [$from, $to])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->orderByDesc('delivered_at')->orderByDesc('id')
            ->limit(self::REGISTER_LIMIT)->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (Delivery $row) => [
            'id' => $row->id,
            'bill_no' => $row->bill_no,
            'bill_type' => $row->source_type === 'dealer_invoice' ? 'Dealer invoice' : 'POS bill',
            'customer' => $row->customer?->name ?: 'Walk-in Customer',
            'status' => $row->status,
            'status_label' => $row->status === Delivery::SHORT ? 'Short delivered' : 'Delivered',
            'check_method' => $row->check_method,
            'check_label' => ['click' => 'Verified by click', 'mixed' => 'Mixed'][$row->check_method] ?? 'Scanned',
            'expected_qty' => (float) $row->expected_qty,
            'delivered_qty' => (float) $row->delivered_qty,
            'short_qty' => round((float) $row->expected_qty - (float) $row->delivered_qty, 3),
            'short_reason' => $row->short_reason,
            'delivered_by' => $row->deliverer?->name,
            'approved_by' => $row->approver?->name,
            'delivered_at' => $row->delivered_at?->toIso8601String(),
        ])->values(), 'total' => $rows->count()]);
    }
}
