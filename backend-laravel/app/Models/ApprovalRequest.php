<?php

namespace App\Models;

use App\Services\RealtimeService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalRequest extends Model
{
    protected $fillable = [
        'store_id', 'action', 'status', 'channel', 'requested_by', 'decided_by', 'requested_percent', 'approved_percent',
        'amount', 'reason_code', 'note', 'decision_note', 'payload', 'token_hash', 'decided_at', 'expires_at', 'used_at',
        'pos_sale_id', 'pos_return_id',
    ];

    protected $hidden = ['token_hash'];

    protected static function booted(): void
    {
        // Inboxes refresh on any change; the requester's waiting screen hears about the decision.
        static::saved(function (self $request) {
            if (! $request->wasChanged('status') && ! $request->wasRecentlyCreated) {
                return;
            }
            $realtime = app(RealtimeService::class);
            $realtime->toStore((int) $request->store_id, 'approvals.updated', ['id' => $request->id]);
            if (in_array($request->status, ['approved', 'rejected'], true)) {
                $realtime->toUser((int) $request->requested_by, 'approval.decided', ['id' => $request->id, 'status' => $request->status]);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'requested_percent' => 'float',
            'approved_percent' => 'float',
            'amount' => 'float',
            'decided_at' => 'datetime',
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
