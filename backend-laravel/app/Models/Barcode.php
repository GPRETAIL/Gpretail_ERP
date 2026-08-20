<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Barcode extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'variant_id',
        'direct_purchase_id',
        'direct_purchase_item_id',
        'inventory_entry_id',
        'inventory_item_id',
        'jump_detail_index',
        'barcode',
        'batch_no',
        'mrp',
        'selling_price',
        'discount_perc',
        'final_price',
        'code_type',
        'product_name',
        'size',
        'design_no',
        'color_name',
        'printed_count',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'mrp'                     => 'decimal:2',
            'selling_price'           => 'decimal:2',
            'discount_perc'           => 'decimal:2',
            'final_price'             => 'decimal:2',
            'printed_count'           => 'integer',
            'jump_detail_index'       => 'integer',
            'direct_purchase_id'      => 'integer',
            'direct_purchase_item_id' => 'integer',
            'inventory_entry_id'      => 'integer',
            'inventory_item_id'       => 'integer',
            'is_active'               => 'boolean',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function directPurchase()
    {
        return $this->belongsTo(DirectPurchase::class, 'direct_purchase_id');
    }

    public function directPurchaseItem()
    {
        return $this->belongsTo(DirectPurchaseItem::class, 'direct_purchase_item_id');
    }
}
