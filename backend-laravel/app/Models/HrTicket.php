<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A question or problem an employee raises with HR from the staff app. */
class HrTicket extends Model
{
    public const CATEGORIES = ['PAYROLL' => 'Salary and payslip', 'LEAVE' => 'Leave', 'ATTENDANCE' => 'Attendance', 'DOCUMENTS' => 'Documents', 'OTHER' => 'Something else'];

    protected $fillable = ['store_id', 'employee_id', 'category', 'subject', 'message', 'status', 'last_reply_at', 'closed_at', 'closed_by'];

    protected function casts(): array
    {
        return ['last_reply_at' => 'datetime', 'closed_at' => 'datetime'];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function replies(): HasMany
    {
        return $this->hasMany(HrTicketReply::class, 'ticket_id')->orderBy('id');
    }
}
