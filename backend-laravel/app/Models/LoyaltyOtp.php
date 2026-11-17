<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A one-time password a customer receives to approve redeeming loyalty points at POS (hashed; never stored plain). */
class LoyaltyOtp extends Model
{
    protected $fillable = [
        'store_id', 'customer_id', 'channel', 'sent_to', 'code_hash', 'points', 'amount', 'attempts', 'expires_at',
        'verified_at', 'token_hash', 'token_expires_at', 'used_at', 'pos_sale_id', 'created_by',
    ];

    protected $hidden = ['code_hash', 'token_hash'];

    protected function casts(): array
    {
        return [
            'points' => 'integer', 'amount' => 'decimal:2', 'attempts' => 'integer', 'expires_at' => 'datetime',
            'verified_at' => 'datetime', 'token_expires_at' => 'datetime', 'used_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
