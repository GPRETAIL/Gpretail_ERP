<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosSaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'pos_sale_id',
        'product_id',
        'variant_id',
        'quantity',
        'unit_mrp',
        'selling_price',
        'discount',
        'tax_rate',
        'tax_amount',
        'subtotal',
        'tax_name',
        'tax_type',
        'cost_price',
        'sales_man_id',
        'sales_man_name',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'unit_mrp' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'cost_price' => 'decimal:2',
        ];
    }

    public function posSale()
    {
        return $this->belongsTo(PosSale::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
