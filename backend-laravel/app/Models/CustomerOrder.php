<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** @property numeric-string $discount_amount */
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
            'order_date' => 'date',
            'delivery_date' => 'date',
            'total_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'advance_paid' => 'decimal:2',
            'balance_due' => 'decimal:2',
            'payments' => 'array',
        ];
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return BelongsTo<Supplier, $this> */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /** @return BelongsTo<Employee, $this> */
    public function salesman(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'salesman_id');
    }

    /** @return HasMany<CustomerOrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(CustomerOrderItem::class);
    }

    /** @return HasMany<CustomerOrderCommunication, $this> */
    public function communications(): HasMany
    {
        return $this->hasMany(CustomerOrderCommunication::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
