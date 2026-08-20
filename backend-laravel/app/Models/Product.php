<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'cost_price'                => 'decimal:2',
            'selling_price'             => 'decimal:2',
            'mrp'                       => 'decimal:2',
            'discount_mode_value'       => 'decimal:2',
            'margin_min'                => 'decimal:2',
            'margin_max'                => 'decimal:2',
            'cess_value'                => 'decimal:2',
            'min_stock'                 => 'integer',
            'max_stock'                 => 'integer',
            'is_active'                 => 'boolean',
            'dumping'                   => 'boolean',
            'cess'                      => 'boolean',
            'daily_price'               => 'boolean',
            'is_core'                   => 'boolean',
            'exclude_reward'            => 'boolean',
            'auto_po'                   => 'boolean',
            'purchase_entry_attributes' => 'array',
        ];
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function productGroup()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function tax()
    {
        return $this->belongsTo(Tax::class);
    }

    public function purchaseTax()
    {
        return $this->belongsTo(Tax::class, 'purchase_tax_id');
    }

    public function salesTax()
    {
        return $this->belongsTo(Tax::class, 'sales_tax_id');
    }

    public function sizeGroup()
    {
        return $this->belongsTo(SizeGroup::class, 'size_group_id');
    }

    public function getTaxPercentageAttribute(): float
    {
        return (float) ($this->tax?->rate ?? 0);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function stocks()
    {
        return $this->hasMany(Stock::class);
    }
}
