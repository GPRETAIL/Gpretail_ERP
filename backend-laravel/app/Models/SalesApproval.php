<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesApproval extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'customer_id',
        'approval_no',
        'approval_date',
        'valid_until',
        'total_amount',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'approval_date' => 'date',
            'valid_until'   => 'date',
            'total_amount'  => 'decimal:2',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(SalesApprovalItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
