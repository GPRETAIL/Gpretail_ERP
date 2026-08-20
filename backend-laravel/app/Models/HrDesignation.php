<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HrDesignation extends Model
{
    use HasFactory;

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

    public function department()
    {
        return $this->belongsTo(HrDepartment::class, 'department_id');
    }

    public function employees()
    {
        return $this->hasMany(Employee::class, 'designation_id');
    }
}
