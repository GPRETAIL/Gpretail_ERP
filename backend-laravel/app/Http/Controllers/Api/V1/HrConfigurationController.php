<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\HrDepartment;
use App\Models\HrDesignation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class HrConfigurationController extends Controller
{
    // Designations
    public function designationsIndex(Request $request)
    {
        $query = HrDesignation::with('department');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
        }

        $items = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data'    => $items,
            'total'   => $items->count(),
        ]);
    }

    public function designationsStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'          => 'required|string|max:255',
            'code'          => 'nullable|string|max:50|unique:hr_designations,code',
            'department_id' => 'nullable|exists:hr_departments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $deptId = $request->input('department_id');
        if (!$deptId) {
            $defaultDept = HrDepartment::firstOrCreate(
                ['code' => 'GENERAL_DEPT'],
                ['name' => 'General Department', 'is_active' => true]
            );
            $deptId = $defaultDept->id;
        }

        $code = $request->input('code') ?: 'DES_' . strtoupper(substr(uniqid(), -6));

        $designation = HrDesignation::create([
            'department_id' => $deptId,
            'name'          => $request->input('name'),
            'code'          => $code,
            'is_active'     => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Designation created successfully',
            'data'    => $designation->load('department'),
        ], 201);
    }

    // Departments / Sections
    public function departmentsIndex(Request $request)
    {
        $query = HrDepartment::with('designations');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
        }

        $items = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data'    => $items,
            'total'   => $items->count(),
        ]);
    }

    public function departmentsStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:hr_departments,code',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $code = $request->input('code') ?: 'DEPT_' . strtoupper(substr(uniqid(), -6));

        $dept = HrDepartment::create([
            'name'        => $request->input('name'),
            'code'        => $code,
            'description' => $request->input('description'),
            'is_active'   => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Department created successfully',
            'data'    => $dept,
        ], 201);
    }

    // Generic /hr-{type} fallback
    public function handleType(Request $request, $type)
    {
        if (str_contains($type, 'designation')) {
            return $request->isMethod('post') ? $this->designationsStore($request) : $this->designationsIndex($request);
        }
        return $request->isMethod('post') ? $this->departmentsStore($request) : $this->departmentsIndex($request);
    }
}
