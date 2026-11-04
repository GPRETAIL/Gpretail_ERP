<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One recovery of a loan: from a payslip, or repaid by hand. */
class HrLoanRecovery extends Model
{
    protected $fillable = ['store_id', 'loan_id', 'month', 'amount', 'kind', 'payslip_id', 'settlement_id', 'paid_on', 'pay_mode', 'note', 'created_by'];

    protected function casts(): array
    {
        return ['amount' => 'float', 'paid_on' => 'date:Y-m-d'];
    }
}
