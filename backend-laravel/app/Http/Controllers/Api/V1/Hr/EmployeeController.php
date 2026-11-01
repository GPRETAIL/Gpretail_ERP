<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Concerns\ImportsMasterRows;
use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrDepartment;
use App\Support\GroupAggregationService;
use App\Services\Forms\MasterFormData;
use App\Services\Tenancy\BusinessPermissions;
use App\Support\PaginationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    use ImportsMasterRows;

    /** The ID-proof uploads on the employee form, kept in master_details as private-disk paths. */
    private const DOCUMENT_FIELDS = ['upload_id', 'upload_photo', 'upload_aadhar', 'upload_bank_book', 'upload_signature'];

    public function __construct(
        private readonly PaginationService $paginationService,
        private readonly GroupAggregationService $groupAggregationService,
    ) {}

    public function dashboardSummary(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'totalEmployees' => Employee::count(),
                'activeEmployees' => Employee::where('is_active', true)->count(),
                'totalDepartments' => HrDepartment::count(),
            ],
        ]);
    }

    private function filteredQuery(Request $request)
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

        if ($request->filled('column_filters')) {
            $filters = json_decode($request->input('column_filters'), true) ?? [];
            $allowed = ['code', 'name', 'phone', 'email', 'is_active', 'department_id'];
            foreach ($filters as $filter) {
                $col = $filter['field'] ?? null;
                $op = $filter['operator'] ?? 'contains';
                $val = $filter['value'] ?? '';
                if (! $col || ! in_array($col, $allowed)) {
                    continue;
                }
                match ($op) {
                    'equals' => $query->where($col, $val),
                    'not_equals' => $query->where($col, '!=', $val),
                    'starts' => $query->where($col, 'like', "{$val}%"),
                    'ends' => $query->where($col, 'like', "%{$val}"),
                    'blank' => $query->where(fn ($q) => $q->whereNull($col)->orWhere($col, '')),
                    'not_blank' => $query->whereNotNull($col)->where($col, '!=', ''),
                    default => $query->where($col, 'like', "%{$val}%"),
                };
            }
        }

        return $query;
    }

    public function groupedSummary(Request $request)
    {
        $result = $this->groupAggregationService->summarize($this->filteredQuery($request), 'employees', $request);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    /** Counter screens pick employees from dropdowns; ID numbers, bank details, salary and documents are HR data. */
    private function seesPersonnelRecords(Request $request): bool
    {
        $user = $request->user();

        // Explicit grants reach here only after MobileAccess allowed this page; otherwise the role decides.
        return $user->module_permissions !== null || $user->page_permissions !== null
            || app(BusinessPermissions::class)->allows($user, 'hr.view');
    }

    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);
        if (! $this->seesPersonnelRecords($request)) {
            $query->select(['employees.id', 'employees.store_id', 'employees.name', 'employees.code', 'employees.department_id', 'employees.designation_id', 'employees.is_active']);
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('name')->limit(2000)->get();

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $items->count(),
            ]);
        }

        $result = $this->paginationService->paginate($query, 'employees', $request, [
            'default_sort' => 'name',
            'default_order' => 'asc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'name', 'code', 'phone', 'email', 'created_at'],
        ]);

        return response()->json($result);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => ['nullable', 'string', 'max:50', Rule::unique('employees', 'code')->where('store_id', $request->attributes->get('store_context_id'))],
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'department_id' => 'nullable|exists:hr_departments,id',
            'designation_id' => 'nullable|exists:hr_designations,id',
            'salary' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $code = $request->input('code') ?: 'EMP_'.strtoupper(substr(uniqid(), -6));
        $storeId = $request->header('X-Company-Scope-Id');

        $data = MasterFormData::prepare($request, new Employee);
        $data['code'] = $data['code'] ?? $code;
        $data['joining_date'] = $data['joining_date'] ?? now()->toDateString();
        $employee = Employee::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Employee created successfully',
            'data' => $employee->load(['department', 'designation']),
        ], 201);
    }

    public function show($id)
    {
        $employee = Employee::with(['department', 'designation', 'store'])->find($id);

        if (! $employee) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $employee,
        ]);
    }

    public function update(Request $request, $id)
    {
        $employee = Employee::find($id);

        if (! $employee) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('employees', 'code')->where('store_id', $request->attributes->get('store_context_id'))->ignore($employee)],
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $employee->update(MasterFormData::prepare($request, $employee));

        return response()->json([
            'success' => true,
            'message' => 'Employee updated successfully',
            'data' => $employee->load(['department', 'designation']),
        ]);
    }

    public function destroy($id)
    {
        $employee = Employee::find($id);

        if (! $employee) {
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
        $employee = Employee::find($id);
        if (! $employee) {
            return response()->json(['success' => false, 'message' => 'Employee not found'], 404);
        }

        $files = $request->allFiles();
        if (empty($files)) {
            return response()->json(['success' => false, 'message' => 'No document file uploaded'], 422);
        }

        $fieldName = (string) array_key_first($files);
        if (! in_array($fieldName, self::DOCUMENT_FIELDS, true)) {
            return response()->json(['success' => false, 'message' => 'Unknown document type'], 422);
        }
        $request->validate([
            $fieldName => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
        ]);

        // Private disk: the file is only reachable through a short-lived signed link from documentUrl().
        $path = $request->file($fieldName)->store("employees/{$employee->id}/documents", 'local');
        $employee->update(['master_details' => array_replace($employee->master_details ?? [], [$fieldName => $path])]);
        $url = $this->signedDocumentUrl($path);

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully',
            'path' => $path,
            'data' => [
                'id' => $employee->id,
                'url' => $url,
                'path' => $path,
                $fieldName => $path,
            ],
        ]);
    }

    /** A five-minute link to one of this employee's documents (stored as a private-disk path, or a legacy /storage URL). */
    public function documentUrl(Request $request, $id)
    {
        $employee = Employee::find($id);
        if (! $employee) {
            return response()->json(['success' => false, 'message' => 'Employee not found'], 404);
        }

        $path = $this->documentPath((string) $request->query('path', ''));
        if ($path === null || ! str_starts_with($path, "employees/{$employee->id}/") || ! Storage::disk('local')->exists($path)) {
            return response()->json(['success' => false, 'message' => 'Document not found'], 404);
        }

        return response()->json(['success' => true, 'data' => ['url' => $this->signedDocumentUrl($path)]]);
    }

    private function documentPath(string $value): ?string
    {
        // Older uploads saved the public URL, e.g. https://host/storage/employees/5/documents/x.pdf.
        if (preg_match('#/storage/(employees/.+)$#', (string) parse_url($value, PHP_URL_PATH), $match)) {
            $value = $match[1];
        }
        $value = ltrim($value, '/');

        return $value !== '' && ! str_contains($value, '..') && ! str_contains($value, '\\') ? $value : null;
    }

    private function signedDocumentUrl(string $path): string
    {
        return Storage::disk('local')->temporaryUrl($path, now()->addMinutes(5));
    }

    public function educationCertificate(Request $request, $id)
    {
        $employee = Employee::find($id);
        if (! $employee) {
            return response()->json(['success' => false, 'message' => 'Employee not found'], 404);
        }

        $request->validate([
            'certificate' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $path = $request->file('certificate')->store("employees/{$employee->id}/certificates", 'local');

        return response()->json([
            'success' => true,
            'message' => 'Education certificate uploaded successfully',
            'path' => $path,
            'data' => [
                'id' => $employee->id,
                'url' => $this->signedDocumentUrl($path),
                'path' => $path,
            ],
        ]);
    }
}
