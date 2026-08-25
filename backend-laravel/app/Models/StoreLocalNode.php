<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreLocalNode extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'tenant_key',
        'sync_token',
        'enabled',
        'local_server_url',
        'advertised_local_server_url',
        'local_healthy',
        'last_heartbeat_at',
        'last_health_check_at',
        'last_catch_up_at',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'local_healthy' => 'boolean',
            'last_heartbeat_at' => 'datetime',
            'last_health_check_at' => 'datetime',
            'last_catch_up_at' => 'datetime',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}
