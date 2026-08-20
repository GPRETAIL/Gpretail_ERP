<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_order_id',
        'product_id',
        'quantity',
        'price',
        'tax_amount',
        'total',
    ];

    protected function casts(): array
    {
        return [
            'quantity'   => 'decimal:3',
            'price'      => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total'      => 'decimal:2',
        ];
    }

    public function customerOrder()
    {
        return $this->belongsTo(CustomerOrder::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
