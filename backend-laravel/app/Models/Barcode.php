<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
            'mrp' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'discount_perc' => 'decimal:2',
            'final_price' => 'decimal:2',
            'printed_count' => 'integer',
            'jump_detail_index' => 'integer',
            'direct_purchase_id' => 'integer',
            'direct_purchase_item_id' => 'integer',
            'inventory_entry_id' => 'integer',
            'inventory_item_id' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<InventoryEntryItem, $this> */
    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryEntryItem::class, 'inventory_item_id');
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<ProductVariant, $this> */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    /** @return BelongsTo<DirectPurchase, $this> */
    public function directPurchase(): BelongsTo
    {
        return $this->belongsTo(DirectPurchase::class, 'direct_purchase_id');
    }

    /** @return BelongsTo<DirectPurchaseItem, $this> */
    public function directPurchaseItem(): BelongsTo
    {
        return $this->belongsTo(DirectPurchaseItem::class, 'direct_purchase_item_id');
    }
}
