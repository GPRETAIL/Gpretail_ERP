<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GrnItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'grn_id',
        'product_id',
        'variant_id',
        'received_qty',
        'accepted_qty',
        'rejected_qty',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'received_qty' => 'decimal:3',
            'accepted_qty' => 'decimal:3',
            'rejected_qty' => 'decimal:3',
        ];
    }

    public function grn()
    {
        return $this->belongsTo(Grn::class);
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
