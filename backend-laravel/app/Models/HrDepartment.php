<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HrDepartment extends Model
{
    use HasFactory;
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

    public function designations()
    {
        return $this->hasMany(HrDesignation::class, 'department_id');
    }

    public function getLocationIdAttribute($value)
    {
        return $value ?? ($this->master_details['location_id'] ?? null);
    }

    public function location()
    {
        return $this->belongsTo(SystemConfiguration::class);
    }

    public function employees()
    {
        return $this->hasMany(Employee::class, 'department_id');
    }
}
