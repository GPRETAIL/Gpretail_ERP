<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'brand_id',
        'tax_id',
        'size_group_id',
        'name',
        'code',
        'sku',
        'barcode',
        'hsn_code',
        'unit',
        'cost_price',
        'selling_price',
        'mrp',
        'min_stock',
        'max_stock',
        'description',
        'image',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'mrp' => 'decimal:2',
            'min_stock' => 'integer',
            'max_stock' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
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
        return $this->belongsTo(Tax::class, 'tax_id');
    }

    public function salesTax()
    {
        return $this->belongsTo(Tax::class, 'tax_id');
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
