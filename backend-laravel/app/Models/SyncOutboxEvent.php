<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SyncOutboxEvent extends Model
{
    use HasFactory;

    protected $table = 'sync_outbox';

    protected $fillable = [
        'store_id',
        'method',
        'path',
        'payload',
        'headers',
        'idempotency_key',
        'status',
        'attempts',
        'last_error',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'headers' => 'array',
            'synced_at' => 'datetime',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}
