<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Settings > Scheduler: one report emailed on a schedule to its recipients. */
class ReportSchedule extends Model
{
    public const FREQUENCIES = ['daily', 'weekly', 'monthly'];

    public const FORMATS = ['xlsx', 'pdf'];

    public const RECIPIENT_TYPES = ['user', 'role', 'group', 'email'];

    protected $fillable = ['store_id', 'name', 'report_key', 'params', 'period', 'frequency', 'send_time', 'day_of_week', 'day_of_month', 'formats',
        'subject', 'message', 'skip_empty', 'is_active', 'next_run_at', 'last_run_at', 'last_status', 'created_by'];

    protected function casts(): array
    {
        return ['params' => 'array', 'formats' => 'array', 'skip_empty' => 'boolean', 'is_active' => 'boolean',
            'next_run_at' => 'datetime', 'last_run_at' => 'datetime', 'day_of_week' => 'integer', 'day_of_month' => 'integer'];
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(ReportScheduleRecipient::class);
    }

    public function runs(): HasMany
    {
        return $this->hasMany(ReportScheduleRun::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
