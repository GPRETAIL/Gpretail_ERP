<?php

namespace App\Models;

use App\Services\RealtimeService;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $table = 'app_notifications';

    protected $fillable = [
        'type',
        'title',
        'message',
        'link',
        'reference_type',
        'reference_id',
        'store_id',
        'read_at',
    ];

    protected static function booted(): void
    {
        // Store alerts; unread counts and inboxes reload (many alerts in one request send one nudge).
        static::created(fn (self $notification) => app(RealtimeService::class)->toStore((int) $notification->store_id, 'notifications.updated'));
    }

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }
}
