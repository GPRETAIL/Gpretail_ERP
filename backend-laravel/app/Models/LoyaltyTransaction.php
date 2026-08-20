<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'pos_sale_id',
        'type',
        'points',
        'amount',
        'balance_after',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'points'        => 'integer',
            'amount'        => 'decimal:2',
            'balance_after' => 'integer',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function posSale()
    {
        return $this->belongsTo(PosSale::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
