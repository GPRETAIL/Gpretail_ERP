<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreSalesApprovalRequest;
use App\Models\Barcode;
use App\Models\Customer;
use App\Models\Notification;
use App\Models\Product;
use App\Models\SalesApproval;
use App\Models\SalesApprovalItem;
use App\Services\Documents\DocumentNumberService;
use App\Support\GroupAggregationService;
use App\Support\PaginationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SalesApprovalController extends Controller
{
    public function __construct(
        private readonly PaginationService $paginationService,
        private readonly GroupAggregationService $groupAggregationService,
    ) {}

    private function filteredQuery(Request $request)
    {
        $query = SalesApproval::with(['customer', 'items.product', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('approval_no', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return $query;
    }

    public function groupedSummary(Request $request)
    {
        $result = $this->groupAggregationService->summarize($this->filteredQuery($request), 'sales_approvals', $request);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('approval_date', 'desc')->limit(2000)->get();

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $items->count(),
            ]);
        }

        $result = $this->paginationService->paginate($query, 'sales_approvals', $request, [
            'default_sort' => 'id',
            'default_order' => 'desc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'approval_date', 'approval_no', 'created_at'],
        ]);

        return response()->json($result);
    }

    /**
     * Saves the approval request exactly as entered. No stock moves here: the bill made on accept() does that,
     * through the normal POS checkout.
     */
    public function store(StoreSalesApprovalRequest $request)
    {
        $storeId = $this->resolveStoreId($request, 1);
        $lines = [];
        foreach (array_values($request->input('items', [])) as $i => $item) {
            $barcode = isset($item['barcodeId']) ? Barcode::find((int) $item['barcodeId']) : null;
            $product = Product::find((int) ($barcode->product_id ?? $item['productId'] ?? $item['product_id'] ?? 0)); // Store-scoped.
            if (! $product) {
                return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => ["items.$i" => ['Product not found in this store.']]], 422);
            }
            $qty = (float) ($item['qty'] ?? $item['quantity']);
            $price = (float) ($item['price'] ?? 0);
            $discount = (float) ($item['discount'] ?? 0);
            $lines[] = ['product_id' => $product->id, 'variant_id' => $barcode->variant_id ?? $item['variantId'] ?? null, 'barcode_id' => $barcode?->id,
                'quantity' => $qty, 'price' => $price, 'discount' => $discount, 'tax_rate' => (float) ($item['tax'] ?? 0)];
        }
        $customerId = $request->input('customerId') ?? $request->input('customer_id');
        if ($customerId && ! Customer::find($customerId)) {
            return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => ['customerId' => ['Select a customer from this store.']]], 422);
        }

        $approval = DB::transaction(function () use ($request, $storeId, $lines, $customerId) {
            $total = 0;
            foreach ($lines as $line) {
                // Same as the POS bill accept() will make: GST on the value after the discount.
                $taxable = max(0, $line['quantity'] * $line['price'] - $line['discount']);
                $total += $taxable * (1 + $line['tax_rate'] / 100);
            }

            $salesApproval = SalesApproval::create([
                'store_id' => $storeId,
                'customer_id' => $customerId ?: null,
                'customer_name' => $customerId ? null : $request->input('customer.name'),
                'customer_mobile' => $customerId ? null : $request->input('customer.mobileNo'),
                'approval_no' => $request->input('approval_no') ?: DocumentNumberService::resolve($request, (int) $storeId, 'APP'),
                'approval_date' => $request->input('approval_date') ?: now()->toDateString(),
                'valid_until' => $request->input('valid_until') ?: now()->addDays(7)->toDateString(),
                'total_amount' => round(max(0, $total), 2),
                'status' => 'PENDING',
                'created_by' => $request->user()->id ?? null,
            ]);
            foreach ($lines as $line) {
                SalesApprovalItem::create($line + ['sales_approval_id' => $salesApproval->id, 'status' => 'PENDING']);
            }

            return $salesApproval;
        });

        return response()->json([
            'success' => true,
            'message' => 'Sales on approval request created successfully',
            'data' => $approval->load(['customer', 'items.product']),
        ], 201);
    }

    public function show($id)
    {
        $approval = SalesApproval::with(['customer', 'items.product', 'creator'])->find($id);

        if (! $approval) {
            return response()->json([
                'success' => false,
                'message' => 'Sales approval record not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $approval,
        ]);
    }

    /**
     * Approves the request and makes the bill: the saved lines go through the normal POS checkout as an
     * unsettled bill (collected later in Settlement), so stock comes out and the books post exactly as for any
     * POS sale. If the checkout refuses (e.g. not enough stock) the approval stays pending.
     */
    public function accept(Request $request, $id)
    {
        $approval = SalesApproval::with('items')->whereKey($id)->first();
        if (! $approval) {
            return response()->json(['success' => false, 'message' => 'Sales approval record not found'], 404);
        }
        if ($approval->status !== 'PENDING') {
            return response()->json(['success' => false, 'message' => "This approval is already {$approval->status}."], 422);
        }

        $payload = [
            'checkoutKey' => (string) Str::uuid(),
            'saleSaveAs' => 'unsettled',
            'customerId' => $approval->customer_id,
            'customer' => $approval->customer_id || ! $approval->customer_name ? null : ['name' => $approval->customer_name, 'mobileNo' => $approval->customer_mobile],
            'items' => $approval->items->map(fn ($item) => array_filter([
                'productId' => (int) $item->product_id, 'variantId' => $item->variant_id ? (int) $item->variant_id : null,
                'barcodeId' => $item->barcode_id ? (int) $item->barcode_id : null, 'qty' => (float) $item->quantity,
                'price' => (float) $item->price, 'discount' => (float) $item->discount, 'tax' => (float) $item->tax_rate,
            ], fn ($value) => $value !== null))->values()->all(),
        ];
        $checkout = Request::create($request->getUri(), 'POST', $payload);
        $checkout->headers->replace($request->headers->all());
        $checkout->headers->remove('Content-Type'); // The payload is in the parameters, not a JSON body.
        $checkout->setUserResolver($request->getUserResolver());
        $checkout->attributes->add($request->attributes->all());

        $response = app(PosSaleController::class)->store($checkout);
        $sale = $response->getData(true);
        if ($response->getStatusCode() !== 201) {
            return response()->json(['success' => false, 'message' => $sale['message'] ?? 'The bill could not be made from this approval.', 'errors' => $sale['errors'] ?? null], 422);
        }

        $approval->update(['status' => 'APPROVED', 'pos_sale_id' => $sale['data']['id'] ?? null, 'decided_by' => $request->user()?->id, 'decided_at' => now()]);
        $approval->items()->update(['status' => 'APPROVED']);
        $this->notifyRequester($approval, $request, 'Approved: bill '.($sale['data']['bill_no'] ?? '').' was created. Collect payment in Settlement.');

        return response()->json([
            'success' => true,
            'message' => 'Approved. Bill '.($sale['data']['bill_no'] ?? '').' was created; collect payment in Settlement.',
            'data' => $approval->fresh(['customer', 'items.product']),
            'sale' => $sale['data'] ?? null,
        ]);
    }

    /** Declines the request. Nothing was taken from stock, so nothing goes back. */
    public function reject(Request $request, $id)
    {
        $approval = SalesApproval::find($id);
        if (! $approval) {
            return response()->json(['success' => false, 'message' => 'Sales approval record not found'], 404);
        }
        if ($approval->status !== 'PENDING') {
            return response()->json(['success' => false, 'message' => "This approval is already {$approval->status}."], 422);
        }

        $approval->update(['status' => 'REJECTED', 'decided_by' => $request->user()?->id, 'decided_at' => now()]);
        $approval->items()->update(['status' => 'REJECTED']);
        $this->notifyRequester($approval, $request, 'Rejected: no bill can be made from this request.');

        return response()->json([
            'success' => true,
            'message' => 'Sales approval rejected',
            'data' => $approval->load(['customer', 'items.product']),
        ]);
    }

    /** Tells the sales user who raised the request (bell + live refresh) that it was decided, and by whom. */
    private function notifyRequester(SalesApproval $approval, Request $request, string $outcome): void
    {
        if (! $approval->created_by) {
            return;
        }
        Notification::create([
            'type' => 'SALES_APPROVAL_DECIDED',
            'title' => "Sales approval {$approval->approval_no} ".strtolower($approval->status),
            'message' => $outcome.' Decided by '.($request->user()->name ?? 'a manager').'.',
            'link' => '/sales/sales-on-approval',
            'reference_type' => 'SALES_APPROVAL',
            'reference_id' => $approval->id,
            'store_id' => $approval->store_id,
            'user_id' => $approval->created_by,
        ]);
    }

    public function nextApprovalNo(Request $request)
    {
        $storeId = (int) $this->resolveStoreId($request, 1);
        $nextNo = DocumentNumberService::peek($storeId, 'APP');

        return response()->json([
            'success' => true,
            'data' => $nextNo,
            'next_approval_no' => $nextNo,
        ]);
    }

    public function pendingCount()
    {
        $count = SalesApproval::where('status', 'PENDING')->count();

        return response()->json([
            'success' => true,
            'data' => ['count' => $count],
            'count' => $count,
        ]);
    }
}
