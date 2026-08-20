<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditLedger extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'reference_type',
        'reference_id',
        'debit',
        'credit',
        'balance',
        'description',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'debit'   => 'decimal:2',
            'credit'  => 'decimal:2',
            'balance' => 'decimal:2',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
