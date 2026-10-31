<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        's_no',
        'size',
        'design_no',
        'master_details',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'unit_price' => 'decimal:2',
            'total_price' => 'decimal:2',
            'master_details' => 'array',
        ];
    }

    /** Pricing columns of a warehouse row (cost, MRP, selling/final price...) are read flat. */
    public function attributesToArray(): array
    {
        $data = parent::attributesToArray();
        $details = $data['master_details'] ?? [];
        unset($data['master_details']);

        return array_replace(is_array($details) ? $details : [], $data);
    }

    /** @return BelongsTo<InventoryEntry, $this> */
    public function inventoryEntry(): BelongsTo
    {
        return $this->belongsTo(InventoryEntry::class);
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
}
