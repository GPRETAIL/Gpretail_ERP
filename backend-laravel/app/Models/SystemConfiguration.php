<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string|null $created_by
 * @property int|null $store_id
 */
class SystemConfiguration extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->created_by = auth()->user()->name ?? auth()->user()?->username;
        });
    }

    protected $fillable = ['store_id',
        'is_active',
        'key',
        'config_key',
        'value',
        'config_value',
        'group',
        'group_name',
        'code',
        'sort_order',
        'extra_data',
    ];

    protected $casts = [
        'extra_data' => 'array',
        'is_active' => 'boolean',
    ];
}
