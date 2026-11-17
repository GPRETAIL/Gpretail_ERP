<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Who a scheduled report goes to: a user (id), a role (name), a recipient group (id) or an outside email address. */
class ReportScheduleRecipient extends Model
{
    protected $fillable = ['report_schedule_id', 'type', 'value'];
}
