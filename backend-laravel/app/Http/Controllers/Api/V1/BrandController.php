<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        $query = Brand::query();
        $hasFilters = false;

        // 1. FULLTEXT / Indexed Search
        if ($request->filled('search')) {
            $hasFilters = true;
            $s     = trim($request->input('search'));
            $field = $request->input('field');

            if ($field && in_array($field, ['name', 'code', 'printing_name'])) {
                $query->where($field, 'like', "%{$s}%");
            } else {
                $cleaned = preg_replace('/[+\-><()~*\"@]+/', ' ', $s);
                $terms = array_filter(explode(' ', trim($cleaned)));

                if (!empty($terms) && strlen($s) >= 3) {
                    $booleanQuery = '+' . implode('* +', $terms) . '*';
                    $query->whereRaw("MATCH(name, code) AGAINST(? IN BOOLEAN MODE)", [$booleanQuery]);
                } else {
                    $query->where(function ($q) use ($s) {
                        $q->where('name', 'like', "{$s}%")
                          ->orWhere('code', 'like', "{$s}%")
                          ->orWhere('printing_name', 'like', "{$s}%");
                    });
                }
            }
        }

        // 2. Column-level filters
        if ($request->filled('column_filters')) {
            $hasFilters = true;
            $filters = json_decode($request->input('column_filters'), true) ?? [];
            $allowed = ['code', 'name', 'printing_name', 'brand_type', 'discount_type', 'is_active', 'min_margin', 'max_margin'];
            foreach ($filters as $filter) {
                $col = $filter['field']    ?? null;
                $op  = $filter['operator'] ?? 'contains';
                $val = $filter['value']    ?? '';
                if (!$col || !in_array($col, $allowed)) continue;

                match ($op) {
                    'equals'     => $query->where($col, $val),
                    'not_equals' => $query->where($col, '!=', $val),
                    'starts'     => $query->where($col, 'like', "{$val}%"),
                    'ends'       => $query->where($col, 'like', "%{$val}"),
                    'blank'      => $query->whereNull($col)->orWhere($col, ''),
                    'not_blank'  => $query->whereNotNull($col)->where($col, '!=', ''),
                    default      => $query->where($col, 'like', "%{$val}%"),
                };
            }
        }

        // ?all=true — for dropdowns & export
        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $items = $query->orderBy('name')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        // 3. Deferred Join Server-Side Pagination
        $limit  = max(1, $request->integer('limit', 20));
        $page   = max(1, $request->integer('page', 1));
        $offset = ($page - 1) * $limit;

        if (!$hasFilters) {
            $total = Cache::remember('brands_total_unfiltered_count', 60, fn() => Brand::count());
        } else {
            $total = (clone $query)->count();
        }

        $totalPages = max((int) ceil($total / $limit), 1);

        $idSubquery = (clone $query)->select('brands.id')->orderBy('brands.name')->forPage($page, $limit);
        $ids = $idSubquery->pluck('id')->toArray();

        $items = empty($ids) ? [] : Brand::whereIn('id', $ids)->orderBy('name')->get();

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
        $brand = Brand::findOrFail($id);
        return response()->json(['success' => true, 'data' => $brand]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:brands,code',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $brand = Brand::create($request->all());
        Cache::forget('brands_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => 'Brand created successfully',
            'data'    => $brand,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $brand = Brand::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:brands,code,' . $id,
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $brand->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Brand updated successfully',
            'data'    => $brand,
        ]);
    }

    public function destroy($id)
    {
        $brand = Brand::findOrFail($id);
        $brand->delete();
        Cache::forget('brands_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => 'Brand deleted successfully',
        ]);
    }
}
