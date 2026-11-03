<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HrLeavePolicyItem extends Model
{
    protected $fillable = ['policy_id', 'leave_type_id', 'days_per_year'];

    protected function casts(): array
    {
        return ['days_per_year' => 'float'];
    }

    /** @return BelongsTo<HrLeaveType, $this> */
    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(HrLeaveType::class);
    }
}
