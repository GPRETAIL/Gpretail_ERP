<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosReturnItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'pos_return_id',
        'product_id',
        'variant_id',
        'barcode_id',
        'quantity',
        'refund_price',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'cost_price',
        'discount',
    ];

    protected function casts(): array
    {
        return [
            'quantity'     => 'decimal:3',
            'refund_price' => 'decimal:2',
            'subtotal'     => 'decimal:2',
            'tax_rate'     => 'decimal:2',
            'tax_amount'   => 'decimal:2',
            'cost_price'   => 'decimal:2',
            'discount'     => 'decimal:2',
        ];
    }

    public function posReturn()
    {
        return $this->belongsTo(PosReturn::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function barcode()
    {
        return $this->belongsTo(Barcode::class, 'barcode_id');
    }
}
