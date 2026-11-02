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
use App\Models\User;
use App\Services\Approvals\ApprovalService;
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
        $query = SalesApproval::with(['customer', 'items.product', 'creator', 'posSale']);

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
        // The screen's own filters (approval no, customer, product), also used by the notification link.
        if ($request->filled('approvalNo')) {
            $query->where('approval_no', 'like', '%'.$request->input('approvalNo').'%');
        }
        if ($request->filled('customerName')) {
            $name = $request->input('customerName');
            $query->where(fn ($q) => $q->where('customer_name', 'like', "%{$name}%")->orWhereHas('customer', fn ($cq) => $cq->where('name', 'like', "%{$name}%")));
        }
        if ($request->filled('product')) {
            $query->whereHas('items.product', fn ($pq) => $pq->where('name', 'like', '%'.$request->input('product').'%'));
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
                'data' => $items->map(fn ($approval) => $this->present($approval)),
                'total' => $items->count(),
            ]);
        }

        $result = $this->paginationService->paginate($query, 'sales_approvals', $request, [
            'default_sort' => 'id',
            'default_order' => 'desc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'approval_date', 'approval_no', 'created_at'],
        ]);
        $result['data'] = collect($result['data'])->map(fn ($approval) => $this->present($approval))->all();

        return response()->json($result);
    }

    /** The row shape the Sales on Approval list reads (date, customer, qty, amount, product names, bill). */
    private function present(SalesApproval $approval): array
    {
        return array_merge($approval->toArray(), [
            'sale_at' => $approval->approval_date->toDateString().' '.($approval->created_at?->format('H:i:s') ?? '00:00:00'),
            'customer_name' => $approval->customer_id ? $approval->customer->name : $approval->customer_name,
            'total_qty' => (float) $approval->items->sum('quantity'),
            'amount' => (float) $approval->total_amount,
            'bill_no' => $approval->posSale?->bill_no,
            'raised_by' => $approval->creator?->name,
            'items' => $approval->items->map(fn ($item) => array_merge($item->toArray(), ['product_name' => $item->product?->name]))->all(),
        ]);
    }

    /**
     * Saves the approval request exactly as entered. No stock moves here: once approved, the bill the sales user
     * makes with bill() does that, through the normal POS checkout.
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
                // Same as the POS bill that bill() will make: GST on the value after the discount.
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
        $approval = SalesApproval::with(['customer', 'items.product', 'creator', 'posSale'])->find($id);

        if (! $approval) {
            return response()->json([
                'success' => false,
                'message' => 'Sales approval record not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->present($approval),
        ]);
    }

    /** A manager, supervisor or admin approves the request. No bill yet: the sales user creates it with bill(). */
    public function accept(Request $request, $id)
    {
        $approval = SalesApproval::with('items')->whereKey($id)->first();
        if (! $approval) {
            return response()->json(['success' => false, 'message' => 'Sales approval record not found'], 404);
        }
        if ($approval->status !== 'PENDING') {
            return response()->json(['success' => false, 'message' => "This approval is already {$approval->status}."], 422);
        }
        // Nobody approves more discount than their own limit allows (POS measures it the same way at billing).
        $approvals = app(ApprovalService::class);
        $storeId = (int) $approval->store_id;
        $limit = $approvals->enabled($storeId) ? $approvals->limitFor($request->user(), $storeId)['max_discount_percent'] : null;
        if ($limit !== null) {
            $items = $this->checkoutItems($approval);
            $discount = $approvals->basketDiscount($items,
                Product::whereKey(array_column($items, 'productId'))->get()->keyBy('id'),
                Barcode::whereKey(array_filter(array_column($items, 'barcodeId')))->get()->keyBy('id'))['max_percent'];
            if ($discount > $limit + 0.001) {
                return response()->json(['success' => false, 'message' => "This request gives {$discount}% off, above your {$limit}% approval limit. Someone with a higher limit (or an admin) must approve it."], 422);
            }
        }

        $approval->update(['status' => 'APPROVED', 'decided_by' => $request->user()?->id, 'decided_at' => now()]);
        $approval->items()->update(['status' => 'APPROVED']);
        $this->notifyRequester($approval, $request, 'Approved: you can now create the bill from Sales on Approval.');

        return response()->json([
            'success' => true,
            'message' => 'Approved. The sales user can now create the bill.',
            'data' => $this->present($approval->fresh(['customer', 'items.product', 'creator', 'posSale'])),
        ]);
    }

    /**
     * The sales user turns an approved request into the bill. The approved lines go through the normal POS
     * checkout as an unsettled bill (collected later in Settlement), so stock comes out and the books post as for
     * any POS sale. Pending, rejected, expired or already billed requests cannot be billed; if the checkout
     * refuses (e.g. stock sold out meanwhile) the request stays approved and can be billed again later.
     */
    public function bill(Request $request, $id)
    {
        $approval = SalesApproval::with('items')->whereKey($id)->first();
        if (! $approval) {
            return response()->json(['success' => false, 'message' => 'Sales approval record not found'], 404);
        }
        if ($approval->status !== 'APPROVED' || $approval->pos_sale_id) {
            $why = match ($approval->status) {
                'PENDING' => 'It is still waiting for approval.',
                'REJECTED' => 'It was rejected.',
                default => 'It is already billed.',
            };

            return response()->json(['success' => false, 'message' => "No bill can be made from this request. $why"], 422);
        }
        if ($approval->valid_until && $approval->valid_until->lt(today())) {
            return response()->json(['success' => false, 'message' => 'This approval expired on '.$approval->valid_until->format('d M Y').'. Raise a new request.'], 422);
        }
        // Claim it first so a double click or a second counter cannot make two bills.
        if (! SalesApproval::whereKey($approval->id)->where('status', 'APPROVED')->whereNull('pos_sale_id')->update(['status' => 'BILLING'])) {
            return response()->json(['success' => false, 'message' => 'This request is already being billed.'], 422);
        }

        $payload = [
            'checkoutKey' => (string) Str::uuid(),
            'saleSaveAs' => 'unsettled',
            'customerId' => $approval->customer_id,
            'customer' => $approval->customer_id || ! $approval->customer_name ? null : ['name' => $approval->customer_name, 'mobileNo' => $approval->customer_mobile],
            'items' => $this->checkoutItems($approval),
        ];
        // Where discount limits are on, POS would stop this bill for the cashier's limit. The manager already
        // approved these exact lines (within their own limit, checked in accept()), so hand the checkout a
        // single-use discount approval from that manager, capped at the manager's limit.
        $approvals = app(ApprovalService::class);
        if ($approvals->enabled((int) $approval->store_id)) {
            $approver = User::find($approval->decided_by) ?? $request->user();
            $grant = $approvals->createRequest($request->user(), (int) $approval->store_id, 'pos_discount',
                ['requested_percent' => 100, 'reason_code' => 'sales_approval', 'note' => "Sales approval {$approval->approval_no}"]);
            $approvals->approve($grant, $approver, $approvals->limitFor($approver, (int) $approval->store_id)['max_discount_percent'], 'Approved through sales approval');
            $payload['approvalToken'] = $approvals->issueToken($grant);
        }
        $checkout = Request::create($request->getUri(), 'POST', $payload);
        $checkout->headers->replace($request->headers->all());
        $checkout->headers->remove('Content-Type'); // The payload is in the parameters, not a JSON body.
        $checkout->setUserResolver($request->getUserResolver());
        $checkout->attributes->add($request->attributes->all());

        try {
            $response = app(PosSaleController::class)->store($checkout);
        } catch (\Throwable $e) {
            SalesApproval::whereKey($approval->id)->update(['status' => 'APPROVED']); // Release the claim.
            throw $e;
        }
        $sale = $response->getData(true);
        if ($response->getStatusCode() !== 201) {
            SalesApproval::whereKey($approval->id)->update(['status' => 'APPROVED']); // Release the claim.

            return response()->json(['success' => false, 'message' => $sale['message'] ?? 'The bill could not be made from this approval.', 'errors' => $sale['errors'] ?? null], 422);
        }

        $approval->update(['status' => 'BILLED', 'pos_sale_id' => $sale['data']['id'] ?? null]);
        $approval->items()->update(['status' => 'BILLED']);

        return response()->json([
            'success' => true,
            'message' => 'Bill '.($sale['data']['bill_no'] ?? '').' created; collect payment in Settlement.',
            'data' => $this->present($approval->fresh(['customer', 'items.product', 'creator', 'posSale'])),
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

    /** The approved lines in the POS checkout's item shape. */
    private function checkoutItems(SalesApproval $approval): array
    {
        return $approval->items->map(fn ($item) => array_filter([
            'productId' => (int) $item->product_id, 'variantId' => $item->variant_id ? (int) $item->variant_id : null,
            'barcodeId' => $item->barcode_id ? (int) $item->barcode_id : null, 'qty' => (float) $item->quantity,
            'price' => (float) $item->price, 'discount' => (float) $item->discount, 'tax' => (float) $item->tax_rate,
        ], fn ($value) => $value !== null))->values()->all();
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
            'link' => '/sales/sales-on-approval?approval='.urlencode((string) $approval->approval_no),
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
