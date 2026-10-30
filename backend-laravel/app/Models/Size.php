<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Size extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'company_id',
        'size_group_id',
        'name',
        'code',
        'sort_order',
        'created_by',
        'updated_by',
        'measurement',
        'age_set',
        'uom',
        'is_combo_size',
        'is_meter_size',
        'is_variant',
        'is_active',
    ];

    /** @return BelongsTo<SizeGroup, $this> */
    public function sizeGroup(): BelongsTo
    {
        return $this->belongsTo(SizeGroup::class);
    }

    /** @return HasMany<ProductVariant, $this> */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }
}
