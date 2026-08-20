<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
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
        $query = Customer::query()->where('is_active', true);
        $hasFilters = false;

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
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->all();
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

        $customer->update($request->all());

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
}
