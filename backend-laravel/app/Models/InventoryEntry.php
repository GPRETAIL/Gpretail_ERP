<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'entry_no',
        'entry_date',
        'type',
        'total_amount',
        'notes',
        'status',
        'created_by',
        // Warehouse (LR) intake: the form's header lives in master_details, links are real columns.
        'transport_entry_id',
        'invoice_id',
        'supplier_id',
        'product_id',
        'brand_id',
        'pattern_id',
        'style_id',
        'fit_id',
        'sleeve_id',
        'type_id',
        'material_id',
        'color_id',
        'tax_id',
        'master_details',
    ];

    protected function casts(): array
    {
        return [
            'entry_date' => 'date',
            'total_amount' => 'decimal:2',
            'master_details' => 'array',
        ];
    }

    /** The warehouse form reads its header fields flat, like other master_details models. */
    public function attributesToArray(): array
    {
        $data = parent::attributesToArray();
        $details = $data['master_details'] ?? [];
        unset($data['master_details']);

        return array_replace(is_array($details) ? $details : [], $data);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<Brand, $this> */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /** @return BelongsTo<Supplier, $this> */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /** @return BelongsTo<AttributeValue, $this> */
    public function pattern(): BelongsTo
    {
        return $this->belongsTo(AttributeValue::class, 'pattern_id');
    }

    /** @return BelongsTo<AttributeValue, $this> */
    public function style(): BelongsTo
    {
        return $this->belongsTo(AttributeValue::class, 'style_id');
    }

    /** @return BelongsTo<AttributeValue, $this> */
    public function fit(): BelongsTo
    {
        return $this->belongsTo(AttributeValue::class, 'fit_id');
    }

    /** @return BelongsTo<AttributeValue, $this> */
    public function sleeve(): BelongsTo
    {
        return $this->belongsTo(AttributeValue::class, 'sleeve_id');
    }

    /** @return BelongsTo<AttributeValue, $this> */
    public function type(): BelongsTo
    {
        return $this->belongsTo(AttributeValue::class, 'type_id');
    }

    /** @return BelongsTo<AttributeValue, $this> */
    public function material(): BelongsTo
    {
        return $this->belongsTo(AttributeValue::class, 'material_id');
    }

    /** @return BelongsTo<AttributeValue, $this> */
    public function color(): BelongsTo
    {
        return $this->belongsTo(AttributeValue::class, 'color_id');
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return HasMany<InventoryEntryItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(InventoryEntryItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
