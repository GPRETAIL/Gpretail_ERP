<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupplierPaymentItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_payment_id',
        'purchase_invoice_id',
        'amount_paid',
    ];

    protected function casts(): array
    {
        return [
            'amount_paid' => 'decimal:2',
        ];
    }

    public function supplierPayment()
    {
        return $this->belongsTo(SupplierPayment::class);
    }

    public function purchaseInvoice()
    {
        return $this->belongsTo(PurchaseInvoice::class);
    }
}
