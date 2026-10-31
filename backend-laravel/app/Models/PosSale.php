<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosSale extends Model
{
    use HasFactory;

    protected $appends = ['bill_no', 'net_amount', 'remaining_amount', 'settlement_amount', 'customer_name', 'settlement_no', 'user_name', 'sale_type', 'amount'];

    public function getBillNoAttribute(): string
    {
        $number = (string) $this->invoice_no;

        // 261031-0001 (normal), 261031-C0001 (cloud failover), 261031-F2-0001 (counter 2, billed offline).
        return preg_match('/^INV-.+-(\d{8})-(C?\d+|F\d+-\d+)$/', $number, $parts)
            ? substr($parts[1], 2).'-'.$parts[2] : $number;
    }

    public function getSaleTypeAttribute(): string
    {
        return $this->is_credit ? 'Credit' : 'POS Sale';
    }

    public function getAmountAttribute(): float
    {
        return (float) $this->grand_total;
    }

    public function scopeBillNumber($query, string $number)
    {
        $number = trim($number);

        return $query->where(function ($query) use ($number) {
            $query->where('invoice_no', $number);
            if (preg_match('/^(\d{6})-(C?\d+|F\d+-\d+)$/i', $number, $parts)) {
                $query->orWhere('invoice_no', 'like', '%-20'.$parts[1].'-'.strtoupper($parts[2]));
            } elseif (preg_match('/^(?:SB\/)?(\d+)$/i', $number, $parts)) {
                $query->orWhere('id', (int) $parts[1]);
            }
        });
    }

    public function getNetAmountAttribute(): float
    {
        return (float) $this->grand_total;
    }

    public function getRemainingAmountAttribute(): float
    {
        return round(max(0, (float) $this->grand_total - (float) $this->paid_amount - (float) ($this->appliedReturn->total_refund ?? 0)), 2);
    }

    public function getSettlementAmountAttribute(): float
    {
        return $this->remaining_amount;
    }

    public function getCustomerNameAttribute(): string
    {
        return $this->customer->name ?? 'Walk-in Customer';
    }

    protected $fillable = [
        'store_id',
        'counter_id',
        'counter_name',
        'settlement_id',
        'cash_session_id',
        'customer_id',
        'user_id',
        'invoice_no',
        'sale_date',
        'total_items',
        'total_qty',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'round_off',
        'grand_total',
        'paid_amount',
        'change_amount',
        'payment_mode',
        'status',
        'is_credit',
        'igst',
        'place_of_supply_state_id',
        'applied_pos_return_id',
        'offline_billed_at',
        'sync_review',
    ];

    protected function casts(): array
    {
        return [
            'sale_date' => 'datetime',
            'offline_billed_at' => 'datetime',
            'sync_review' => 'array',
            'sync_reviewed_at' => 'datetime',
            'total_items' => 'integer',
            'total_qty' => 'decimal:3',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'round_off' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'change_amount' => 'decimal:2',
            'is_credit' => 'boolean',
            'igst' => 'boolean',
        ];
    }

    public function getSettlementNoAttribute(): ?string
    {
        return $this->settlement?->batch_no;
    }

    public function getUserNameAttribute(): ?string
    {
        return $this->user?->name;
    }

    /** @return BelongsTo<Settlement, $this> */
    public function settlement(): BelongsTo
    {
        return $this->belongsTo(Settlement::class);
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<PosReturn, $this> */
    public function appliedReturn(): BelongsTo
    {
        return $this->belongsTo(PosReturn::class, 'applied_pos_return_id');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return HasMany<PosSaleItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(PosSaleItem::class);
    }

    /** @return HasMany<PosPayment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(PosPayment::class);
    }
}
