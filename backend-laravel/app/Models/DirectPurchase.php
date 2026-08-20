<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DirectPurchase extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'company_id',
        'company_name',
        'supplier_id',
        'supplier_name',
        'purchase_no',
        'purchase_type',
        'po_no',
        'transport_id',
        'transport_name',
        'lr_no',
        'lr_date',
        'bundles',
        'retail_location',
        'purchase_date',
        'invoice_no',
        'invoice_date',
        'igst',
        'i_discount',
        'tax_type_id',
        'tax_type_name',
        'tax_value',
        'tax_discount',
        'tax_lines',
        'bill_value',
        'other_charges',
        'bill_tax',
        'pur_discount_perc',
        'pur_discount',
        'total',
        'total_qty',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'paid_amount',
        'payment_status',
        'status',
        'invoice_workflow_status',
        'stock_applied',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date'           => 'date',
            'invoice_date'            => 'date',
            'lr_date'                 => 'date',
            'igst'                    => 'boolean',
            'i_discount'              => 'boolean',
            'bundles'                 => 'integer',
            'tax_lines'               => 'array',
            'tax_value'               => 'decimal:2',
            'tax_discount'            => 'decimal:2',
            'bill_value'              => 'decimal:2',
            'other_charges'           => 'decimal:2',
            'bill_tax'                => 'decimal:2',
            'pur_discount_perc'       => 'decimal:2',
            'pur_discount'            => 'decimal:2',
            'total'                   => 'decimal:2',
            'total_qty'               => 'decimal:3',
            'subtotal'                => 'decimal:2',
            'tax_amount'              => 'decimal:2',
            'discount_amount'         => 'decimal:2',
            'total_amount'            => 'decimal:2',
            'paid_amount'             => 'decimal:2',
            'stock_applied'           => 'boolean',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    public function company()
    {
        return $this->belongsTo(Store::class, 'company_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function transport()
    {
        return $this->belongsTo(Transport::class);
    }

    public function items()
    {
        return $this->hasMany(DirectPurchaseItem::class);
    }

    public function barcodes()
    {
        return $this->hasMany(Barcode::class, 'direct_purchase_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
