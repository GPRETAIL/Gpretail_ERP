<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HrDepartment extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
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

    public function employees()
    {
        return $this->hasMany(Employee::class, 'department_id');
    }
}
