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
        'supplier_id',
        'salesman_id',
        'counter_id',
        'location_id',
        'city_id',
        'order_no',
        'order_date',
        'delivery_date',
        'total_amount',
        'discount_amount',
        'net_amount',
        'advance_paid',
        'balance_due',
        'payments',
        'status',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'order_date'      => 'date',
            'delivery_date'   => 'date',
            'total_amount'    => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'net_amount'      => 'decimal:2',
            'advance_paid'    => 'decimal:2',
            'balance_due'     => 'decimal:2',
            'payments'        => 'array',
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

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function salesman()
    {
        return $this->belongsTo(Employee::class, 'salesman_id');
    }

    public function items()
    {
        return $this->hasMany(CustomerOrderItem::class);
    }

    public function communications()
    {
        return $this->hasMany(CustomerOrderCommunication::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
