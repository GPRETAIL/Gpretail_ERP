<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrAnnouncement;
use App\Models\HrAnnouncementRead;
use App\Models\HrDocument;
use App\Models\HrTicket;
use App\Models\HrTicketReply;
use App\Services\Hr\AttendanceService;
use App\Services\Hr\HrScope;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * The Company part of the staff app (/hr): announcements and policies, the helpdesk, the colleague directory,
 * birthdays and work anniversaries, and the employee's own documents. Everything is for the signed-in employee's store;
 * tickets and documents are their own only.
 */
class StaffCompanyController extends Controller
{
    public function __construct(private readonly HrScope $scope, private readonly AttendanceService $attendance) {}

    /** What HR has published for me (everyone, or my department), pinned first, with what I have read and agreed to. */
    public function announcements(Request $request): JsonResponse
    {
        $employee = $this->employee($request);
        $today = $this->attendance->today();
        $reads = HrAnnouncementRead::where('employee_id', $employee->id)->get()->keyBy('announcement_id');
        $rows = HrAnnouncement::whereDate('publish_on', '<=', $today)
            ->where(fn ($q) => $q->whereNull('expires_on')->orWhereDate('expires_on', '>=', $today))
            ->where(fn ($q) => $q->whereNull('department_id')->orWhere('department_id', $employee->department_id))
            ->orderByDesc('is_pinned')->orderByDesc('publish_on')->orderByDesc('id')->limit(200)->get();

        $list = $rows->map(fn (HrAnnouncement $row) => [
            'id' => $row->id, 'category' => $row->category, 'title' => $row->title, 'body' => $row->body, 'is_pinned' => $row->is_pinned,
            'publish_on' => $row->publish_on->toDateString(), 'expires_on' => $row->expires_on?->toDateString(),
            'read' => (bool) $reads->get($row->id)?->read_at, 'acknowledged' => (bool) $reads->get($row->id)?->acknowledged_at,
        ])->values();

        return response()->json(['success' => true, 'data' => [
            'items' => $list,
            'unread' => $list->where('read', false)->count(),
            'to_acknowledge' => $list->where('category', HrAnnouncement::POLICY)->where('acknowledged', false)->count(),
        ]]);
    }

    public function readAnnouncement(Request $request, int $id): JsonResponse
    {
        return $this->mark($request, $id, false);
    }

    /** "I have read and agree" on a policy. */
    public function acknowledgeAnnouncement(Request $request, int $id): JsonResponse
    {
        return $this->mark($request, $id, true);
    }

