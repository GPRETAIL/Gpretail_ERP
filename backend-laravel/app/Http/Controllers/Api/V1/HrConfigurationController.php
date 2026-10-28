<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\HrDepartment;
use App\Models\HrDesignation;
use App\Services\MasterFormData;
use App\Services\PaginationService;
use App\Services\StoreQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HrConfigurationController extends Controller
{
    public function __construct(private readonly PaginationService $paginationService) {}

    // Designations
    public function designationsIndex(Request $request)
    {
        $query = HrDesignation::with(['department', 'role:id,name']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"));
        }

        if ($request->boolean('paginate')) {
            return response()->json($this->paginationService->paginate($query, 'hr_configurations', $request, [
                'default_sort' => 'name', 'default_order' => 'asc', 'allowed_sorts' => ['id', 'name', 'code'],
            ]));
        }

        $items = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $items,
            'total' => $items->count(),
        ]);
    }

    public function designationsStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => ['nullable', 'string', 'max:50', Rule::unique('hr_designations', 'code')->where('store_id', $request->attributes->get('store_context_id'))],
            'department_id' => 'nullable|exists:hr_departments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $deptId = $request->input('department_id');
        if (! $deptId) {
            $defaultDept = HrDepartment::firstOrCreate(
                ['code' => 'GENERAL_DEPT'],
                ['name' => 'General Department', 'is_active' => true]
            );
            $deptId = $defaultDept->id;
        }

        $code = $request->input('code') ?: 'DES_'.strtoupper(substr(uniqid(), -6));

        $data = $this->designationData($request, new HrDesignation);
        $data['department_id'] = $deptId;
        $data['code'] = $code;
        $designation = HrDesignation::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Designation created successfully',
            'data' => $designation->load(['department', 'role:id,name']),
        ], 201);
    }

    public function designationsShow($id)
    {
        $designation = HrDesignation::with(['department', 'role:id,name'])->findOrFail($id);

        return response()->json(['success' => true, 'data' => $designation]);
    }

    public function designationsUpdate(Request $request, $id)
    {
        $designation = HrDesignation::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('hr_designations', 'code')->where('store_id', $request->attributes->get('store_context_id'))->ignore($designation)],
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $designation->update($this->designationData($request, $designation));

        return response()->json([
            'success' => true,
            'message' => 'Designation updated successfully',
            'data' => $designation->load(['department', 'role:id,name']),
        ]);
    }

    public function designationsDestroy($id)
    {
        $designation = HrDesignation::findOrFail($id);
        $designation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Designation deleted successfully',
        ]);
    }

    // Departments / Sections
    public function departmentsIndex(Request $request)
    {
        $query = $this->departmentQuery($request);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"));
        }

        if ($request->boolean('paginate')) {
            $result = $this->paginationService->paginate($query, 'hr_configurations', $request, [
                'default_sort' => 'name', 'default_order' => 'asc', 'allowed_sorts' => ['id', 'name', 'code'],
            ]);
            $result['data'] = collect($result['data'])->map($this->present(...));

            return response()->json($result);
        }

        $items = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $items->map($this->present(...)),
            'total' => $items->count(),
        ]);
    }

    public function departmentsShow($id)
    {
        $dept = $this->departmentQuery(request())->findOrFail($id);

        return response()->json(['success' => true, 'data' => $this->present($dept)]);
    }

    public function departmentsStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => ['nullable', 'string', 'max:50', Rule::unique('hr_departments', 'code')->where('store_id', $request->attributes->get('store_context_id'))],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $code = $request->input('code') ?: 'DEPT_'.strtoupper(substr(uniqid(), -6));

        $data = $this->departmentData($request, new HrDepartment);
        $data['code'] = $code;
        $data['configuration_type'] = $this->configurationType($request);
        $dept = HrDepartment::create($data)->load('location:id,value,config_value');

        return response()->json([
            'success' => true,
            'message' => 'Department created successfully',
            'data' => $this->present($dept),
        ], 201);
    }

    public function departmentsUpdate(Request $request, $id)
    {
        $dept = $this->departmentQuery($request)->findOrFail($id);
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('hr_departments', 'code')->where('store_id', $request->attributes->get('store_context_id'))->ignore($dept)],
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $dept->update($this->departmentData($request, $dept));
        $dept->load('location:id,value,config_value');

        return response()->json([
            'success' => true,
            'message' => 'Department updated successfully',
            'data' => $this->present($dept),
        ]);
    }

    public function departmentsDestroy($id)
    {
        $dept = $this->departmentQuery(request())->findOrFail($id);
        $dept->delete();

        return response()->json([
            'success' => true,
            'message' => 'Department deleted successfully',
        ]);
    }

    private function configurationType(Request $request): string
    {
        preg_match('~(?:^|/)hr-([^/]+)~', $request->path(), $match);

        return match ($match[1] ?? 'departments') {
            'departments' => 'department', 'sections' => 'section', 'roles' => 'role',
            'floors' => 'floor', 'salary-structures' => 'salary_structure', 'working-hours' => 'working_hour',
            default => abort(404),
        };
    }

    private function departmentQuery(Request $request)
    {
        return HrDepartment::with(['designations', 'location:id,value,config_value'])
            ->where(fn ($q) => $q->where('configuration_type', $this->configurationType($request))->orWhereNull('configuration_type'));
    }

    private function designationData(Request $request, HrDesignation $designation): array
    {
        $data = MasterFormData::prepare($request, $designation);
        $roleId = $data['master_details']['role_id'] ?? null;
        if ($roleId && ! HrDepartment::where('id', $roleId)
            ->where(fn ($q) => $q->where('configuration_type', 'role')->orWhereNull('configuration_type'))->exists()) {
            throw ValidationException::withMessages(['role_id' => 'Select a valid HR role from this store.']);
        }

        return $data;
    }

    private function departmentData(Request $request, HrDepartment $department): array
    {
        $data = MasterFormData::prepare($request, $department);
        $locationId = $data['master_details']['location_id'] ?? null;
        if ($locationId && ! StoreQuery::table('system_configurations')->where('id', $locationId)
            ->where(fn ($q) => $q->whereIn('group', ['LOCATION', 'location'])->orWhereIn('group_name', ['LOCATION', 'location']))->exists()) {
            throw ValidationException::withMessages(['location_id' => 'Select a valid location from this store.']);
        }

        return $data;
    }

    private function present($record): array
    {
        $data = $record->toArray();
        if ($record->relationLoaded('location') && $record->location) {
            $data['location'] = ['id' => $record->location->id, 'name' => $record->location->value ?? $record->location->config_value];
            $data['location_name'] = $data['location']['name'];
        }

        return $data;
    }

    // Generic /hr-{type} fallback
    public function handleType(Request $request, $type, $id = null)
    {
        if (str_contains($type, 'designation')) {
            if ($id) {
                if ($request->isMethod('delete')) {
                    return $this->designationsDestroy($id);
                }
                if ($request->isMethod('put') || $request->isMethod('patch')) {
                    return $this->designationsUpdate($request, $id);
                }

                return $this->designationsShow($id);
            }

            return $request->isMethod('post') ? $this->designationsStore($request) : $this->designationsIndex($request);
        }

        if ($id) {
            if ($request->isMethod('delete')) {
                return $this->departmentsDestroy($id);
            }
            if ($request->isMethod('put') || $request->isMethod('patch')) {
                return $this->departmentsUpdate($request, $id);
            }

            return $this->departmentsShow($id);
        }

        return $request->isMethod('post') ? $this->departmentsStore($request) : $this->departmentsIndex($request);
    }
}
