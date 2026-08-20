<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockOutwardItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_outward_id',
        'product_id',
        'variant_id',
        'quantity',
        'unit_price',
    ];

    protected function casts(): array
    {
        return [
            'quantity'   => 'decimal:3',
            'unit_price' => 'decimal:2',
        ];
    }

    public function stockOutward()
    {
        return $this->belongsTo(StockOutward::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
