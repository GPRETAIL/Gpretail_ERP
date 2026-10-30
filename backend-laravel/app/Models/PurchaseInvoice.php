<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property array<string, mixed>|null $master_details
 */
class PurchaseInvoice extends Model
{
    use HasFactory;
    use HasMasterDetails;

    protected function masterCreator(): string|int|null
    {
        return $this->created_by ?? auth()->id();
    }

    /** @return BelongsTo<Store, $this> */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    public function toArray(): array
    {
        $data = parent::toArray();
        $data['invoice_date'] = $this->invoice_date->format('Y-m-d');
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

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
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

    /** @return HasMany<PurchaseInvoiceItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(PurchaseInvoiceItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
