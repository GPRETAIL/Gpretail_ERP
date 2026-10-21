<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Agent extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->created_by = auth()->user()?->name ?? auth()->user()?->username;
        });
    }

    protected $guarded = ['id', 'created_at', 'updated_at'];

    protected function casts(): array
    {
        return [
            'commission_rate' => 'decimal:2',
            'commission_amt' => 'decimal:2',
            'commission_pct' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }
}
