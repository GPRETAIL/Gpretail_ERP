<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashRegisterSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'user_id',
        'opened_at',
        'closed_at',
        'opening_cash',
        'closing_cash',
        'expected_cash',
        'difference',
        'status',
        'notes',
        'counter_id',
        'location_id',
        'paid_by_employee_id',
        'cashier_employee_id',
        'received_by_employee_id',
        'opening_denominations',
        'closing_denominations',
        'counter_expenses',
        'cash_sales',
        'cash_refunds',
        'closing_no',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'opening_cash' => 'decimal:2',
            'closing_cash' => 'decimal:2',
            'expected_cash' => 'decimal:2',
            'difference' => 'decimal:2',
            'opening_denominations' => 'array',
            'closing_denominations' => 'array',
            'counter_expenses' => 'decimal:2',
            'cash_sales' => 'decimal:2',
            'cash_refunds' => 'decimal:2',
            'closing_no' => 'integer',
        ];
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<SystemConfiguration, $this> */
    public function counter(): BelongsTo
    {
        return $this->belongsTo(SystemConfiguration::class, 'counter_id');
    }

    /** @return BelongsTo<SystemConfiguration, $this> */
    public function location(): BelongsTo
    {
        return $this->belongsTo(SystemConfiguration::class, 'location_id');
    }

    /** @return BelongsTo<Employee, $this> */
    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'paid_by_employee_id');
    }

    /** @return BelongsTo<Employee, $this> */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'cashier_employee_id');
    }

    /** @return BelongsTo<Employee, $this> */
    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'received_by_employee_id');
    }

    /** @return HasMany<PosSale, $this> */
    public function sales(): HasMany
    {
        return $this->hasMany(PosSale::class, 'cash_session_id');
    }
}
