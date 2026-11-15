<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use App\Models\Concerns\NumbersCodeFromId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    use HasFactory;
    use NumbersCodeFromId;

    /** A record saved without a code is numbered BR<id> (NumbersCodeFromId). */
    public const CODE_PREFIX = 'BR';

    use HasMasterDetails;

    protected $fillable = [
        'name',
        'code',
        'logo',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
