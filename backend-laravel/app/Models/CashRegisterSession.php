<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashRegisterSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'user_id',
        'opened_at',
        'closed_at',
        'opening_cash',
        'closing_cash',
        'expected_cash',
        'difference',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'opened_at'     => 'datetime',
            'closed_at'     => 'datetime',
            'opening_cash'  => 'decimal:2',
            'closing_cash'  => 'decimal:2',
            'expected_cash' => 'decimal:2',
            'difference'    => 'decimal:2',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function sales()
    {
        return $this->hasMany(PosSale::class, 'cash_session_id');
    }
}
