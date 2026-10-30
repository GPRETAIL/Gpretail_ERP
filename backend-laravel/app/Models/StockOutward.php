<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockOutward extends Model
{
    use HasFactory;

    protected $fillable = [
        'source_store_id',
        'target_store_id',
        'outward_no',
        'outward_date',
        'status',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'outward_date' => 'date',
        ];
    }

    /** @return BelongsTo<Store, $this> */
    public function sourceStore(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'source_store_id');
    }

    /** @return BelongsTo<Store, $this> */
    public function targetStore(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'target_store_id');
    }

    /** @return HasMany<StockOutwardItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(StockOutwardItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
