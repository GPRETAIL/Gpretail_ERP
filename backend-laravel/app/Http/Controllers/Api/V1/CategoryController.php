<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::with('parent');

        // Search (global)
        if ($request->filled('search')) {
            $s = $request->input('search');
            $field = $request->input('field');
            $query->where(function ($q) use ($s, $field) {
                if ($field && $field !== 'all') {
                    $q->where($field, 'like', "%{$s}%");
                } else {
                    $q->where('name', 'like', "%{$s}%")
                      ->orWhere('code', 'like', "%{$s}%")
                      ->orWhere('description', 'like', "%{$s}%");
                }
            });
        }

        // Column-level filters (JSON array: [{field, operator, value}])
        if ($request->filled('column_filters')) {
            $filters = json_decode($request->input('column_filters'), true) ?? [];
            foreach ($filters as $filter) {
                $col   = $filter['field']    ?? null;
                $op    = $filter['operator'] ?? 'contains';
                $val   = $filter['value']    ?? '';
                if (!$col) continue;

                // Whitelist to prevent SQL injection
                $allowed = ['code', 'name', 'description', 'is_active', 'parent_id'];
                if (!in_array($col, $allowed)) continue;

                match ($op) {
                    'equals'     => $query->where($col, $val),
                    'not_equals' => $query->where($col, '!=', $val),
                    'starts'     => $query->where($col, 'like', "{$val}%"),
                    'ends'       => $query->where($col, 'like', "%{$val}"),
                    'blank'      => $query->whereNull($col)->orWhere($col, ''),
                    'not_blank'  => $query->whereNotNull($col)->where($col, '!=', ''),
                    default      => $query->where($col, 'like', "%{$val}%"), // 'contains'
                };
            }
        }

        // ?all=true — return everything (for dropdowns & export), capped for safety
        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $items = $query->orderBy('name')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        // Server-side pagination
        $limit     = max(1, $request->integer('limit', 20));
        $page      = max(1, $request->integer('page', 1));
        $paginated = $query->orderBy('name')->paginate($limit, ['*'], 'page', $page);

        return response()->json([
            'success'    => true,
            'data'       => $paginated->items(),
            'total'      => $paginated->total(),
            'page'       => $paginated->currentPage(),
            'limit'      => $paginated->perPage(),
            'totalPages' => $paginated->lastPage(),
        ]);
    }

    public function show($id)
    {
        $category = Category::with(['parent', 'children'])->findOrFail($id);
        return response()->json([
            'success' => true,
            'data'    => $category,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:categories,code',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $category = Category::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'data'    => $category,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:categories,code,' . $id,
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $category->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data'    => $category,
        ]);
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);
        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully',
        ]);
    }
}
