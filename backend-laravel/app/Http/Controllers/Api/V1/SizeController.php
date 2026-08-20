<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Size;
use App\Models\SizeGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SizeController extends Controller
{
    private function formatSize($size)
    {
        $arr = $size->toArray();
        $arr['size_name'] = $size->name;
        $arr['sizeName'] = $size->name;
        $arr['measurement'] = $size->measurement ?? '';
        $arr['age_set'] = $size->age_set ?? '';
        $arr['ageSet'] = $size->age_set ?? '';
        $arr['uom'] = $size->uom ?? '';
        $arr['sort_order'] = (int) ($size->sort_order ?? 0);
        $arr['sortOrder'] = (int) ($size->sort_order ?? 0);
        $arr['is_combo_size'] = (bool) ($size->is_combo_size ?? false);
        $arr['isComboSize'] = (bool) ($size->is_combo_size ?? false);
        $arr['is_meter_size'] = (bool) ($size->is_meter_size ?? false);
        $arr['isMeterSize'] = (bool) ($size->is_meter_size ?? false);
        $arr['is_variant'] = (bool) ($size->is_variant ?? false);
        $arr['isVariant'] = (bool) ($size->is_variant ?? false);
        $arr['is_active'] = (bool) ($size->is_active ?? true);
        $arr['company_id'] = $size->company_id ?? 1;
        $arr['created_by'] = $size->created_by ?: 'Superadmin';
        $arr['updated_by'] = $size->updated_by ?? null;
        return $arr;
    }

    private function formatGroup($group)
    {
        $arr = $group->toArray();
        $arr['group_name'] = $group->name;
        $arr['groupName'] = $group->name;
        $arr['enable_size_ratio'] = (bool) ($group->enable_size_ratio ?? false);
        $arr['enableSizeRatio'] = (bool) ($group->enable_size_ratio ?? false);
        $arr['sort_order'] = (int) ($group->sort_order ?? 0);
        $arr['sortOrder'] = (int) ($group->sort_order ?? 0);
        $arr['company_id'] = $group->company_id ?? 1;
        $arr['created_by'] = $group->created_by ?: 'Superadmin';
        $arr['updated_by'] = $group->updated_by ?? null;
        if (isset($group->sizes)) {
            $arr['sizes'] = collect($group->sizes)->map(fn($s) => $this->formatSize($s))->values()->all();
        }
        return $arr;
    }

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
                'data'    => collect($items)->map(fn($s) => $this->formatSize($s)),
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('sort_order')->paginate($limit);

        return response()->json([
            'success'    => true,
            'data'       => collect($paginated->items())->map(fn($s) => $this->formatSize($s)),
            'total'      => $paginated->total(),
            'page'       => $paginated->currentPage(),
            'limit'      => $paginated->perPage(),
            'totalPages' => $paginated->lastPage(),
        ]);
    }

    public function show($id)
    {
        $size = Size::with('sizeGroup')->where('id', $id)->orWhere('code', $id)->first();

        if (!$size) {
            return response()->json([
                'success' => false,
                'message' => 'Size not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->formatSize($size),
        ]);
    }

    public function store(Request $request)
    {
        $name = $request->input('size_name') ?? $request->input('name') ?? $request->input('sizeName');

        if (!$name) {
            return response()->json([
                'success' => false,
                'message' => 'Size name is required',
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

        $code = $request->input('code') ?: strtoupper($name);

        $user = $request->user();
        $createdBy = $request->input('created_by') ?: ($user?->name ?: ($user?->username ?: 'Superadmin'));
        $companyId = $request->input('company_id') ?: ($user?->company_id ?: 1);

        $size = Size::create([
            'size_group_id' => $sizeGroupId,
            'name'          => $name,
            'code'          => $code,
            'sort_order'    => $request->input('sort_order', 0),
            'company_id'    => $companyId,
            'created_by'    => $createdBy,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Size created successfully',
            'data'    => $this->formatSize($size->load('sizeGroup')),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $size = Size::where('id', $id)->orWhere('code', $id)->first();

        if (!$size) {
            return response()->json([
                'success' => false,
                'message' => 'Size not found',
            ], 404);
        }

        $user = $request->user();
        $updatedBy = $request->input('updated_by') ?: ($user?->name ?: ($user?->username ?: 'Superadmin'));

        $data = ['updated_by' => $updatedBy];
        $name = $request->input('size_name') ?? $request->input('name') ?? $request->input('sizeName');
        if ($name !== null) $data['name'] = $name;
        if ($request->has('code')) $data['code'] = $request->input('code');
        if ($request->has('sort_order')) $data['sort_order'] = (int) $request->input('sort_order');
        if ($request->has('size_group_id')) $data['size_group_id'] = $request->input('size_group_id');
        if ($request->has('company_id')) $data['company_id'] = $request->input('company_id');

        $size->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Size updated successfully',
            'data'    => $this->formatSize($size->load('sizeGroup')),
        ]);
    }

    public function destroy($id)
    {
        $size = Size::where('id', $id)->orWhere('code', $id)->first();

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
            'data'    => collect($groups)->map(fn($g) => $this->formatGroup($g)),
            'total'   => $groups->count(),
        ]);
    }

    public function groupsShow($id)
    {
        $group = SizeGroup::with('sizes')->where('id', $id)->orWhere('code', $id)->first();

        if (!$group) {
            return response()->json([
                'success' => false,
                'message' => 'Size group not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->formatGroup($group),
        ]);
    }

    public function groupsStore(Request $request)
    {
        $name = $request->input('group_name') ?? $request->input('name') ?? $request->input('groupName');

        if (!$name) {
            return response()->json([
                'success' => false,
                'message' => 'Group name is required',
            ], 422);
        }

        $user = $request->user();
        $createdBy = $request->input('created_by') ?: ($user?->name ?: ($user?->username ?: 'Superadmin'));
        $companyId = $request->input('company_id') ?: ($user?->company_id ?: 1);
        $code = $request->input('code') ?: 'SG_' . strtoupper(substr(uniqid(), -6));

        $group = SizeGroup::create([
            'name'        => $name,
            'code'        => $code,
            'description' => $request->input('description'),
            'company_id'  => $companyId,
            'created_by'  => $createdBy,
            'is_active'   => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Size group created successfully',
            'data'    => $this->formatGroup($group),
        ], 201);
    }

    public function groupsUpdate(Request $request, $id)
    {
        $group = SizeGroup::where('id', $id)->orWhere('code', $id)->first();

        if (!$group) {
            return response()->json([
                'success' => false,
                'message' => 'Size group not found',
            ], 404);
        }

        $user = $request->user();
        $updatedBy = $request->input('updated_by') ?: ($user?->name ?: ($user?->username ?: 'Superadmin'));

        $data = ['updated_by' => $updatedBy];
        $name = $request->input('group_name') ?? $request->input('name') ?? $request->input('groupName');
        if ($name !== null) $data['name'] = $name;
        if ($request->has('code')) $data['code'] = $request->input('code');
        if ($request->has('description')) $data['description'] = $request->input('description');
        if ($request->has('is_active')) $data['is_active'] = $request->boolean('is_active');
        if ($request->has('company_id')) $data['company_id'] = $request->input('company_id');

        $group->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Size group updated successfully',
            'data'    => $this->formatGroup($group),
        ]);
    }

    public function groupsDestroy($id)
    {
        $group = SizeGroup::where('id', $id)->orWhere('code', $id)->first();

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
