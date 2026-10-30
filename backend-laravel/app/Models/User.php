<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property array<string, array<string, bool>>|null $page_permissions
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $attributes = ['is_active' => true, 'web_access' => true, 'mobile_access' => false];

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'store_id',
        'counter_id',
        'phone',
        'is_active',
        'must_change_password',
        'dashboard_layouts',
        'platform_company_code',
        'platform_password_version',
        'platform_identity',
        'web_access', 'mobile_access', 'module_permissions', 'page_permissions',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'google_sub',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'dashboard_layouts' => 'array',
            'web_access' => 'boolean', 'mobile_access' => 'boolean', 'module_permissions' => 'array', 'page_permissions' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::updated(function (self $user): void {
            if ($user->wasChanged(['password', 'email', 'role', 'store_id', 'is_active', 'google_sub', 'web_access', 'mobile_access', 'module_permissions', 'page_permissions'])) {
                $user->tokens()->delete();
            }
        });
    }

    /** @return BelongsToMany<Store, $this> */
    public function assignedStores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class, 'user_store_access');
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
