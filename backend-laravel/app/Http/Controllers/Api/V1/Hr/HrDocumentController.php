<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/** HR > Documents: the files HR keeps for an employee (offer letter, ID card, Form 16). The employee sees theirs in the staff app. */
class HrDocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['employee_id' => 'nullable|integer']);
        $rows = HrDocument::with('employee:id,name,code')->when($request->query('employee_id'), fn ($q, $id) => $q->where('employee_id', $id))
            ->orderByDesc('id')->limit(1000)->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (HrDocument $doc) => $this->present($doc))->values(), 'types' => HrDocument::TYPES]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|integer', 'type' => 'required|in:'.implode(',', array_keys(HrDocument::TYPES)), 'title' => 'required|string|max:150',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ], ['employee_id.required' => 'Choose the employee.', 'title.required' => 'Give the document a title.', 'file.required' => 'Choose the file.',
            'file.max' => 'The file is too big. Keep it under 5 MB.', 'file.mimes' => 'The file must be a PDF, JPG or PNG.']);
        $employee = Employee::findOrFail($data['employee_id']);
        $file = $request->file('file');
        $doc = HrDocument::create([
            'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'type' => $data['type'], 'title' => $data['title'],
            'file_path' => Storage::disk('local')->putFile("hr-documents/{$employee->store_id}", $file), 'mime' => $file->getClientMimeType(), 'size' => (int) $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json(['success' => true, 'message' => 'Document added.', 'data' => $this->present($doc->load('employee:id,name,code'))], 201);
    }

    public function download(int $id)
    {
        $doc = HrDocument::findOrFail($id);
        abort_unless(Storage::disk('local')->exists($doc->file_path), 404, 'This file is not available.');

        return Storage::disk('local')->download($doc->file_path, preg_replace('/[^A-Za-z0-9._ -]+/', '', $doc->title).'.'.pathinfo($doc->file_path, PATHINFO_EXTENSION));
    }

    public function destroy(int $id): JsonResponse
    {
        $doc = HrDocument::findOrFail($id);
        Storage::disk('local')->delete($doc->file_path);
        $doc->delete();

        return response()->json(['success' => true, 'message' => 'Document removed.']);
    }

    private function present(HrDocument $doc): array
    {
        return [
            'id' => $doc->id, 'employee_id' => $doc->employee_id, 'employee' => $doc->employee?->name, 'code' => $doc->employee?->code, 'type' => $doc->type,
            'type_label' => HrDocument::TYPES[$doc->type] ?? $doc->type, 'title' => $doc->title, 'size' => $doc->size, 'added_on' => $doc->created_at?->toDateString(),
        ];
    }
}
