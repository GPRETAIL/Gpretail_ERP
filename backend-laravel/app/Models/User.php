<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $attributes = ['is_active' => true];

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
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'dashboard_layouts' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::updated(function (self $user): void {
            if ($user->wasChanged(['password', 'role', 'store_id', 'is_active'])) {
                $user->tokens()->delete();
            }
        });
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}
