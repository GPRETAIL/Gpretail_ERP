<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PosSale;
use App\Models\Settlement;
use App\Services\DocumentNumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SettlementController extends Controller
{
    public function index(Request $request)
    {
        $query = Settlement::with('settler');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('batch_no', 'like', "%{$search}%");
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('settlement_date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('settlement_date', 'desc')->paginate($limit);

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
            'settlement_date' => 'nullable|date',
            'total_sales' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);
        $batchNo = $request->input('batch_no') ?: DocumentNumberService::resolve($request, (int) $storeId, 'SETTLE');

        $settlement = Settlement::create([
            'store_id' => $storeId,
            'batch_no' => $batchNo,
            'settlement_date' => $request->input('settlement_date') ?: now()->toDateString(),
            'total_sales' => $request->input('total_sales', 0),
            'cash_total' => $request->input('cash_total', 0),
            'card_total' => $request->input('card_total', 0),
            'upi_total' => $request->input('upi_total', 0),
            'credit_total' => $request->input('credit_total', 0),
            'settled_by' => $request->user()?->id ?? 1,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daily settlement recorded successfully',
            'data' => $settlement->load('settler'),
        ], 201);
    }

    public function nextSettlementNumber(Request $request)
    {
        $storeId = (int) $request->header('X-Company-Scope-Id', 1);
        $nextNo = DocumentNumberService::peek($storeId, 'SETTLE');

        return response()->json([
            'success' => true,
            'data' => $nextNo,
            'next_settlement_number' => $nextNo,
        ]);
    }

    public function unpaidBills(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $status = $request->input('status', 'all');

        $query = PosSale::with(['customer', 'payments'])
            ->where('store_id', $storeId);

        match ($status) {
            'credit' => $query->where('payment_mode', 'CREDIT'),
            'canceled', 'cancelled' => $query->where('status', 'CANCELLED'),
            // "all" - genuinely outstanding bills, not just credit-mode ones
            default => $query->whereColumn('paid_amount', '<', 'grand_total'),
        };

        $sales = $query->orderBy('sale_date', 'desc')->limit(50)->get();

        return response()->json([
            'success' => true,
            'data' => $sales,
            'total' => $sales->count(),
        ]);
    }

    public function getBill(Request $request, $billNo)
    {
        $sale = PosSale::with(['customer', 'payments', 'items.product'])
            ->where('invoice_no', $billNo)
            ->first();

        if (! $sale) {
            return response()->json([
                'success' => false,
                'message' => 'Bill not found: '.$billNo,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $sale,
        ]);
    }
}
