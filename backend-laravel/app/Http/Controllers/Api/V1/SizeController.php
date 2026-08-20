<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Size;
use App\Models\SizeGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SizeController extends Controller
{
    // Sizes list
    public function index(Request $request)
    {
        $query = Size::with('sizeGroup');

        if ($request->filled('size_group_id')) {
            $query->where('size_group_id', $request->input('size_group_id'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('sort_order')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('sort_order')->paginate($limit);

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
            'size_group_id' => 'nullable|exists:size_groups,id',
            'name'          => 'required|string|max:100',
            'code'          => 'nullable|string|max:50',
            'sort_order'    => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $sizeGroupId = $request->input('size_group_id');
        if (!$sizeGroupId) {
            $defaultGroup = SizeGroup::firstOrCreate(
                ['code' => 'STD_SIZES'],
                ['name' => 'Standard Sizes', 'is_active' => true]
            );
            $sizeGroupId = $defaultGroup->id;
        }

        $size = Size::create([
            'size_group_id' => $sizeGroupId,
            'name'          => $request->input('name'),
            'code'          => $request->input('code') ?: strtoupper($request->input('name')),
            'sort_order'    => $request->input('sort_order', 0),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Size created successfully',
            'data'    => $size->load('sizeGroup'),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $size = Size::find($id);

        if (!$size) {
            return response()->json([
                'success' => false,
                'message' => 'Size not found',
            ], 404);
        }

        $size->update($request->only(['size_group_id', 'name', 'code', 'sort_order']));

        return response()->json([
            'success' => true,
            'message' => 'Size updated successfully',
            'data'    => $size->load('sizeGroup'),
        ]);
    }

    public function destroy($id)
    {
        $size = Size::find($id);

        if (!$size) {
            return response()->json([
                'success' => false,
                'message' => 'Size not found',
            ], 404);
        }

        $size->delete();

        return response()->json([
            'success' => true,
            'message' => 'Size deleted successfully',
        ]);
    }

    // Size Groups API
    public function groupsIndex(Request $request)
    {
        $query = SizeGroup::with('sizes');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
        }

        $groups = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data'    => $groups,
            'total'   => $groups->count(),
        ]);
    }

    public function groupsStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:size_groups,code',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $code = $request->input('code') ?: 'SG_' . strtoupper(substr(uniqid(), -6));

        $group = SizeGroup::create([
            'name'        => $request->input('name'),
            'code'        => $code,
            'description' => $request->input('description'),
            'is_active'   => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Size group created successfully',
            'data'    => $group,
        ], 201);
    }

    public function groupsUpdate(Request $request, $id)
    {
        $group = SizeGroup::find($id);

        if (!$group) {
            return response()->json([
                'success' => false,
                'message' => 'Size group not found',
            ], 404);
        }

        $group->update($request->only(['name', 'code', 'description', 'is_active']));

        return response()->json([
            'success' => true,
            'message' => 'Size group updated successfully',
            'data'    => $group,
        ]);
    }

    public function groupsDestroy($id)
    {
        $group = SizeGroup::find($id);

        if (!$group) {
            return response()->json([
                'success' => false,
                'message' => 'Size group not found',
            ], 404);
        }

        $group->delete();

        return response()->json([
            'success' => true,
            'message' => 'Size group deleted successfully',
        ]);
    }
}
