<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'sku',
        'barcode',
        'size_id',
        'brand_id',
        'color_id',
        'design_no',
        'cost_price',
        'selling_price',
        'mrp',
    ];

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'mrp' => 'decimal:2',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function size()
    {
        return $this->belongsTo(Size::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function barcodes()
    {
        return $this->hasMany(Barcode::class, 'variant_id');
    }

    public function stock()
    {
        return $this->hasMany(Stock::class, 'variant_id');
    }

    public function batches()
    {
        return $this->hasMany(StockBatch::class, 'variant_id');
    }
}
