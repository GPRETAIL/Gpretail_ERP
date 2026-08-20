<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseInvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_invoice_id',
        'product_id',
        'variant_id',
        'quantity',
        'rate',
        'tax_id',
        'tax_amount',
        'discount',
        'total',
    ];

    protected function casts(): array
    {
        return [
            'quantity'   => 'decimal:3',
            'rate'       => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'discount'   => 'decimal:2',
            'total'      => 'decimal:2',
        ];
    }

    public function purchaseInvoice()
    {
        return $this->belongsTo(PurchaseInvoice::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function tax()
    {
        return $this->belongsTo(Tax::class);
    }
}
