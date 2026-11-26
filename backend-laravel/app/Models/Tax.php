<?php

namespace App\Models;

use App\Models\Concerns\NumbersCodeFromId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string|null $created_by
 * @property int|null $store_id
 */
class Tax extends Model
{
    use HasFactory;
    use NumbersCodeFromId;

    /** A record saved without a code is numbered TAX<id> (NumbersCodeFromId). */
    public const CODE_PREFIX = 'TAX';

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->created_by = auth()->user()->name ?? auth()->user()?->username;
        });
    }

    protected $fillable = ['store_id',
        'is_sales_tax', 'is_purchase_tax', 'extra_fields',
        'name',
        'code',
        'rate',
        'type',
        'cgst_rate',
        'sgst_rate',
        'igst_rate',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_sales_tax' => 'boolean', 'is_purchase_tax' => 'boolean', 'extra_fields' => 'array',
            'rate' => 'decimal:2',
            'cgst_rate' => 'decimal:2',
            'sgst_rate' => 'decimal:2',
            'igst_rate' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * The tax rate (in percent) for an item sold at this unit price. A Ranged GST tax takes its rate from the price band the
     * price falls in (a band with no upper price covers everything above its start); any other tax is one flat rate.
     */
    public function rateForPrice(float $price): float
    {
        if (strtoupper((string) $this->type) !== 'RGST') {
            return (float) $this->rate;
        }

        $band = collect($this->extra_fields['rangedtable'] ?? [])
            ->filter(fn ($row) => is_array($row)
                && ((float) ($row['taxPercentage'] ?? 0) > 0 || (float) ($row['to'] ?? 0) > 0)
                && $price >= (float) ($row['from'] ?? 0)
                && ((float) ($row['to'] ?? 0) <= 0 || $price <= (float) $row['to']))
            ->sortByDesc(fn ($row) => (float) ($row['from'] ?? 0))
            ->first();

        return $band ? (float) ($band['taxPercentage'] ?? 0) : (float) $this->rate;
    }

    /** @return HasMany<TaxSlab, $this> */
    public function slabs(): HasMany
    {
        return $this->hasMany(TaxSlab::class);
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
