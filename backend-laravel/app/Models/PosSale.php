<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosSale extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'cash_session_id',
        'customer_id',
        'user_id',
        'invoice_no',
        'sale_date',
        'total_items',
        'total_qty',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'round_off',
        'grand_total',
        'paid_amount',
        'change_amount',
        'payment_mode',
        'status',
        'is_credit',
        'igst',
        'place_of_supply_state_id',
        'applied_pos_return_id',
    ];

    protected function casts(): array
    {
        return [
            'sale_date' => 'datetime',
            'total_items' => 'integer',
            'total_qty' => 'decimal:3',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'round_off' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'change_amount' => 'decimal:2',
            'is_credit' => 'boolean',
            'igst' => 'boolean',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function appliedReturn()
    {
        return $this->belongsTo(PosReturn::class, 'applied_pos_return_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(PosSaleItem::class);
    }

    public function payments()
    {
        return $this->hasMany(PosPayment::class);
    }
}
