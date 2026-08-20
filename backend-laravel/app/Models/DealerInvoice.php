<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DealerInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'customer_id',
        'invoice_no',
        'invoice_date',
        'subtotal',
        'tax_amount',
        'grand_total',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'subtotal'     => 'decimal:2',
            'tax_amount'   => 'decimal:2',
            'grand_total'  => 'decimal:2',
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
        return $this->hasMany(DealerInvoiceItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
