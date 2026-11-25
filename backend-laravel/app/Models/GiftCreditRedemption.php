<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One use of a gift voucher, credit note or coupon on a bill. reversed_at is set when the bill is cancelled. */
class GiftCreditRedemption extends Model
{
    protected $fillable = ['store_id', 'gift_credit_id', 'pos_sale_id', 'amount', 'redeemed_on', 'reversed_at', 'created_by'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'redeemed_on' => 'date', 'reversed_at' => 'datetime'];
    }

    public function giftCredit(): BelongsTo
    {
        return $this->belongsTo(GiftCredit::class);
    }
}
