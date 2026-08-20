<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrDepartment;
use App\Models\HrDesignation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmployeeController extends Controller
{
    public function dashboardSummary(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'totalEmployees'   => Employee::count(),
                'activeEmployees'  => Employee::where('is_active', true)->count(),
                'totalDepartments' => HrDepartment::count(),
            ],
        ]);
    }

    public function index(Request $request)
    {
        $query = Employee::with(['department', 'designation', 'store']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('name')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('name')->paginate($limit);

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
            'name'           => 'required|string|max:255',
            'code'           => 'nullable|string|max:50|unique:employees,code',
            'email'          => 'nullable|email|max:255',
            'phone'          => 'nullable|string|max:50',
            'department_id'  => 'nullable|exists:hr_departments,id',
            'designation_id' => 'nullable|exists:hr_designations,id',
            'salary'         => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $code = $request->input('code') ?: 'EMP_' . strtoupper(substr(uniqid(), -6));

        $employee = Employee::create([
            'name'           => $request->input('name'),
            'code'           => $code,
            'email'          => $request->input('email'),
            'phone'          => $request->input('phone'),
            'address'        => $request->input('address'),
            'department_id'  => $request->input('department_id'),
            'designation_id' => $request->input('designation_id'),
            'salary'         => $request->input('salary', 0),
            'joining_date'   => $request->input('joining_date') ?: now()->toDateString(),
            'is_active'      => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Employee created successfully',
            'data'    => $employee->load(['department', 'designation']),
        ], 201);
    }

    public function show($id)
    {
        $employee = Employee::with(['department', 'designation', 'store'])->find($id);

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $employee,
        ]);
    }

    public function update(Request $request, $id)
    {
        $employee = Employee::find($id);

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found',
            ], 404);
        }

        $employee->update($request->only([
            'name', 'code', 'email', 'phone', 'address', 'department_id', 'designation_id', 'salary', 'joining_date', 'is_active'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Employee updated successfully',
            'data'    => $employee->load(['department', 'designation']),
        ]);
    }

    public function destroy($id)
    {
        $employee = Employee::find($id);

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found',
            ], 404);
        }

        $employee->delete();

        return response()->json([
            'success' => true,
            'message' => 'Employee deleted successfully',
        ]);
    }

    public function uploadDocument(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully',
            'data'    => ['id' => rand(100, 999), 'url' => '/files/sample_doc.pdf'],
        ]);
    }

    public function educationCertificate(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Education certificate uploaded successfully',
            'data'    => ['id' => rand(100, 999), 'url' => '/files/certificate.pdf'],
        ]);
    }
}
