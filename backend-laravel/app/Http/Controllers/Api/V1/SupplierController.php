<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query()->where('is_active', true);
        $hasFilters = false;

        // 1. FULLTEXT / Indexed Search
        if ($request->filled('search')) {
            $hasFilters = true;
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

        // 2. Column filters
        if ($request->filled('column_filters')) {
            $hasFilters = true;
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

        // ?all=true — for dropdowns & export
        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $items = $query->orderBy('name')->limit(2000)->get();
            return response()->json(['success' => true, 'data' => $items, 'total' => $items->count()]);
        }

        // 3. Deferred Join Server-Side Pagination
        $limit  = max(1, $request->integer('limit', 20));
        $page   = max(1, $request->integer('page', 1));
        $offset = ($page - 1) * $limit;

        if (!$hasFilters) {
            $total = Cache::remember('suppliers_total_unfiltered_count', 60, fn() => Supplier::where('is_active', true)->count());
        } else {
            $total = (clone $query)->count();
        }

        $totalPages = max((int) ceil($total / $limit), 1);

        $idSubquery = (clone $query)->select('suppliers.id')->orderBy('suppliers.name')->forPage($page, $limit);
        $ids = $idSubquery->pluck('id')->toArray();

        $items = empty($ids) ? [] : Supplier::whereIn('id', $ids)->orderBy('name')->get();

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
                'per_page'     => $limit,
            ],
        ]);
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
