<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * This deployment's registration with the platform (Gpretail_Admin) and the last configuration
 * pulled from there. See App\Services\PlatformClient for how it's populated.
 */
class PlatformActivation extends Model
{
    protected $fillable = [
        'company_code',
        'client_id',
        'sync_token',
        'activated',
        'status',
        'active_till',
        'limits',
        'feature_flags',
        'licence_token',
        'licence_state',
        'licence_expires_at',
        'licence_grace_until',
        'registered_at',
        'last_synced_at',
        'last_sync_error',
    ];

    protected $hidden = [
        'sync_token',
        'client_id',
    ];

    protected function casts(): array
    {
        return [
            'activated' => 'boolean',
            'active_till' => 'datetime',
            'limits' => 'array',
            'feature_flags' => 'array',
            'licence_expires_at' => 'datetime',
            'licence_grace_until' => 'datetime',
            'registered_at' => 'datetime',
            'last_synced_at' => 'datetime',
        ];
    }

    public static function current(): ?self
    {
        return static::query()->orderByDesc('id')->first();
    }
}
