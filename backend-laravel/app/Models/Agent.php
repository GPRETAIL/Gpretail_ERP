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

    protected $fillable = [
        'store_id',
        'name',
        'contact_person',
        'code',
        'agent_type_id',
        'email',
        'email_id',
        'phone',
        'contact_no',
        'address',
        'pan',
        'gst',
        'commission_rate',
        'commission_amt',
        'commission_pct',
        'city_id',
        'state_id',
        'pincode',
        'tax_id',
        'bank_id',
        'bank_account_name',
        'ifsc',
        'account_no',
        'is_active',
    ];

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
