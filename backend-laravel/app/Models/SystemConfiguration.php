<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemConfiguration extends Model
{
    use HasFactory;

    protected $fillable = [
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
    ];
}
