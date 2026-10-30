<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ApprovalLimit;
use App\Models\ApprovalRequest;
use App\Services\ApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * POS discount / refund approvals: store limits, counter PIN approval, remote requests and the
 * approver inbox. Enforcement itself lives in ApprovalService, called by sales and returns.
 */
class ApprovalController extends Controller
{
    public const REASONS = ['damaged_item', 'price_match', 'loyal_customer', 'bulk_purchase', 'manager_discretion', 'wrong_item', 'customer_complaint', 'other'];

    public function __construct(private ApprovalService $approvals) {}

    public function limits(Request $request): JsonResponse
    {
        $storeId = $this->storeId($request);
        $rows = ApprovalLimit::withoutGlobalScopes()->where('store_id', $storeId)->get()->keyBy('role');

        return response()->json(['success' => true, 'data' => [
            'enabled' => $rows->isNotEmpty(),
            'limits' => collect(array_keys(ApprovalService::RECOMMENDED))->map(fn (string $role) => [
                'role' => $role, ...($rows->get($role)?->only(['max_discount_percent', 'max_refund_amount', 'allow_no_receipt_refund']) ?? ApprovalService::RECOMMENDED[$role]),
            ])->values(),
            'recommended' => ApprovalService::RECOMMENDED,
            'reasons' => self::REASONS,
        ]]);
    }

