<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryEntryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_entry_id',
        'product_id',
        'variant_id',
        'quantity',
        'unit_price',
        'total_price',
    ];

    protected function casts(): array
    {
        return [
            'quantity'    => 'decimal:3',
            'unit_price'  => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    public function inventoryEntry()
    {
        return $this->belongsTo(InventoryEntry::class);
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
