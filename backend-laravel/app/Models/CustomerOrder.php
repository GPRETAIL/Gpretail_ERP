<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'customer_id',
        'order_no',
        'order_date',
        'delivery_date',
        'total_amount',
        'advance_paid',
        'balance_due',
        'status',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'order_date'    => 'date',
            'delivery_date' => 'date',
            'total_amount'  => 'decimal:2',
            'advance_paid'  => 'decimal:2',
            'balance_due'   => 'decimal:2',
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
        return $this->hasMany(CustomerOrderItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
