<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'supplier_id',
        'purchase_invoice_id',
        'return_no',
        'return_date',
        'total_amount',
        'reason',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'return_date'  => 'date',
            'total_amount' => 'decimal:2',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseInvoice()
    {
        return $this->belongsTo(PurchaseInvoice::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseReturnItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
