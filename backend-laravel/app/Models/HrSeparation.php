<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** An employee leaving: resignation, termination or retirement, its notice period and exit interview. */
class HrSeparation extends Model
{
    protected $fillable = ['store_id', 'employee_id', 'type', 'applied_on', 'reason', 'requested_last_day', 'last_working_day', 'notice_days', 'notice_short_days', 'notice_waived', 'status', 'applied_by', 'approver_user_id', 'decided_by', 'decided_at', 'decision_note', 'exit_interview', 'interviewed_by', 'interviewed_at', 'relieved_at'];

    protected function casts(): array
    {
        return ['applied_on' => 'date:Y-m-d', 'requested_last_day' => 'date:Y-m-d', 'last_working_day' => 'date:Y-m-d', 'notice_days' => 'integer', 'notice_short_days' => 'integer', 'notice_waived' => 'boolean', 'decided_at' => 'datetime', 'exit_interview' => 'array', 'interviewed_at' => 'datetime', 'relieved_at' => 'datetime'];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /** @return HasOne<HrSettlement, $this> */
    public function settlement(): HasOne
    {
        return $this->hasOne(HrSettlement::class, 'separation_id');
    }
}
