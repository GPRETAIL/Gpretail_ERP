<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/** One double-entry voucher: its lines' debits equal their credits. source_type is null for a hand-entered one. */
class Voucher extends Model
{
    protected $fillable = ['store_id', 'voucher_type', 'voucher_no', 'voucher_date', 'source_type', 'source_id', 'reference_no', 'narration', 'amount', 'created_by'];

    protected static function booted(): void
    {
        static::creating(fn (self $voucher) => $voucher->uuid ??= (string) Str::uuid7());
    }

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    /** @return HasMany<VoucherLine, $this> */
    public function lines(): HasMany
    {
        return $this->hasMany(VoucherLine::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
