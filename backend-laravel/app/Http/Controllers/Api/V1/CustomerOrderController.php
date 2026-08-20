<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerOrder;
use App\Models\CustomerOrderItem;
use App\Models\Product;
use App\Models\Stock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CustomerOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = CustomerOrder::with(['customer', 'items.product', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('order_no', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                  });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('order_date', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('order_date', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => $paginated->items(),
            'total'   => $paginated->total(),
            'page'    => $paginated->currentPage(),
            'limit'   => $paginated->perPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id'   => 'nullable|exists:customers,id',
            'order_date'    => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'items'         => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);

        $order = DB::transaction(function () use ($request, $storeId) {
            $customerId = $request->input('customer_id');
            if (!$customerId) {
                $defaultCustomer = Customer::first();
                $customerId = $defaultCustomer ? $defaultCustomer->id : 1;
            }

            $orderNo = $request->input('order_no') ?: 'ORD-' . date('Ymd') . '-' . rand(1000, 9999);
            $itemsData = $request->input('items', []);
            $totalAmount = 0;

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['price'] ?? 0);
                $tax = (float) ($item['tax_amount'] ?? 0);
                $totalAmount += ($qty * $price) + $tax;
            }

            $advancePaid = (float) $request->input('advance_paid', 0);
            $balanceDue = max(0, $totalAmount - $advancePaid);

            $customerOrder = CustomerOrder::create([
                'store_id'      => $storeId,
                'customer_id'   => $customerId,
                'order_no'      => $orderNo,
                'order_date'    => $request->input('order_date') ?: now()->toDateString(),
                'delivery_date' => $request->input('delivery_date'),
                'total_amount'  => $totalAmount,
                'advance_paid'  => $advancePaid,
                'balance_due'   => $balanceDue,
                'status'        => $request->input('status', 'PENDING'),
                'notes'         => $request->input('notes'),
                'created_by'    => $request->user()?->id ?? 1,
            ]);

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['price'] ?? 0);
                $tax = (float) ($item['tax_amount'] ?? 0);

                CustomerOrderItem::create([
                    'customer_order_id' => $customerOrder->id,
                    'product_id'        => $item['product_id'],
                    'quantity'          => $qty,
                    'price'             => $price,
                    'tax_amount'        => $tax,
                    'total'             => ($qty * $price) + $tax,
                ]);
            }

            return $customerOrder;
        });

        return response()->json([
            'success' => true,
            'message' => 'Customer order created successfully',
            'data'    => $order->load(['customer', 'items.product']),
        ], 201);
    }

    public function show($id)
    {
        $order = CustomerOrder::with(['customer', 'items.product', 'creator'])->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Customer order not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $order,
        ]);
    }

    public function update(Request $request, $id)
    {
        $order = CustomerOrder::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Customer order not found',
            ], 404);
        }

        $order->update($request->only([
            'customer_id', 'delivery_date', 'status', 'notes', 'advance_paid', 'balance_due'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Customer order updated successfully',
            'data'    => $order->load(['customer', 'items.product']),
        ]);
    }

    public function destroy($id)
    {
        $order = CustomerOrder::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Customer order not found',
            ], 404);
        }

        $order->items()->delete();
        $order->delete();

        return response()->json([
            'success' => true,
            'message' => 'Customer order deleted successfully',
        ]);
    }

    public function nextOrderNo()
    {
        $latest = CustomerOrder::max('id') + 1;
        $nextNo = 'ORD-' . date('Ymd') . '-' . str_pad($latest, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'data'    => $nextNo,
            'next_order_no' => $nextNo,
        ]);
    }

    public function customerQuickCreate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'  => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'city'  => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $code = 'CUST_' . strtoupper(substr(uniqid(), -6));

        $customer = Customer::create([
            'name'      => $request->input('name'),
            'code'      => $code,
            'phone'     => $request->input('phone'),
            'city'      => $request->input('city'),
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer created successfully',
            'data'    => $customer,
        ], 201);
    }

    public function customerSearch(Request $request)
    {
        $search = $request->input('query') ?? $request->input('q') ?? $request->input('search') ?? '';

        $customers = Customer::where('name', 'like', "%{$search}%")
            ->orWhere('phone', 'like', "%{$search}%")
            ->orWhere('code', 'like', "%{$search}%")
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $customers,
        ]);
    }

    public function stockAvailability(Request $request)
    {
        $productId = $request->input('product_id');
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $stock = Stock::where('store_id', $storeId)->where('product_id', $productId)->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'product_id' => $productId,
                'available_quantity' => $stock ? $stock->quantity : 0,
            ],
        ]);
    }

    public function stockProducts(Request $request)
    {
        $search = $request->input('search') ?? $request->input('q') ?? '';
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $stocks = Stock::with(['product.brand', 'product.category', 'product.tax'])
            ->where('store_id', $storeId)
            ->whereHas('product', function ($q) use ($search) {
                if ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('barcode', 'like', "%{$search}%");
                }
            })
            ->limit(30)
            ->get();

        $data = $stocks->map(function ($s) {
            return [
                'id'            => $s->product_id,
                'product_id'    => $s->product_id,
                'name'          => $s->product?->name,
                'code'          => $s->product?->code,
                'barcode'       => $s->product?->barcode,
                'selling_price' => $s->product?->selling_price,
                'mrp'           => $s->product?->mrp,
                'cost_price'    => $s->product?->cost_price,
                'tax_rate'      => $s->product?->tax?->rate ?? 0,
                'quantity'      => $s->quantity,
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }
}
