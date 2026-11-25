<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\HrTicket;
use App\Models\HrTicketReply;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** HR > Helpdesk: the questions employees raise from the staff app. HR replies, and closes a ticket when it is answered. */
class HrTicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => 'nullable|in:ALL,OPEN,IN_PROGRESS,CLOSED']);
        $status = $request->query('status', 'ALL');
        $rows = HrTicket::with('employee:id,name,code')->when($status !== 'ALL', fn ($q) => $q->where('status', $status))
            ->orderByRaw("case status when 'CLOSED' then 1 else 0 end")->orderByDesc('last_reply_at')->limit(500)->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (HrTicket $ticket) => $this->present($ticket))->values(),
            'open' => HrTicket::where('status', '!=', 'CLOSED')->count()]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->present(HrTicket::with('employee:id,name,code', 'replies')->findOrFail($id), true)]);
    }

    /** HR answers. The employee gets a notification, and an open ticket becomes In progress. */
    public function reply(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['body' => 'required|string|max:3000'], ['body.required' => 'Write your reply.']);
        $ticket = HrTicket::with('employee:id,name,code,user_id')->findOrFail($id);
        HrTicketReply::create(['store_id' => $ticket->store_id, 'ticket_id' => $ticket->id, 'author_type' => 'HR', 'author_user_id' => $request->user()->id, 'body' => $data['body']]);
        $ticket->forceFill(['status' => $ticket->status === 'OPEN' ? 'IN_PROGRESS' : $ticket->status, 'last_reply_at' => now()])->save();
        $this->notify($ticket, 'HR replied', "HR replied to \"{$ticket->subject}\".");

        return response()->json(['success' => true, 'message' => 'Reply sent.', 'data' => $this->present($ticket->load('replies'), true)]);
    }

    public function setStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:OPEN,IN_PROGRESS,CLOSED']);
        $ticket = HrTicket::with('employee:id,name,code,user_id')->findOrFail($id);
        $closing = $data['status'] === 'CLOSED' && $ticket->status !== 'CLOSED';
        $ticket->forceFill(['status' => $data['status'], 'closed_at' => $data['status'] === 'CLOSED' ? ($ticket->closed_at ?? now()) : null,
            'closed_by' => $data['status'] === 'CLOSED' ? ($ticket->closed_by ?? $request->user()->id) : null])->save();
        if ($closing) {
            $this->notify($ticket, 'Your question is closed', "HR closed \"{$ticket->subject}\". Reply on it if you still need help.");
        }

        return response()->json(['success' => true, 'message' => 'Saved.', 'data' => $this->present($ticket->load('replies'), true)]);
    }

    private function notify(HrTicket $ticket, string $title, string $message): void
    {
        if (! $ticket->employee?->user_id) {
            return;
        }
        Notification::withoutGlobalScopes()->create(['type' => 'HR_TICKET', 'title' => $title, 'message' => $message, 'link' => '/hr',
            'reference_type' => 'HR_TICKET', 'reference_id' => $ticket->id, 'store_id' => $ticket->store_id, 'user_id' => $ticket->employee->user_id]);
    }

    private function present(HrTicket $ticket, bool $withReplies = false): array
    {
        $row = [
            'id' => $ticket->id, 'employee_id' => $ticket->employee_id, 'employee' => $ticket->employee?->name, 'code' => $ticket->employee?->code,
            'category' => $ticket->category, 'category_label' => HrTicket::CATEGORIES[$ticket->category] ?? $ticket->category, 'subject' => $ticket->subject,
            'message' => $ticket->message, 'status' => $ticket->status, 'created_at' => $ticket->created_at?->toIso8601String(), 'last_reply_at' => $ticket->last_reply_at?->toIso8601String(),
        ];
        if ($withReplies) {
            $row['replies'] = $ticket->replies->map(fn (HrTicketReply $reply) => ['id' => $reply->id, 'from' => $reply->author_type, 'body' => $reply->body, 'at' => $reply->created_at?->toIso8601String()])->values();
        }

        return $row;
    }
}
