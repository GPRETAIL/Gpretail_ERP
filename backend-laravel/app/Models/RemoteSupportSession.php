<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RemoteSupportSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'client_id',
        'client_password',
        'customer_name',
        'contact_number',
        'system_os',
        'issue_description',
        'category',
        'priority',
        'status',
        'requested_by',
        'connected_by',
        'started_at',
        'ended_at',
        'duration_seconds',
        'notes',
    ];

    protected $appends = [
        'duration_formatted',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'duration_seconds' => 'integer',
        ];
    }

    public function getDurationFormattedAttribute(): string
    {
        $sec = $this->duration_seconds;
        if (! $sec && $this->started_at && $this->ended_at) {
            $sec = $this->started_at->diffInSeconds($this->ended_at);
        }
        if (! $sec || $sec <= 0) {
            return $this->status === 'connected' ? 'In progress' : '-';
        }
        $mins = round($sec / 60);
        if ($mins < 60) {
            return max(1, $mins).' min'.($mins > 1 ? 's' : '');
        }
        $hrs = floor($mins / 60);
        $remMins = $mins % 60;

        return $hrs.' hr'.($hrs > 1 ? 's' : '').($remMins > 0 ? " {$remMins}m" : '');
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /** @return BelongsTo<User, $this> */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /** @return BelongsTo<User, $this> */
    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'connected_by');
    }

    public function scopeWaiting($query)
    {
        return $query->where('status', 'waiting');
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['waiting', 'connected']);
    }
}
