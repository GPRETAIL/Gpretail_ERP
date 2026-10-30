<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'pos_sale_id',
        'customer_id',
        'return_no',
        'return_date',
        'total_refund',
        'refund_mode',
        'status',
        'created_by',
        'return_reason_id',
        'return_reason_name',
        'standalone',
        'credit_applied_to_sale_id',
        'credit_applied_at',
    ];

    protected function casts(): array
    {
        return [
            'return_date' => 'datetime',
            'total_refund' => 'decimal:2',
            'standalone' => 'boolean',
            'credit_applied_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<PosSale, $this> */
    public function appliedToSale(): BelongsTo
    {
        return $this->belongsTo(PosSale::class, 'credit_applied_to_sale_id');
    }

    /** @return BelongsTo<PosSale, $this> */
    public function posSale(): BelongsTo
    {
        return $this->belongsTo(PosSale::class);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return HasMany<PosReturnItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(PosReturnItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
