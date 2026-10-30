<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalLimit extends Model
{
    protected $fillable = ['store_id', 'role', 'max_discount_percent', 'max_refund_amount', 'allow_no_receipt_refund'];

    protected function casts(): array
    {
        return [
            'max_discount_percent' => 'float',
            'max_refund_amount' => 'float',
            'allow_no_receipt_refund' => 'boolean',
        ];
    }
}
