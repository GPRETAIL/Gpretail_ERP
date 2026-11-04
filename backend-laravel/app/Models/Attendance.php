<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'date',
        'check_in',
        'check_out',
        'status',
        'store_id',
        'late_minutes',
        'early_exit_minutes',
        'worked_minutes',
        'source',
        'leave_application_id',
        'remarks',
        'ot_minutes',
        'ot_approved_minutes',
        'ot_status',
        'ot_decided_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'late_minutes' => 'integer',
            'early_exit_minutes' => 'integer',
            'worked_minutes' => 'integer',
            'ot_minutes' => 'integer',
        ];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
