<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseInvoice extends Model
{
    use HasFactory;
    use HasMasterDetails;

    protected function masterCreator(): string|int|null
    {
        return $this->created_by ?? auth()->id();
    }

    public function company()
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    public function toArray(): array
    {
        $data = parent::toArray();
        $data['invoice_date'] = $this->invoice_date?->format('Y-m-d');
        $data['supplier_invoice_date'] = $this->supplier_invoice_date?->format('Y-m-d');
        if (($this->master_details['workflow'] ?? null) === 'warehouse_invoice') {
            $data['items'] = $this->master_details['warehouse_items'] ?? [];
            unset($data['warehouse_items']);
        }

        return $data;
    }

    protected $fillable = [
        'store_id',
        'supplier_id',
        'transport_id',
        'invoice_no',
        'invoice_date',
        'supplier_invoice_no',
        'supplier_invoice_date',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'round_off',
        'grand_total',
        'paid_amount',
        'payment_status',
        'status',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'supplier_invoice_date' => 'date',
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'round_off' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
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

    public function transport()
    {
        return $this->belongsTo(Transport::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseInvoiceItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
