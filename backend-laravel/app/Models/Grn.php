<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Grn extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'supplier_id',
        'purchase_invoice_id',
        'grn_no',
        'grn_date',
        'status',
        'notes',
        'received_by',
    ];

    protected function casts(): array
    {
        return [
            'grn_date' => 'date',
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
        return $this->hasMany(GrnItem::class);
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
