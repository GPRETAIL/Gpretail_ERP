<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'product_id',
        'variant_id',
        'reference_type',
        'reference_id',
        'type',
        'quantity',
        'before_qty',
        'after_qty',
        'cost_price',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'quantity'   => 'decimal:3',
            'before_qty' => 'decimal:3',
            'after_qty'  => 'decimal:3',
            'cost_price' => 'decimal:2',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
