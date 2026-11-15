<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use App\Models\Concerns\NumbersCodeFromId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HrDepartment extends Model
{
    use HasFactory;
    use NumbersCodeFromId;

    /** A record saved without a code is numbered DEPT<id> (NumbersCodeFromId). */
    public const CODE_PREFIX = 'DEPT';

    use HasMasterDetails;

    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
        'configuration_type',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<HrDesignation, $this> */
    public function designations(): HasMany
    {
        return $this->hasMany(HrDesignation::class, 'department_id');
    }

    public function getLocationIdAttribute($value)
    {
        return $value ?? ($this->master_details['location_id'] ?? null);
    }

    /** @return BelongsTo<SystemConfiguration, $this> */
    public function location(): BelongsTo
    {
        return $this->belongsTo(SystemConfiguration::class);
    }

    /** @return HasMany<Employee, $this> */
    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class, 'department_id');
    }
}
