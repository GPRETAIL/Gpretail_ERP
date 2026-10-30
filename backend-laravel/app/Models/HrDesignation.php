<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HrDesignation extends Model
{
    use HasFactory;
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
