<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'department_id',
        'designation_id',
        'name',
        'code',
        'email',
        'phone',
        'address',
        'salary',
        'joining_date',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'salary'       => 'decimal:2',
            'joining_date' => 'date',
            'is_active'    => 'boolean',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function department()
    {
        return $this->belongsTo(HrDepartment::class, 'department_id');
    }

    public function designation()
    {
        return $this->belongsTo(HrDesignation::class, 'designation_id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }
}
