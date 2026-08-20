<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerOrder;
use App\Models\CustomerOrderCommunication;
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
        $query = CustomerOrder::with(['customer', 'items.product', 'salesman', 'supplier', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('order_no', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('order_date', '>=', $request->input('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('order_date', '<=', $request->input('to_date'));
        }

        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $items = $query->orderBy('order_date', 'desc')->orderBy('id', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit     = max(1, $request->integer('limit', 20));
        $page      = max(1, $request->integer('page', 1));
        $paginated = $query->orderBy('order_date', 'desc')->orderBy('id', 'desc')->paginate($limit, ['*'], 'page', $page);

        return response()->json([
            'success'    => true,
            'data'       => $paginated->items(),
            'total'      => $paginated->total(),
            'page'       => $paginated->currentPage(),
            'limit'      => $paginated->perPage(),
            'totalPages' => $paginated->lastPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', $request->input('companyId', 1));

        $order = DB::transaction(function () use ($request, $storeId) {
            // Resolve or create customer
            $customerId = $request->input('customerId') ?: $request->input('customer_id');

            if (!$customerId && $request->filled('customerName')) {
                $cust = Customer::firstOrCreate(
                    ['phone' => $request->input('customerPhone') ?: '0000000000'],
                    [
                        'name'    => $request->input('customerName'),
                        'code'    => 'CUST_' . strtoupper(substr(uniqid(), -6)),
                        'city'    => $request->input('customerCity'),
                        'gstin'   => $request->input('customerGst'),
                        'is_active' => true,
                    ]
                );
                $customerId = $cust->id;
            } elseif (!$customerId) {
                $defaultCustomer = Customer::first();
                $customerId = $defaultCustomer ? $defaultCustomer->id : 1;
            }

            // Generate order_no if not supplied
            $orderNo = $request->input('orderNo') ?: $request->input('order_no');
            if (!$orderNo) {
                $lastId = CustomerOrder::max('id') ?? 0;
                $orderNo = 'ORD-' . date('Ymd') . '-' . str_pad((string)($lastId + 1), 4, '0', STR_PAD_LEFT);
            }

            $itemsData   = $request->input('items', []);
            $totalAmount = 0;

            foreach ($itemsData as $item) {
                $qty   = (float) ($item['qty'] ?? $item['quantity'] ?? 1);
                $price = (float) ($item['price'] ?? 0);
                $tax   = (float) ($item['taxAmount'] ?? $item['tax_amount'] ?? 0);
                $totalAmount += ($qty * $price) + $tax;
            }

            $discountAmount = (float) ($request->input('discountAmount') ?? $request->input('discount_amount') ?? 0);
            $netAmount      = max(0, $totalAmount - $discountAmount);
            $advancePaid    = (float) ($request->input('advancePaid') ?? $request->input('advance_paid') ?? 0);
            $balanceDue     = max(0, $netAmount - $advancePaid);
            $payments       = $request->input('payments', []);

            $customerOrder = CustomerOrder::create([
                'store_id'        => $storeId,
                'customer_id'     => $customerId,
                'supplier_id'     => $request->input('supplierId') ?: $request->input('supplier_id'),
                'salesman_id'     => $request->input('receivedById') ?: ($request->input('salesmanId') ?: $request->input('salesman_id')),
                'counter_id'      => $request->input('counterId') ?: $request->input('counter_id'),
                'location_id'     => $request->input('locationId') ?: $request->input('location_id'),
                'city_id'         => $request->input('cityId') ?: $request->input('city_id'),
                'order_no'        => $orderNo,
                'order_date'      => $request->input('orderDate') ?: $request->input('order_date') ?: now()->toDateString(),
                'delivery_date'   => $request->input('deliveryDate') ?: $request->input('delivery_date'),
                'total_amount'    => $totalAmount,
                'discount_amount' => $discountAmount,
                'net_amount'      => $netAmount,
                'advance_paid'    => $advancePaid,
                'balance_due'     => $balanceDue,
                'payments'        => $payments,
                'status'          => $request->input('status', 'PENDING'),
                'notes'           => $request->input('notes'),
                'created_by'      => $request->user()?->id ?? 1,
            ]);

            foreach ($itemsData as $item) {
                $qty   = (float) ($item['qty'] ?? $item['quantity'] ?? 1);
                $price = (float) ($item['price'] ?? 0);
                $tax   = (float) ($item['taxAmount'] ?? $item['tax_amount'] ?? 0);
                $total = ($qty * $price) + $tax;

                $productId = $item['productId'] ?? $item['product_id'] ?? null;
                if (!$productId) {
                    $prod = Product::first();
                    $productId = $prod ? $prod->id : 1;
                }

                CustomerOrderItem::create([
                    'customer_order_id' => $customerOrder->id,
                    'product_id'        => $productId,
                    'product_name'      => $item['productName'] ?? $item['product_name'] ?? null,
                    'brand_id'          => $item['brandId'] ?? $item['brand_id'] ?? null,
                    'brand_name'        => $item['brandName'] ?? $item['brand_name'] ?? null,
                    'style_id'          => $item['styleId'] ?? $item['style_id'] ?? null,
                    'style_name'        => $item['styleName'] ?? $item['style_name'] ?? null,
                    'size_id'           => $item['sizeId'] ?? $item['size_id'] ?? null,
                    'size_name'         => $item['sizeName'] ?? $item['size_name'] ?? null,
                    'colour_id'         => $item['colourId'] ?? $item['colour_id'] ?? null,
                    'colour_name'       => $item['colourName'] ?? $item['colour_name'] ?? null,
                    'design_no'         => $item['designNo'] ?? $item['design_no'] ?? null,
                    'quantity'          => $qty,
                    'price'             => $price,
                    'tax_amount'        => $tax,
                    'total'             => $total,
                ]);
            }

            foreach ($request->input('communications', []) as $comm) {
                $message = $comm['note'] ?? $comm['communicationMessage'] ?? $comm['message'] ?? null;
                if (empty($message)) {
                    continue;
                }
                CustomerOrderCommunication::create([
                    'customer_order_id'     => $customerOrder->id,
                    'communication_date'    => $comm['date'] ?? $comm['communicationDate'] ?? now()->toDateString(),
                    'communication_person'  => $comm['person'] ?? $comm['communicationPerson'] ?? null,
                    'communication_message' => $message,
                    'created_by'            => $request->user()?->id,
                ]);
            }

            return $customerOrder;
        });

        return response()->json([
            'success' => true,
            'message' => 'Customer order created successfully',
            'data'    => $order->load(['customer', 'items.product', 'salesman', 'supplier', 'communications']),
        ], 201);
    }

    public function show($id)
    {
        $order = CustomerOrder::with(['customer', 'items.product', 'salesman', 'supplier', 'creator', 'communications'])->find($id);

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

        DB::transaction(function () use ($request, $order) {
            $updates = array_filter([
                'customer_id'     => $request->input('customerId') ?: $request->input('customer_id'),
                'supplier_id'     => $request->input('supplierId') ?: $request->input('supplier_id'),
                'salesman_id'     => $request->input('receivedById') ?: ($request->input('salesmanId') ?: $request->input('salesman_id')),
                'counter_id'      => $request->input('counterId') ?: $request->input('counter_id'),
                'location_id'     => $request->input('locationId') ?: $request->input('location_id'),
                'city_id'         => $request->input('cityId') ?: $request->input('city_id'),
                'order_date'      => $request->input('orderDate') ?: $request->input('order_date'),
                'delivery_date'   => $request->input('deliveryDate') ?: $request->input('delivery_date'),
                'status'          => $request->input('status'),
                'notes'           => $request->input('remarks') ?: $request->input('notes'),
                'advance_paid'    => $request->input('advancePaid') !== null ? (float) $request->input('advancePaid') : null,
                'balance_due'     => $request->input('balanceDue') !== null ? (float) $request->input('balanceDue') : null,
                'payments'        => $request->input('payments'),
            ], fn($v) => $v !== null);

            // A full edit-save from CrmCustomerOrderForm.jsx resends the
            // whole items list - replace rather than merge, same "full
            // replace" semantics as the rest of this form's edit flow.
            if ($request->has('items')) {
                $itemsData = $request->input('items', []);
                $totalAmount = 0;
                foreach ($itemsData as $item) {
                    $qty = (float) ($item['qty'] ?? $item['quantity'] ?? 1);
                    $price = (float) ($item['price'] ?? 0);
                    $tax = (float) ($item['taxAmount'] ?? $item['tax_amount'] ?? 0);
                    $totalAmount += ($qty * $price) + $tax;
                }
                $discountAmount = (float) ($request->input('discountAmount') ?? $order->discount_amount);
                $updates['total_amount'] = $totalAmount;
                $updates['net_amount'] = max(0, $totalAmount - $discountAmount);

                $order->items()->delete();
                foreach ($itemsData as $item) {
                    $qty = (float) ($item['qty'] ?? $item['quantity'] ?? 1);
                    $price = (float) ($item['price'] ?? 0);
                    $tax = (float) ($item['taxAmount'] ?? $item['tax_amount'] ?? 0);

                    $productId = $item['productId'] ?? $item['product_id'] ?? null;
                    if (!$productId) {
                        $prod = Product::first();
                        $productId = $prod ? $prod->id : 1;
                    }

                    CustomerOrderItem::create([
                        'customer_order_id' => $order->id,
                        'product_id'        => $productId,
                        'product_name'      => $item['productName'] ?? $item['product_name'] ?? null,
                        'brand_id'          => $item['brandId'] ?? $item['brand_id'] ?? null,
                        'brand_name'        => $item['brandName'] ?? $item['brand_name'] ?? null,
                        'style_id'          => $item['styleId'] ?? $item['style_id'] ?? null,
                        'style_name'        => $item['styleName'] ?? $item['style_name'] ?? null,
                        'size_id'           => $item['sizeId'] ?? $item['size_id'] ?? null,
                        'size_name'         => $item['sizeName'] ?? $item['size_name'] ?? null,
                        'colour_id'         => $item['colourId'] ?? $item['colour_id'] ?? null,
                        'colour_name'       => $item['colourName'] ?? $item['colour_name'] ?? null,
                        'design_no'         => $item['designNo'] ?? $item['design_no'] ?? null,
                        'quantity'          => $qty,
                        'price'             => $price,
                        'tax_amount'        => $tax,
                        'total'             => ($qty * $price) + $tax,
                    ]);
                }
            }

            if ($request->has('communications')) {
                $order->communications()->delete();
                foreach ($request->input('communications', []) as $comm) {
                    $message = $comm['note'] ?? $comm['communicationMessage'] ?? $comm['message'] ?? null;
                    if (empty($message)) {
                        continue;
                    }
                    CustomerOrderCommunication::create([
                        'customer_order_id'     => $order->id,
                        'communication_date'    => $comm['date'] ?? $comm['communicationDate'] ?? now()->toDateString(),
                        'communication_person'  => $comm['person'] ?? $comm['communicationPerson'] ?? null,
                        'communication_message' => $message,
                        'created_by'            => $request->user()?->id,
                    ]);
                }
            }

            $order->update($updates);
        });

        return response()->json([
            'success' => true,
            'message' => 'Customer order updated successfully',
            'data'    => $order->load(['customer', 'items.product', 'salesman', 'communications']),
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

        DB::transaction(function () use ($order) {
            $order->communications()->delete();
            $order->items()->delete();
            $order->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Customer order deleted successfully',
        ]);
    }

    public function bulk(Request $request)
    {
        // See CustomerController::bulk() - UploadImportButton posts the
        // row array as the raw JSON body, not wrapped in {rows: [...]}.
        $rows = $request->input('rows') ?? $request->all();
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $created = DB::transaction(function () use ($rows, $storeId) {
            $count = 0;
            $lastId = CustomerOrder::max('id') ?? 0;

            foreach ($rows as $row) {
                $customerId = $row['customerId'] ?? null;
                if (!$customerId && !empty($row['customerName'])) {
                    $cust = Customer::firstOrCreate(
                        ['phone' => $row['customerMobile'] ?? '0000000000'],
                        ['name' => $row['customerName'], 'code' => 'CUST_' . strtoupper(substr(uniqid(), -6)), 'is_active' => true]
                    );
                    $customerId = $cust->id;
                } elseif (!$customerId) {
                    continue;
                }

                $lastId++;
                CustomerOrder::create([
                    'store_id'      => $storeId,
                    'customer_id'   => $customerId,
                    'order_no'      => $row['orderNo'] ?? ('ORD-' . date('Ymd') . '-' . str_pad((string) $lastId, 4, '0', STR_PAD_LEFT)),
                    'order_date'    => $row['orderDate'] ?? now()->toDateString(),
                    'delivery_date' => $row['deliveryDate'] ?? null,
                    'total_amount'  => (float) ($row['totalAmount'] ?? 0),
                    'net_amount'    => (float) ($row['netAmount'] ?? $row['totalAmount'] ?? 0),
                    'advance_paid'  => (float) ($row['paidAmount'] ?? 0),
                    'balance_due'   => (float) ($row['balanceAmount'] ?? 0),
                    'status'        => $row['status'] ?? 'PENDING',
                ]);
                $count++;
            }
            return $count;
        });

        return response()->json([
            'success' => true,
            'message' => "{$created} customer order(s) imported successfully",
            'data'    => ['imported' => $created],
        ], 201);
    }

    public function nextOrderNo(Request $request)
    {
        $lastId = CustomerOrder::max('id') ?? 0;
        $nextNo = $lastId + 1;

        return response()->json([
            'success' => true,
            'data'    => [
                'orderNo' => $nextNo,
                'formattedOrderNo' => 'ORD-' . date('Ymd') . '-' . str_pad((string)$nextNo, 4, '0', STR_PAD_LEFT),
            ],
        ]);
    }

    public function customerQuickCreate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'  => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
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
            'email'     => $request->input('email'),
            'city'      => $request->input('city'),
            'gstin'     => $request->input('gstNo') ?: $request->input('gstin'),
            'address'   => $request->input('address'),
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
        $query = Customer::query()->where('is_active', true);

        if ($request->filled('query') || $request->filled('search')) {
            $s = $request->input('query') ?: $request->input('search');
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%")
                  ->orWhere('code', 'like', "%{$s}%");
            });
        }

        $customers = $query->orderBy('name')->limit(50)->get();

        return response()->json([
            'success' => true,
            'data'    => $customers,
        ]);
    }

    public function stockAvailability(Request $request)
    {
        $storeId   = $request->header('X-Company-Scope-Id', 1);
        $productId = $request->input('productId') ?: $request->input('product_id');

        $stock = Stock::where('store_id', $storeId)
            ->when($productId, fn($q) => $q->where('product_id', $productId))
            ->first();

        $availableQty = $stock ? (float) $stock->quantity : 0;

        return response()->json([
            'success' => true,
            'data'    => [
                'availableQty' => $availableQty,
                'inStock'      => $availableQty > 0,
            ],
        ]);
    }

    public function stockProducts(Request $request)
    {
        $products = Product::with(['brand', 'category', 'variants'])
            ->where('is_active', true)
            ->orderBy('name')
            ->limit(200)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $products,
        ]);
    }
}
