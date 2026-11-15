<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use App\Models\Concerns\NumbersCodeFromId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HrDesignation extends Model
{
    use HasFactory;
    use NumbersCodeFromId;

    /** A record saved without a code is numbered DES<id> (NumbersCodeFromId). */
    public const CODE_PREFIX = 'DES';

    use HasMasterDetails;

    protected $fillable = [
        'department_id',
        'name',
        'code',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<HrDepartment, $this> */
    public function department(): BelongsTo
    {
        return $this->belongsTo(HrDepartment::class, 'department_id');
    }

    /** @return HasMany<Employee, $this> */
    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class, 'designation_id');
    }

    public function getRoleIdAttribute($value)
    {
        return $value ?? ($this->master_details['role_id'] ?? null);
    }

    /** @return BelongsTo<HrDepartment, $this> */
    public function role(): BelongsTo
    {
        return $this->belongsTo(HrDepartment::class, 'role_id');
    }
}
