<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\SalesApproval;
use App\Models\SalesApprovalItem;
use App\Services\DocumentNumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SalesApprovalController extends Controller
{
    public function index(Request $request)
    {
        $query = SalesApproval::with(['customer', 'items.product', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('approval_no', 'like', "%{$search}%")
                ->orWhereHas('customer', function ($cq) use ($search) {
                    $cq->where('name', 'like', "%{$search}%");
                });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('approval_date', 'desc')->limit(2000)->get();

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('approval_date', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data' => $paginated->items(),
            'total' => $paginated->total(),
            'page' => $paginated->currentPage(),
            'limit' => $paginated->perPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|exists:customers,id',
            'approval_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);

        $approval = DB::transaction(function () use ($request, $storeId) {
            $customerId = $request->input('customer_id');
            if (! $customerId) {
                $defaultCustomer = Customer::first();
                $customerId = $defaultCustomer ? $defaultCustomer->id : 1;
            }

            $approvalNo = $request->input('approval_no') ?: DocumentNumberService::resolve($request, (int) $storeId, 'APP');
            $itemsData = $request->input('items', []);
            $totalAmount = 0;

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['price'] ?? 0);
                $totalAmount += ($qty * $price);
            }

            $salesApproval = SalesApproval::create([
                'store_id' => $storeId,
                'customer_id' => $customerId,
                'approval_no' => $approvalNo,
                'approval_date' => $request->input('approval_date') ?: now()->toDateString(),
                'valid_until' => $request->input('valid_until') ?: now()->addDays(7)->toDateString(),
                'total_amount' => $totalAmount,
                'status' => 'PENDING',
                'created_by' => $request->user()?->id ?? 1,
            ]);

            foreach ($itemsData as $item) {
                SalesApprovalItem::create([
                    'sales_approval_id' => $salesApproval->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'] ?? 0,
                    'status' => 'PENDING',
                ]);
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

    public function accept($id)
    {
        $approval = SalesApproval::find($id);

        if (! $approval) {
            return response()->json([
                'success' => false,
                'message' => 'Sales approval record not found',
            ], 404);
        }

        $approval->update(['status' => 'APPROVED']);
        $approval->items()->update(['status' => 'APPROVED']);

        return response()->json([
            'success' => true,
            'message' => 'Sales approval accepted and converted',
            'data' => $approval->load(['customer', 'items.product']),
        ]);
    }

    public function reject($id)
    {
        $approval = SalesApproval::find($id);

        if (! $approval) {
            return response()->json([
                'success' => false,
                'message' => 'Sales approval record not found',
            ], 404);
        }

        $approval->update(['status' => 'REJECTED']);
        $approval->items()->update(['status' => 'REJECTED']);

        return response()->json([
            'success' => true,
            'message' => 'Sales approval rejected and items returned',
            'data' => $approval->load(['customer', 'items.product']),
        ]);
    }

    public function nextApprovalNo(Request $request)
    {
        $storeId = (int) $request->header('X-Company-Scope-Id', 1);
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
