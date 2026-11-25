<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrAnnouncement;
use App\Services\Hr\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** HR > Announcements: write notices and policies for the staff app, and see who has read and agreed. */
class HrAnnouncementController extends Controller
{
    public function __construct(private readonly AttendanceService $attendance) {}

    public function index(): JsonResponse
    {
        $staff = max(1, Employee::where('is_active', true)->count());
        $rows = HrAnnouncement::withCount(['reads as read_count' => fn ($q) => $q->whereNotNull('read_at'), 'reads as agreed_count' => fn ($q) => $q->whereNotNull('acknowledged_at')])
            ->orderByDesc('is_pinned')->orderByDesc('publish_on')->orderByDesc('id')->limit(500)->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (HrAnnouncement $row) => $this->present($row))->values(), 'staff' => $staff]);
    }

    public function store(Request $request): JsonResponse
    {
        $row = HrAnnouncement::create($this->validated($request) + ['store_id' => (int) $request->attributes->get('store_context_id'), 'created_by' => $request->user()->id]);

        return response()->json(['success' => true, 'message' => $row->category === HrAnnouncement::POLICY ? 'Policy published.' : 'Announcement published.', 'data' => $this->present($row)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $row = HrAnnouncement::findOrFail($id);
        $row->update($this->validated($request));

        return response()->json(['success' => true, 'message' => 'Saved.', 'data' => $this->present($row)]);
    }

    public function destroy(int $id): JsonResponse
    {
        HrAnnouncement::findOrFail($id)->delete();

        return response()->json(['success' => true, 'message' => 'Removed.']);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'category' => 'required|in:ANNOUNCEMENT,POLICY', 'title' => 'required|string|max:150', 'body' => 'required|string|max:10000',
            'is_pinned' => 'nullable|boolean', 'publish_on' => 'nullable|date_format:Y-m-d', 'expires_on' => 'nullable|date_format:Y-m-d|after_or_equal:publish_on',
            'department_id' => 'nullable|integer',
        ], ['title.required' => 'Write a title.', 'body.required' => 'Write the notice.', 'expires_on.after_or_equal' => 'The end date cannot be before the start date.']);

        return ['publish_on' => $data['publish_on'] ?? $this->attendance->today(), 'is_pinned' => (bool) ($data['is_pinned'] ?? false)] + $data;
    }

    private function present(HrAnnouncement $row): array
    {
        return [
            'id' => $row->id, 'category' => $row->category, 'title' => $row->title, 'body' => $row->body, 'is_pinned' => $row->is_pinned,
            'publish_on' => $row->publish_on->toDateString(), 'expires_on' => $row->expires_on?->toDateString(), 'department_id' => $row->department_id,
            'read_count' => (int) ($row->read_count ?? 0), 'agreed_count' => (int) ($row->agreed_count ?? 0),
        ];
    }
}
