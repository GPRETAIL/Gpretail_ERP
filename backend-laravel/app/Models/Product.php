<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property array<string, mixed>|null $master_details
 */
class Product extends Model
{
    use HasFactory;
    use HasMasterDetails;

    protected $fillable = [
        'store_id',
        'company_id',
        'category_id',
        'brand_id',
        'tax_id',
        'purchase_tax_id',
        'sales_tax_id',
        'size_group_id',
        'name',
        'code',
        'sku',
        'barcode',
        'hsn_code',
        'unit',
        'type',
        'section',
        'selling_mode',
        'pack_size',
        'barcode_mode',
        'barcode_source',
        'discount_mode',
        'discount_mode_value',
        'margin_min',
        'margin_max',
        'stock_holding_period',
        'purchase_plan_mode',
        'expected_gender',
        'dumping',
        'dumping_value',
        'cess',
        'cess_value',
        'daily_price',
        'daily_price_value',
        'is_core',
        'is_core_value',
        'exclude_reward',
        'auto_po',
        'auto_po_value',
        'purchase_entry_attributes',
        'cost_price',
        'selling_price',
        'mrp',
        'min_stock',
        'max_stock',
        'description',
        'image',
        'is_active',
        'created_by',
        'updated_by',
        'parent_product_id',
    ];

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'mrp' => 'decimal:2',
            'discount_mode_value' => 'decimal:2',
            'margin_min' => 'decimal:2',
            'margin_max' => 'decimal:2',
            'cess_value' => 'decimal:2',
            'min_stock' => 'integer',
            'max_stock' => 'integer',
            'is_active' => 'boolean',
            'dumping' => 'boolean',
            'cess' => 'boolean',
            'daily_price' => 'boolean',
            'is_core' => 'boolean',
            'exclude_reward' => 'boolean',
            'auto_po' => 'boolean',
            'purchase_entry_attributes' => 'array',
        ];
    }

    /** @return BelongsTo<self, $this> */
    public function itemProduct(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_product_id');
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return BelongsTo<Category, $this> */
    public function productGroup(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /** @return BelongsTo<Brand, $this> */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /** @return BelongsTo<Tax, $this> */
    public function tax(): BelongsTo
    {
        return $this->belongsTo(Tax::class);
    }

    /** @return BelongsTo<Tax, $this> */
    public function purchaseTax(): BelongsTo
    {
        return $this->belongsTo(Tax::class, 'purchase_tax_id');
    }

    /** @return BelongsTo<Tax, $this> */
    public function salesTax(): BelongsTo
    {
        return $this->belongsTo(Tax::class, 'sales_tax_id');
    }

    /** @return BelongsTo<SizeGroup, $this> */
    public function sizeGroup(): BelongsTo
    {
        return $this->belongsTo(SizeGroup::class, 'size_group_id');
    }

    /** @return BelongsTo<Store, $this> */
    public function companyRef(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'company_id');
    }

    public function getSizeIdAttribute($value)
    {
        return $value ?? ($this->master_details['size_id'] ?? null);
    }

    /** @return BelongsTo<Size, $this> */
    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }

    public function getTaxPercentageAttribute(): float
    {
        return (float) ($this->tax->rate ?? 0);
    }

    /** @return HasMany<ProductVariant, $this> */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /** @return HasMany<Stock, $this> */
    public function stocks(): HasMany
    {
        return $this->hasMany(Stock::class);
    }
}
