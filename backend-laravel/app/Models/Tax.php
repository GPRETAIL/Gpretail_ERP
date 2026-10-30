<?php

namespace App\Models;

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
