<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transport extends Model
{
    use HasFactory;
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
