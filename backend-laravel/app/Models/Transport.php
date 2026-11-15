<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use App\Models\Concerns\NumbersCodeFromId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transport extends Model
{
    use HasFactory;
    use NumbersCodeFromId;

    /** A record saved without a code is numbered TRP<id> (NumbersCodeFromId). */
    public const CODE_PREFIX = 'TRP';

    use HasMasterDetails;

    protected $fillable = ['store_id',
        'name',
        'code',
        'phone',
        'vehicle_no',
        'contact_person',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<TransportEntry, $this> */
    public function transportEntries(): HasMany
    {
        return $this->hasMany(TransportEntry::class);
    }
}
