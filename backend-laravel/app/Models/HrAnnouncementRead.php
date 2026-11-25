<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One employee's reading (and, for a policy, agreeing to) one announcement. */
class HrAnnouncementRead extends Model
{
    protected $fillable = ['store_id', 'announcement_id', 'employee_id', 'read_at', 'acknowledged_at'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime', 'acknowledged_at' => 'datetime'];
    }
}
