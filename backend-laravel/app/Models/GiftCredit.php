<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A gift voucher, credit note or coupon: a numbered amount with a balance and an expiry that a bill can use as a payment. */
class GiftCredit extends Model
{
    public const GIFT_VOUCHER = 'GIFT_VOUCHER';

    public const CREDIT_NOTE = 'CREDIT_NOTE';

    public const COUPON = 'COUPON';

    public const KINDS = [self::GIFT_VOUCHER, self::CREDIT_NOTE, self::COUPON];

    protected $fillable = ['store_id', 'kind', 'number', 'customer_id', 'source_pos_return_id', 'source_pos_sale_id', 'issued_on', 'expires_on',
        'original_amount', 'balance', 'min_bill_amount', 'status', 'created_by'];

    protected function casts(): array
    {
        return ['issued_on' => 'date', 'expires_on' => 'date', 'original_amount' => 'decimal:2', 'balance' => 'decimal:2', 'min_bill_amount' => 'decimal:2'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(GiftCreditRedemption::class);
    }

    /** ACTIVE, USED, EXPIRED or CANCELLED. Expiry is worked out here from the date, never stored. */
    public function getStateAttribute(): string
    {
        if ($this->status === 'ACTIVE' && $this->expires_on && $this->expires_on->endOfDay()->isPast()) {
            return 'EXPIRED';
        }

        return $this->status;
    }
}
