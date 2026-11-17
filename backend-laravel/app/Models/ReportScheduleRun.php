<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Settings > Scheduler > Delivery Log: one sending of a scheduled report. */
class ReportScheduleRun extends Model
{
    protected $fillable = ['report_schedule_id', 'store_id', 'trigger', 'period_from', 'period_to', 'status', 'rows', 'recipients',
        'skipped_recipients', 'files', 'error', 'triggered_by', 'started_at', 'finished_at'];

    protected function casts(): array
    {
        return ['recipients' => 'array', 'skipped_recipients' => 'array', 'files' => 'array', 'period_from' => 'date', 'period_to' => 'date',
            'started_at' => 'datetime', 'finished_at' => 'datetime'];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(ReportSchedule::class, 'report_schedule_id');
    }
}
