<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Services\GroupAggregationService;
use App\Services\PaginationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SupplierController extends Controller
{
    public function __construct(
        private readonly PaginationService $paginationService,
        private readonly GroupAggregationService $groupAggregationService,
    ) {}

    private function filteredQuery(Request $request)
    {
        $query = Supplier::query()->where('is_active', true);

        // FULLTEXT / Indexed Search
        if ($request->filled('search')) {
            $s     = trim($request->input('search'));
            $field = $request->input('field');

            if ($field && in_array($field, ['name', 'code', 'gstin', 'phone', 'email', 'company_name'])) {
                $query->where($field, 'like', "%{$s}%");
            } else {
                $cleaned = preg_replace('/[+\-><()~*\"@]+/', ' ', $s);
                $terms = array_filter(explode(' ', trim($cleaned)));

                if (!empty($terms) && strlen($s) >= 3) {
                    $booleanQuery = '+' . implode('* +', $terms) . '*';
                    $query->whereRaw("MATCH(name, code, gstin, phone, email, company_name) AGAINST(? IN BOOLEAN MODE)", [$booleanQuery]);
                } else {
                    $query->where(function ($q) use ($s) {
                        $q->where('name', 'like', "{$s}%")
                          ->orWhere('code', 'like', "{$s}%")
                          ->orWhere('gstin', 'like', "{$s}%")
                          ->orWhere('phone', 'like', "{$s}%")
                          ->orWhere('email', 'like', "{$s}%")
                          ->orWhere('company_name', 'like', "{$s}%");
                    });
                }
            }
        }

        // Column filters
        if ($request->filled('column_filters')) {
            $filters = json_decode($request->input('column_filters'), true) ?? [];
            $allowed = ['code', 'name', 'gstin', 'phone', 'email', 'city', 'is_active'];
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

        return $query;
    }

    public function groupedSummary(Request $request)
    {
        $result = $this->groupAggregationService->summarize($this->filteredQuery($request), 'suppliers', $request);
        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);

        // ?all=true — for dropdowns & export
        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $items = $query->orderBy('name')->limit(2000)->get();
            return response()->json(['success' => true, 'data' => $items, 'total' => $items->count()]);
        }

        // Adaptive Server-Side Pagination
        $result = $this->paginationService->paginate($query, 'suppliers', $request, [
            'default_sort'  => 'name',
            'default_order' => 'asc',
            'tie_breaker'   => 'id',
            'allowed_sorts' => ['id', 'name', 'code', 'gstin', 'phone', 'email', 'city', 'created_at'],
        ]);

        return response()->json($result);
    }

    public function show($id)
    {
        $supplier = Supplier::findOrFail($id);
        return response()->json(['success' => true, 'data' => $supplier]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:suppliers,code',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->all();
        if (empty($data['code'])) {
            $data['code'] = 'SUP_' . strtoupper(substr(uniqid(), -6));
        }

        $supplier = Supplier::create($data);
        Cache::forget('suppliers_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => 'Supplier created successfully',
            'data'    => $supplier,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:suppliers,code,' . $id,
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $supplier->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Supplier updated successfully',
            'data'    => $supplier,
        ]);
    }

    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();
        Cache::forget('suppliers_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => 'Supplier deleted successfully',
        ]);
    }
}
