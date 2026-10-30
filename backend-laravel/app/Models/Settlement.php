<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
            'total_sales' => 'decimal:2',
            'cash_total' => 'decimal:2',
            'card_total' => 'decimal:2',
            'upi_total' => 'decimal:2',
            'credit_total' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<User, $this> */
    public function settler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'settled_by');
    }
}
