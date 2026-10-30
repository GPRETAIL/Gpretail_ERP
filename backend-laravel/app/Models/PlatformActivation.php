<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * This deployment's registration with the platform (Gpretail_Admin) and the last configuration
 * pulled from there. See App\Services\PlatformClient for how it's populated.
 */
/**
 * @property string|null $deployment_id
 */
class PlatformActivation extends Model
{
    protected $fillable = [
        'deployment_id',
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
        'tenant_admin_email',
        'onboarding_required',
        'first_erp_login_at',
    ];

    protected $hidden = [
        'sync_token',
        'licence_token',
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
            'first_erp_login_at' => 'datetime',
            'onboarding_required' => 'boolean',
            'last_synced_at' => 'datetime',
        ];
    }

    public static function current(): ?self
    {
        return static::query()->orderByDesc('id')->first();
    }
}
