<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TaxController extends Controller
{
    public function index(Request $request)
    {
        $query = Tax::with('slabs')->where('is_active', true);

        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('code', 'like', "%{$s}%");
            });
        }

        // ?all=true — for dropdowns (always return all active taxes), capped for safety.
        // Previously also triggered whenever `page` was simply absent, which meant any
        // plain call (the default, before pagination is deliberately requested) silently
        // returned everything unbounded instead of paginating like every other master list.
        if ($request->boolean('all')) {
            $items = $query->orderBy('name')->limit(2000)->get();
            return response()->json(['success' => true, 'data' => $items, 'total' => $items->count()]);
        }

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
        $tax = Tax::with('slabs')->findOrFail($id);
        return response()->json(['success' => true, 'data' => $tax]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:taxes,code',
            'rate' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $tax = Tax::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Tax created successfully',
            'data'    => $tax,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $tax = Tax::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:taxes,code,' . $id,
            'rate' => 'sometimes|required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $tax->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Tax updated successfully',
            'data'    => $tax,
        ]);
    }

    public function destroy($id)
    {
        $tax = Tax::findOrFail($id);
        $tax->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tax deleted successfully',
        ]);
    }
}
