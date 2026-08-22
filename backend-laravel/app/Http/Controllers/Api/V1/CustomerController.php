<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerOrder;
use App\Models\LoyaltyTransaction;
use App\Models\PosReturn;
use App\Models\PosSale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CustomerController extends Controller
{
    public function dashboardSummary(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'totalCustomers'     => Cache::remember('summary_cust_count', 60, fn() => Customer::count()),
                'activeCustomers'    => Cache::remember('summary_cust_active_count', 60, fn() => Customer::where('is_active', true)->count()),
                'newCustomersMonth'  => Customer::whereMonth('created_at', now()->month)->count(),
                'totalLoyaltyPoints' => Customer::sum('loyalty_points') ?? 0,
                'totalCreditBalance' => Customer::sum('current_balance') ?? 0,
            ],
        ]);
    }

    public function index(Request $request)
    {
        $query = Customer::query();
        $hasFilters = $request->boolean('includeInactive');
        if (!$hasFilters) {
            $query->where('is_active', true);
        }

        // 1. FULLTEXT / Indexed Search
        if ($request->filled('search')) {
            $hasFilters = true;
            $s     = trim($request->input('search'));
            $field = $request->input('field');

            if ($field && in_array($field, ['name', 'code', 'phone', 'email'])) {
                $query->where($field, 'like', "%{$s}%");
            } else {
                $cleaned = preg_replace('/[+\-><()~*\"@]+/', ' ', $s);
                $terms = array_filter(explode(' ', trim($cleaned)));

                if (!empty($terms) && strlen($s) >= 3) {
                    $booleanQuery = '+' . implode('* +', $terms) . '*';
                    $query->whereRaw("MATCH(name, code, phone, email) AGAINST(? IN BOOLEAN MODE)", [$booleanQuery]);
                } else {
                    $query->where(function ($q) use ($s) {
                        $q->where('name', 'like', "{$s}%")
                          ->orWhere('phone', 'like', "{$s}%")
                          ->orWhere('code', 'like', "{$s}%")
                          ->orWhere('email', 'like', "{$s}%");
                    });
                }
            }
        }

        // 2. Column filters
        if ($request->filled('column_filters')) {
            $hasFilters = true;
            $filters = json_decode($request->input('column_filters'), true) ?? [];
            $allowed = ['code', 'name', 'phone', 'email', 'is_active'];
            foreach ($filters as $filter) {
                $col = $filter['field'] ?? null;
                $op  = $filter['operator'] ?? 'contains';
                $val = $filter['value'] ?? '';
                if (!$col || !in_array($col, $allowed)) continue;
                match ($op) {
                    'equals'    => $query->where($col, $val),
                    'not_equals'=> $query->where($col, '!=', $val),
                    'starts'    => $query->where($col, 'like', "{$val}%"),
                    'ends'      => $query->where($col, 'like', "%{$val}"),
                    'blank'     => $query->whereNull($col)->orWhere($col, ''),
                    'not_blank' => $query->whereNotNull($col)->where($col, '!=', ''),
                    default     => $query->where($col, 'like', "%{$val}%"),
                };
            }
        }

        // ?all=true — for dropdowns & export
        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $items = $query->orderBy('name')->limit(2000)->get();
            return response()->json(['success' => true, 'data' => $items, 'total' => $items->count()]);
        }

        // 3. Deferred Join Server-Side Pagination
        $limit  = max(1, (int) ($request->input('limit') ?? $request->input('per_page') ?? 20));
        $page   = max(1, $request->integer('page', 1));
        $offset = ($page - 1) * $limit;

        if (!$hasFilters) {
            $total = Cache::remember('customers_total_unfiltered_count', 60, fn() => Customer::where('is_active', true)->count());
        } else {
            $total = (clone $query)->count();
        }

        $totalPages = max((int) ceil($total / $limit), 1);

        $idSubquery = (clone $query)->select('customers.id')->orderBy('customers.name')->forPage($page, $limit);
        $ids = $idSubquery->pluck('id')->toArray();

        $items = empty($ids) ? [] : Customer::whereIn('id', $ids)->orderBy('name')->get();

        return response()->json([
            'success'    => true,
            'data'       => $items,
            'total'      => $total,
            'page'       => $page,
            'limit'      => $limit,
            'totalPages' => $totalPages,
            'pagination' => [
                'total'        => $total,
                'current_page' => $page,
                'last_page'    => $totalPages,
            ],
        ]);
    }

    public function show($id)
    {
        $customer = Customer::with(['orders', 'loyaltyTransactions'])->findOrFail($id);
        return response()->json(['success' => true, 'data' => $customer]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'  => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'mobileNo' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $this->mapCustomerPayload($request);
        if (empty($data['code'])) {
            $data['code'] = 'CUST_' . strtoupper(substr(uniqid(), -6));
        }

        $customer = Customer::create($data);
        Cache::forget('customers_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => 'Customer created successfully',
            'data'    => $customer,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);
        $customer->update($this->mapCustomerPayload($request));

        return response()->json([
            'success' => true,
            'message' => 'Customer updated successfully',
            'data'    => $customer,
        ]);
    }

    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();
        Cache::forget('customers_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => 'Customer deleted successfully',
        ]);
    }

    /**
     * Maps the real CrmCustomerForm.jsx camelCase payload onto the
     * customers table's snake_case columns. Only keys the client actually
     * sent are included, so update() never blanks out a field the form
     * simply didn't touch (important for the boolean flags in particular -
     * $request->boolean() on a missing key returns false, which would
     * otherwise silently flip e.g. "married" back to false on every
     * partial save).
     */
    private function mapCustomerPayload(Request $request): array
    {
        $data = array_filter([
            'name'                 => $request->input('name'),
            'code'                 => $request->input('code'),
            'phone'                => $request->input('mobileNo') ?? $request->input('phone'),
            'email'                => $request->input('emailId') ?? $request->input('email'),
            'address'              => $request->input('address'),
            'city'                 => $request->input('cityId') ?? $request->input('city'),
            'state'                => $request->input('state'),
            'pincode'              => $request->input('pinCode') ?? $request->input('pincode'),
            'gstin'                => $request->input('gstNo') ?? $request->input('gstin'),
            'credit_limit'         => $request->input('creditLimit') ?? $request->input('credit_limit'),
            'customer_type'        => $request->input('customerType'),
            'customer_category_id' => $request->input('customerCategoryId'),
            'billing_name'         => $request->input('billingName'),
            'gender'               => $request->input('gender'),
            'date_of_birth'        => $request->input('dateOfBirth'),
            'marriage_date'        => $request->input('marriageDate'),
            'kids_boy'             => $request->input('kidsBoy'),
            'kids_girl'            => $request->input('kidsGirl'),
            'loyalty_card_number'  => $request->input('loyaltyCardNumber'),
            'supply_type'          => $request->input('supplyType'),
            'tan_pan'              => $request->input('tanPan'),
            'credit_days'          => $request->input('creditDays'),
            'credit_amount'        => $request->input('creditAmount'),
            'district_id'          => $request->input('districtId'),
            'state_id'             => $request->input('stateId'),
            'country_id'           => $request->input('countryId'),
            'registering_at_id'    => $request->input('registeringAtId'),
            'approved_by_id'       => $request->input('approvedById'),
            'bank_account_name'    => $request->input('bankAccountName'),
            'account_no_ifsc'      => $request->input('accountNoIfsc'),
        ], fn ($v) => $v !== null);

        foreach ([
            'married'         => 'married',
            'disableLoyalty'  => 'disable_loyalty',
            'supportCredit'   => 'support_credit',
        ] as $inputKey => $column) {
            if ($request->has($inputKey)) {
                $data[$column] = $request->boolean($inputKey);
            }
        }

        if ($request->has('active')) {
            $data['is_active'] = $request->boolean('active');
        } elseif ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }

        return $data;
    }

    public function bulk(Request $request)
    {
        // UploadImportButton posts the row array as the raw JSON body
        // (not wrapped in {rows: [...]}) - $request->input('rows') only
        // ever finds a "rows" key, so it's always empty for that shape.
        $rows = $request->input('rows') ?? $request->all();

        $created = DB::transaction(function () use ($rows) {
            $count = 0;
            foreach ($rows as $row) {
                $name = $row['name'] ?? null;
                if (!$name) {
                    continue;
                }

                Customer::create(array_filter([
                    'name'      => $name,
                    'code'      => $row['code'] ?? ('CUST_' . strtoupper(substr(uniqid(), -6))),
                    'phone'     => $row['mobile_no'] ?? $row['mobileNo'] ?? $row['phone'] ?? null,
                    'email'     => $row['email_id'] ?? $row['emailId'] ?? $row['email'] ?? null,
                    'address'   => $row['address'] ?? null,
                    'city'      => $row['city_id'] ?? $row['cityId'] ?? $row['city'] ?? null,
                    'state'     => $row['state'] ?? null,
                    'gstin'     => $row['gst_no'] ?? $row['gstNo'] ?? $row['gstin'] ?? null,
                    'customer_type' => $row['customer_type'] ?? null,
                    'billing_name'  => $row['billing_name'] ?? null,
                    'pincode'       => $row['pin_code'] ?? null,
                    'is_active' => true,
                ], fn ($v) => $v !== null));
                $count++;
            }
            return $count;
        });

        Cache::forget('customers_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => "{$created} customer(s) imported successfully",
            'data'    => ['imported' => $created],
        ], 201);
    }

    /**
     * Customer 360: replicates CI4's customerview.php rollup - order
     * history/highlights sourced from PosSale + CustomerOrder, loyalty
     * figures from LoyaltyTransaction + the running customers.loyalty_points
     * balance.
     */
    public function profile(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $sales = PosSale::where('customer_id', $id)->orderByDesc('sale_date');
        $ordersCount = $sales->count();
        $lifetimeSpend = (float) (clone $sales)->sum('grand_total');
        $averageAmount = $ordersCount > 0 ? $lifetimeSpend / $ordersCount : 0;
        $lastVisit = (clone $sales)->value('sale_date');

        $visitDates = (clone $sales)->pluck('sale_date')->map(fn ($d) => \Carbon\Carbon::parse($d))->sortDesc()->values();
        $averageVisitGapDays = null;
        if ($visitDates->count() > 1) {
            $gaps = [];
            for ($i = 0; $i < $visitDates->count() - 1; $i++) {
                $gaps[] = $visitDates[$i]->diffInDays($visitDates[$i + 1]);
            }
            $averageVisitGapDays = round(array_sum($gaps) / count($gaps), 1);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);
        $windowMonths = (int) (\App\Models\Store::where('id', $storeId)->value('loyalty_redeem_window_months') ?? 12);
        $availablePoints = (int) LoyaltyTransaction::where('customer_id', $id)
            ->where('type', 'EARN')
            ->where('created_at', '>=', now()->subMonths($windowMonths))
            ->sum('points');
        $redeemedPoints = (int) LoyaltyTransaction::where('customer_id', $id)
            ->where('type', 'REDEEM')
            ->sum('points');
        $redeemedCount = LoyaltyTransaction::where('customer_id', $id)->where('type', 'REDEEM')->count();
        $lastRedemption = LoyaltyTransaction::where('customer_id', $id)->where('type', 'REDEEM')
            ->orderByDesc('created_at')->value('created_at');

        $orderHistory = PosSale::where('customer_id', $id)
            ->with('items.product')
            ->orderByDesc('sale_date')
            ->limit(50)
            ->get(['id', 'invoice_no', 'sale_date', 'total_items', 'subtotal', 'discount_amount', 'tax_amount', 'grand_total', 'status', 'payment_mode']);

        $customerOrders = CustomerOrder::where('customer_id', $id)
            ->orderByDesc('order_date')
            ->limit(50)
            ->get(['id', 'order_no', 'order_date', 'total_amount', 'status']);

        $returns = PosReturn::where('customer_id', $id)
            ->orderByDesc('return_date')
            ->limit(50)
            ->get(['id', 'return_no', 'return_date', 'total_refund', 'status']);

        $loyaltyTransactions = LoyaltyTransaction::where('customer_id', $id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'customer' => $customer,
                'highlights' => [
                    'ordersCount'         => $ordersCount,
                    'averageAmount'       => round($averageAmount, 2),
                    'lifetimeSpend'       => round($lifetimeSpend, 2),
                    'lastVisit'           => $lastVisit,
                    'averageVisitGapDays' => $averageVisitGapDays,
                ],
                'loyalty' => [
                    'availablePoints'  => $availablePoints,
                    'lifetimePoints'   => (int) $customer->loyalty_points,
                    'redeemedPoints'   => $redeemedPoints,
                    'redemptionCount'  => $redeemedCount,
                    'lastRedemption'   => $lastRedemption,
                ],
                'orderHistory'    => $orderHistory,
                'customerOrders'  => $customerOrders,
                'returns'         => $returns,
                'loyaltyTransactions' => $loyaltyTransactions,
            ],
        ]);
    }
}
