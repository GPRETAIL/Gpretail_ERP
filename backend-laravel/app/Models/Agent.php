<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Agent extends Model
{
    use HasFactory;

    protected $guarded = ['id', 'created_at', 'updated_at'];

    protected function casts(): array
    {
        return [
            'commission_rate' => 'decimal:2',
            'commission_amt'  => 'decimal:2',
            'commission_pct'  => 'decimal:2',
            'is_active'       => 'boolean',
        ];
    }
}
