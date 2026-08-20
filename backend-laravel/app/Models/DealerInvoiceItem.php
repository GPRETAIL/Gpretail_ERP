<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DealerInvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'dealer_invoice_id',
        'product_id',
        'quantity',
        'price',
        'tax_amount',
        'total',
    ];

    protected function casts(): array
    {
        return [
            'quantity'   => 'decimal:3',
            'price'      => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total'      => 'decimal:2',
        ];
    }

    public function dealerInvoice()
    {
        return $this->belongsTo(DealerInvoice::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
