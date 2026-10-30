<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
            'points' => 'integer',
            'amount' => 'decimal:2',
            'balance_after' => 'integer',
        ];
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return BelongsTo<PosSale, $this> */
    public function posSale(): BelongsTo
    {
        return $this->belongsTo(PosSale::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