    public function tickets(Request $request): JsonResponse
    {
        $employee = $this->employee($request);
        $rows = HrTicket::where('employee_id', $employee->id)->orderByRaw("case status when 'CLOSED' then 1 else 0 end")->orderByDesc('last_reply_at')->orderByDesc('id')->limit(100)->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (HrTicket $ticket) => $this->ticketRow($ticket))->values(), 'categories' => HrTicket::CATEGORIES]);
    }

    public function ticket(Request $request, int $id): JsonResponse
    {
        $ticket = HrTicket::where('employee_id', $this->employee($request)->id)->with('replies')->findOrFail($id);

        return response()->json(['success' => true, 'data' => $this->ticketRow($ticket, true)]);
    }

    public function createTicket(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category' => 'required|in:'.implode(',', array_keys(HrTicket::CATEGORIES)), 'subject' => 'required|string|max:150', 'message' => 'required|string|max:3000',
        ], ['subject.required' => 'Write a short title for your question.', 'message.required' => 'Write your question or problem.', 'category.required' => 'Choose what it is about.']);
        $employee = $this->employee($request);
        $ticket = HrTicket::create(['store_id' => $employee->store_id, 'employee_id' => $employee->id, 'status' => 'OPEN', 'last_reply_at' => now()] + $data);

        return response()->json(['success' => true, 'message' => 'Sent to HR.', 'data' => $this->ticketRow($ticket->load('replies'), true)], 201);
    }

    /** The employee adds to their ticket. A closed ticket is opened again. */
    public function replyTicket(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['body' => 'required|string|max:3000'], ['body.required' => 'Write your reply.']);
        $employee = $this->employee($request);
        $ticket = HrTicket::where('employee_id', $employee->id)->findOrFail($id);
        HrTicketReply::create(['store_id' => $ticket->store_id, 'ticket_id' => $ticket->id, 'author_type' => 'EMPLOYEE', 'author_user_id' => $request->user()->id, 'body' => $data['body']]);
        $ticket->forceFill(['status' => $ticket->status === 'CLOSED' ? 'OPEN' : $ticket->status, 'closed_at' => null, 'closed_by' => null, 'last_reply_at' => now()])->save();

        return response()->json(['success' => true, 'message' => 'Sent to HR.', 'data' => $this->ticketRow($ticket->load('replies'), true)]);
    }

    /** Colleagues of my store: name, role, department, mobile and email. Never pay, bank or ID details. */
    public function directory(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => 'nullable|string|max:60']);
        $this->employee($request);
        $term = trim((string) ($data['q'] ?? ''));
        $rows = Employee::with('designation:id,name', 'department:id,name')->where('is_active', true)
            ->when($term !== '', fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', "%{$term}%")->orWhere('code', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%")))
            ->orderBy('name')->limit(200)->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (Employee $e) => [
            'id' => $e->id, 'name' => $e->name, 'code' => $e->code, 'designation' => $e->designation?->name, 'department' => $e->department?->name,
            'phone' => $e->phone, 'email' => $e->email,
        ])->values()]);
    }

    /** Birthdays and work anniversaries in the next two weeks (day and month, never the birth year). */
    public function celebrations(Request $request): JsonResponse
    {
        $this->employee($request);
        $today = Carbon::parse($this->attendance->today());
        $until = $today->copy()->addDays(14);
        $people = Employee::where('is_active', true)->get(['id', 'name', 'joining_date', 'master_details', 'designation_id', 'store_id'])->load('designation:id,name');

        $next = function (?string $date) use ($today) {
            if (! $date) {
                return null;
            }
            $when = Carbon::parse($date);
            $day = Carbon::create($today->year, $when->month, min($when->day, Carbon::create($today->year, $when->month, 1)->daysInMonth));
            if ($day->lt($today)) {
                $day = Carbon::create($today->year + 1, $when->month, min($when->day, Carbon::create($today->year + 1, $when->month, 1)->daysInMonth));
            }

            return $day;
        };
        $out = [];
        foreach ($people as $person) {
            $birthday = $next($person->master_details['date_of_birth'] ?? null);
            if ($birthday && $birthday->lte($until)) {
                $out[] = ['employee_id' => $person->id, 'name' => $person->name, 'designation' => $person->designation?->name, 'type' => 'BIRTHDAY', 'date' => $birthday->toDateString(), 'years' => null];
            }
            $anniversary = $next($person->joining_date?->toDateString());
            if ($anniversary && $anniversary->lte($until) && $anniversary->year - $person->joining_date->year >= 1) {
                $out[] = ['employee_id' => $person->id, 'name' => $person->name, 'designation' => $person->designation?->name, 'type' => 'ANNIVERSARY', 'date' => $anniversary->toDateString(), 'years' => $anniversary->year - $person->joining_date->year];
            }
        }
        usort($out, fn ($a, $b) => [$a['date'], $a['name']] <=> [$b['date'], $b['name']]);

        return response()->json(['success' => true, 'data' => ['today' => $today->toDateString(), 'items' => $out]]);
    }

    public function documents(Request $request): JsonResponse
    {
        $rows = HrDocument::where('employee_id', $this->employee($request)->id)->orderByDesc('id')->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (HrDocument $doc) => [
            'id' => $doc->id, 'type' => $doc->type, 'type_label' => HrDocument::TYPES[$doc->type] ?? $doc->type, 'title' => $doc->title,
            'size' => $doc->size, 'mime' => $doc->mime, 'added_on' => $doc->created_at?->toDateString(),
        ])->values()]);
    }

    /** My own document only, through the signed-in token (there is no public link). */
    public function downloadDocument(Request $request, int $id)
    {
        $doc = HrDocument::where('employee_id', $this->employee($request)->id)->findOrFail($id);
        abort_unless(Storage::disk('local')->exists($doc->file_path), 404, 'This file is not available. Ask HR.');

        return Storage::disk('local')->download($doc->file_path, $this->fileName($doc));
    }

    private function mark(Request $request, int $id, bool $agree): JsonResponse
    {
        $employee = $this->employee($request);
        $today = $this->attendance->today();
        $row = HrAnnouncement::whereDate('publish_on', '<=', $today)
            ->where(fn ($q) => $q->whereNull('department_id')->orWhere('department_id', $employee->department_id))->findOrFail($id);
        if ($agree && $row->category !== HrAnnouncement::POLICY) {
            throw ValidationException::withMessages(['announcement' => 'Only a policy needs your agreement.']);
        }
        $read = HrAnnouncementRead::firstOrNew(['announcement_id' => $row->id, 'employee_id' => $employee->id]);
        $read->store_id = $employee->store_id;
        $read->read_at ??= now();
        if ($agree) {
            $read->acknowledged_at ??= now();
        }
        $read->save();

        return response()->json(['success' => true, 'message' => $agree ? 'Thank you. Your agreement is recorded.' : 'Marked as read.']);
    }

    private function ticketRow(HrTicket $ticket, bool $withReplies = false): array
    {
        $row = [
            'id' => $ticket->id, 'category' => $ticket->category, 'category_label' => HrTicket::CATEGORIES[$ticket->category] ?? $ticket->category,
            'subject' => $ticket->subject, 'message' => $ticket->message, 'status' => $ticket->status,
            'created_at' => $ticket->created_at?->toIso8601String(), 'last_reply_at' => $ticket->last_reply_at?->toIso8601String(),
        ];
        if ($withReplies) {
            $row['replies'] = $ticket->replies->map(fn (HrTicketReply $reply) => ['id' => $reply->id, 'from' => $reply->author_type, 'body' => $reply->body, 'at' => $reply->created_at?->toIso8601String()])->values();
        }

        return $row;
    }

    private function fileName(HrDocument $doc): string
    {
        $extension = pathinfo($doc->file_path, PATHINFO_EXTENSION);

        return preg_replace('/[^A-Za-z0-9._ -]+/', '', $doc->title).($extension ? ".{$extension}" : '');
    }

    private function employee(Request $request): Employee
    {
        $employee = $this->scope->employeeFor($request->user());
        abort_unless($employee, 404, 'Your login is not linked to an employee. Ask HR.');

        return $employee;
    }
}
