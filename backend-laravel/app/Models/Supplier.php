<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use App\Models\Concerns\NumbersCodeFromId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory;
    use NumbersCodeFromId;

    /** A record saved without a code is numbered SUP<id> (NumbersCodeFromId). */
    public const CODE_PREFIX = 'SUP';

    use HasMasterDetails;

    protected $fillable = [
        'name',
        'company_name',
        'code',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'pincode',
        'gstin',
        'pan',
        'opening_balance',
        'current_balance',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'current_balance' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<PurchaseInvoice, $this> */
    public function purchaseInvoices(): HasMany
    {
        return $this->hasMany(PurchaseInvoice::class);
    }

    /** @return HasMany<SupplierPayment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }
}