    public function updateLimits(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => 'required|boolean',
            'limits' => 'array|max:20',
            'limits.*.role' => 'required|string|in:'.implode(',', array_keys(ApprovalService::RECOMMENDED)),
            'limits.*.max_discount_percent' => 'nullable|numeric|min:0|max:100',
            'limits.*.max_refund_amount' => 'nullable|numeric|min:0|max:100000000',
            'limits.*.allow_no_receipt_refund' => 'boolean',
        ]);
        $storeId = $this->storeId($request);
        DB::transaction(function () use ($data, $storeId) {
            ApprovalLimit::withoutGlobalScopes()->where('store_id', $storeId)->delete();
            if (! $data['enabled']) {
                return;
            }
            foreach (array_keys(ApprovalService::RECOMMENDED) as $role) {
                $given = collect($data['limits'] ?? [])->firstWhere('role', $role) ?? ApprovalService::RECOMMENDED[$role];
                ApprovalLimit::create(['store_id' => $storeId, 'role' => $role,
                    'max_discount_percent' => $given['max_discount_percent'] ?? null, 'max_refund_amount' => $given['max_refund_amount'] ?? null,
                    'allow_no_receipt_refund' => (bool) ($given['allow_no_receipt_refund'] ?? false)]);
            }
        });

        return $this->limits($request);
    }

    public function myLimit(Request $request): JsonResponse
    {
        $storeId = $this->storeId($request);

        return response()->json(['success' => true, 'data' => [
            'enabled' => $this->approvals->enabled($storeId), ...$this->approvals->limitFor($request->user(), $storeId),
            'can_approve' => in_array($request->user()->role, ['supervisor', 'manager', 'admin', 'super_admin'], true),
            'has_pin' => (bool) $request->user()->approval_pin_hash, 'reasons' => self::REASONS,
        ]]);
    }

    public function setPin(Request $request): JsonResponse
    {
        $request->validate(['pin' => 'required|digits_between:4,8', 'currentPassword' => 'required|string']);
        $user = $request->user();
        abort_unless(in_array($user->role, ['supervisor', 'manager', 'admin', 'super_admin'], true), 403, 'Only supervisors and managers approve sales.');
        abort_unless(Hash::check($request->input('currentPassword'), $user->password), 422, 'Current password is incorrect.');
        $user->forceFill(['approval_pin_hash' => Hash::make((string) $request->input('pin'))])->save();

        return response()->json(['success' => true, 'message' => 'Approval PIN saved.']);
    }

    /** Remote request: lands in the approvers' inbox; the cashier polls status(). */
    public function requestApproval(Request $request): JsonResponse
    {
        $data = $this->validatedRequest($request);
        $approval = $this->approvals->createRequest($request->user(), $this->storeId($request), $data['action'], $data);

        return response()->json(['success' => true, 'data' => $this->present($approval)], 201);
    }

    /** Counter approval: the supervisor types their login and PIN on the cashier's screen. */
    public function pinApprove(Request $request): JsonResponse
    {
        $data = $this->validatedRequest($request);
        $request->validate(['approver' => 'required|string|max:190', 'pin' => 'required|string|max:12']);
        $storeId = $this->storeId($request);
        $approver = $this->approvals->verifyPin($request->input('approver'), (string) $request->input('pin'), $storeId);
        if (! $approver) {
            return response()->json(['success' => false, 'message' => 'Approver or PIN is incorrect.'], 422);
        }

        return DB::transaction(function () use ($request, $data, $storeId, $approver): JsonResponse {
            $approval = $this->approvals->createRequest($request->user(), $storeId, $data['action'], $data, 'pin');
            if (! $this->approvals->canDecide($approver, $approval)) {
                $approval->forceFill(['status' => 'rejected', 'decided_by' => $approver->id, 'decided_at' => now(), 'decision_note' => 'Above approver limit'])->save();

                return response()->json(['success' => false, 'message' => "{$approver->name} cannot approve this amount. Ask a manager."], 403);
            }
            $this->approvals->approve($approval, $approver, null, $request->input('note'));

            return response()->json(['success' => true, 'data' => [...$this->present($approval->fresh()), 'token' => $this->approvals->issueToken($approval)]]);
        });
    }

    /** Requester polls; once approved they receive the single-use token. */
    public function status(Request $request, int $id): JsonResponse
    {
        $approval = ApprovalRequest::where('requested_by', $request->user()->id)->findOrFail($id);
        if ($approval->status === 'pending' && $approval->expires_at?->isPast()) {
            $approval->forceFill(['status' => 'cancelled', 'decision_note' => 'Timed out'])->save();
        }
        $data = $this->present($approval);
        if ($approval->status === 'approved' && ! $approval->expires_at?->isPast()) {
            $data['token'] = $this->approvals->issueToken($approval);
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function withdraw(Request $request, int $id): JsonResponse
    {
        $approval = ApprovalRequest::where('requested_by', $request->user()->id)->where('status', 'pending')->findOrFail($id);
        $approval->forceFill(['status' => 'cancelled', 'decision_note' => 'Withdrawn by requester'])->save();

        return response()->json(['success' => true, 'data' => $this->present($approval)]);
    }

    public function inbox(Request $request): JsonResponse
    {
        $request->validate(['status' => 'nullable|in:pending,approved,rejected,cancelled,used,all']);
        $status = $request->input('status', 'pending');
        $rows = ApprovalRequest::with(['requester:id,name,username', 'decider:id,name,username'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($status === 'pending', fn ($q) => $q->where('expires_at', '>', now()))
            ->latest('id')->limit(200)->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn ($row) => [
            ...$this->present($row), 'can_decide' => $row->status === 'pending' && $this->approvals->canDecide($request->user(), $row),
        ])->values()]);
    }

    public function pendingCount(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => ['count' => ApprovalRequest::where('status', 'pending')->where('expires_at', '>', now())->count()]]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $request->validate(['approved_percent' => 'nullable|numeric|min:0|max:100', 'note' => 'nullable|string|max:500']);

        return DB::transaction(function () use ($request, $id): JsonResponse {
            $approval = ApprovalRequest::lockForUpdate()->findOrFail($id);
            abort_unless($approval->status === 'pending' && ! $approval->expires_at?->isPast(), 422, 'This request is no longer pending.');
            abort_unless($this->approvals->canDecide($request->user(), $approval), 403, 'This request is above your approval limit, or is your own request.');
            $percent = $request->filled('approved_percent') ? (float) $request->input('approved_percent') : null;
            $this->approvals->approve($approval, $request->user(), $percent, $request->input('note'));

            return response()->json(['success' => true, 'data' => $this->present($approval->fresh())]);
        });
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $request->validate(['note' => 'nullable|string|max:500']);
        $approval = ApprovalRequest::where('status', 'pending')->findOrFail($id);
        abort_unless($this->approvals->canDecide($request->user(), $approval) || in_array($request->user()->role, ['admin', 'super_admin'], true), 403, 'You cannot decide this request.');
        $approval->forceFill(['status' => 'rejected', 'decided_by' => $request->user()->id, 'decided_at' => now(), 'decision_note' => $request->input('note')])->save();

        return response()->json(['success' => true, 'data' => $this->present($approval)]);
    }

    private function validatedRequest(Request $request): array
    {
        return $request->validate([
            'action' => 'required|in:'.implode(',', ApprovalService::ACTIONS),
            'requested_percent' => 'required_if:action,pos_discount|nullable|numeric|min:0|max:100',
            'amount' => 'required_if:action,pos_refund|nullable|numeric|min:0',
            'reason_code' => 'required|in:'.implode(',', self::REASONS),
            'note' => 'nullable|string|max:500',
            'payload' => 'nullable|array',
        ]);
    }

    private function storeId(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');

        return $storeId;
    }

    private function present(ApprovalRequest $approval): array
    {
        return [
            'id' => $approval->id, 'action' => $approval->action, 'status' => $approval->status, 'channel' => $approval->channel,
            'requested_percent' => $approval->requested_percent, 'approved_percent' => $approval->approved_percent, 'amount' => $approval->amount,
            'reason_code' => $approval->reason_code, 'note' => $approval->note, 'decision_note' => $approval->decision_note,
            'payload' => $approval->payload, 'created_at' => $approval->created_at?->toIso8601String(),
            'decided_at' => $approval->decided_at?->toIso8601String(), 'expires_at' => $approval->expires_at?->toIso8601String(),
            'requested_by' => $approval->relationLoaded('requester') ? $approval->requester?->only(['id', 'name', 'username']) : $approval->requested_by,
            'decided_by' => $approval->relationLoaded('decider') ? $approval->decider?->only(['id', 'name', 'username']) : $approval->decided_by,
        ];
    }
}
