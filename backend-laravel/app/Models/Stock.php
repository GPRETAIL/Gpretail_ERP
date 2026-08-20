<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'product_id',
        'variant_id',
        'quantity',
        'allocated_quantity',
        'available_quantity',
        'location_bin',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'allocated_quantity' => 'decimal:3',
            'available_quantity' => 'decimal:3',
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
}
