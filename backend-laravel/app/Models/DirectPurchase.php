<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
            'purchase_date' => 'date',
            'invoice_date' => 'date',
            'lr_date' => 'date',
            'igst' => 'boolean',
            'i_discount' => 'boolean',
            'bundles' => 'integer',
            'tax_lines' => 'array',
            'tax_value' => 'decimal:2',
            'tax_discount' => 'decimal:2',
            'bill_value' => 'decimal:2',
            'other_charges' => 'decimal:2',
            'bill_tax' => 'decimal:2',
            'pur_discount_perc' => 'decimal:2',
            'pur_discount' => 'decimal:2',
            'total' => 'decimal:2',
            'total_qty' => 'decimal:3',
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'stock_applied' => 'boolean',
        ];
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /** @return BelongsTo<Store, $this> */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'company_id');
    }

    /** @return BelongsTo<Supplier, $this> */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /** @return BelongsTo<Transport, $this> */
    public function transport(): BelongsTo
    {
        return $this->belongsTo(Transport::class);
    }

    /** @return HasMany<DirectPurchaseItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(DirectPurchaseItem::class);
    }

    /** @return HasMany<Barcode, $this> */
    public function barcodes(): HasMany
    {
        return $this->hasMany(Barcode::class, 'direct_purchase_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
