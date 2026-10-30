<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SizeGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'company_id',
        'name',
        'code',
        'description',
        'is_active',
        'created_by',
        'updated_by',
        'sort_order',
        'enable_size_ratio',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<Size, $this> */
    public function sizes(): HasMany
    {
        return $this->hasMany(Size::class)->orderBy('sort_order');
    }
}
