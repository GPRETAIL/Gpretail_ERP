<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Services\GroupAggregationService;
use App\Services\PaginationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BrandController extends Controller
{
    public function __construct(
        private readonly PaginationService $paginationService,
        private readonly GroupAggregationService $groupAggregationService,
    ) {}

    private function filteredQuery(Request $request)
    {
        $query = Brand::query();

        // FULLTEXT / Indexed Search
        if ($request->filled('search')) {
            $s     = trim($request->input('search'));
            $field = $request->input('field');

            // 'printing_name' was allow-listed here and referenced below, but brands has no such
            // column (Schema::getColumnListing('brands') -- only id/name/code/logo/description/
            // is_active/timestamps exist) -- any search hitting that branch threw a 500. Dropped
            // rather than migrated in: nothing else in this controller/model backs that field.
            if ($field && in_array($field, ['name', 'code'])) {
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
                          ->orWhere('code', 'like', "{$s}%");
                    });
                }
            }
        }

        // Column-level filters
        if ($request->filled('column_filters')) {
            $filters = json_decode($request->input('column_filters'), true) ?? [];
            // printing_name/brand_type/discount_type/min_margin/max_margin were allow-listed here
            // (and in allowed_sorts below) but brands has no such columns (Schema::getColumnListing
            // confirms only id/name/code/logo/description/is_active/timestamps) -- same class of bug
            // already fixed for the search path above, just missed here. Any filter/sort against one
            // of those threw a 500.
            $allowed = ['code', 'name', 'is_active'];
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

        return $query;
    }

    public function groupedSummary(Request $request)
    {
        $result = $this->groupAggregationService->summarize($this->filteredQuery($request), 'brands', $request);
        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);

        // ?all=true — for dropdowns & export
        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $items = $query->orderBy('name')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        // Adaptive Server-Side Pagination
        $result = $this->paginationService->paginate($query, 'brands', $request, [
            'default_sort'  => 'name',
            'default_order' => 'asc',
            'tie_breaker'   => 'id',
            'allowed_sorts' => ['id', 'name', 'code', 'created_at'],
        ]);

        return response()->json($result);
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
