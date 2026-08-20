<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PhysicalStockItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'physical_stock_id',
        'product_id',
        'variant_id',
        'system_qty',
        'counted_qty',
        'difference_qty',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'system_qty'     => 'decimal:3',
            'counted_qty'    => 'decimal:3',
            'difference_qty' => 'decimal:3',
        ];
    }

    public function physicalStock()
    {
        return $this->belongsTo(PhysicalStock::class);
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
