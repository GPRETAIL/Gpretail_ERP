<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttributeValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'company_id',
        'attribute_type_id',
        'name',
        'value',
        'code',
        'sort_order',
        'extra_data',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'extra_data' => 'array',
        ];
    }

    /** @return BelongsTo<AttributeType, $this> */
    public function attributeType(): BelongsTo
    {
        return $this->belongsTo(AttributeType::class);
    }
}
