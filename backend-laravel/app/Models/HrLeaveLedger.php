<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One leave credit (+) or debit (−). The balance for a year is the sum. */
class HrLeaveLedger extends Model
{
    protected $table = 'hr_leave_ledger';

    protected $fillable = ['store_id', 'employee_id', 'leave_type_id', 'year', 'days', 'kind', 'leave_application_id', 'note', 'created_by'];

    protected function casts(): array
    {
        return ['days' => 'float', 'year' => 'integer'];
    }
}
