<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Settlement extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'batch_no',
        'settlement_date',
        'total_sales',
        'cash_total',
        'card_total',
        'upi_total',
        'credit_total',
        'settled_by',
    ];

    protected function casts(): array
    {
        return [
            'settlement_date' => 'date',
            'total_sales'     => 'decimal:2',
            'cash_total'      => 'decimal:2',
            'card_total'      => 'decimal:2',
            'upi_total'       => 'decimal:2',
            'credit_total'    => 'decimal:2',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function settler()
    {
        return $this->belongsTo(User::class, 'settled_by');
    }
}
