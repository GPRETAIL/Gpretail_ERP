<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransportEntry extends Model
{
    use HasFactory;
    use HasMasterDetails;

    protected $fillable = [
        'transport_id',
        'lr_no',
        'lr_date',
        'source',
        'destination',
        'packages_count',
        'weight_kg',
        'freight_charges',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'lr_date' => 'date',
            'packages_count' => 'integer',
            'weight_kg' => 'decimal:2',
            'freight_charges' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Transport, $this> */
    public function transport(): BelongsTo
    {
        return $this->belongsTo(Transport::class);
    }

    /** @return BelongsTo<Store, $this> */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    public function getSupplierIdAttribute($value)
    {
        return $value ?? ($this->master_details['supplier_id'] ?? null);
    }

    /** @return BelongsTo<Supplier, $this> */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function getFromCityIdAttribute($value)
    {
        return $value ?? ($this->master_details['from_city_id'] ?? null);
    }

    public function getReceivingCityIdAttribute($value)
    {
        return $value ?? ($this->master_details['receiving_city_id'] ?? null);
    }

    /** @return BelongsTo<SystemConfiguration, $this> */
    public function fromCity(): BelongsTo
    {
        return $this->belongsTo(SystemConfiguration::class, 'from_city_id');
    }

    /** @return BelongsTo<SystemConfiguration, $this> */
    public function receivingCity(): BelongsTo
    {
        return $this->belongsTo(SystemConfiguration::class, 'receiving_city_id');
    }

    public function toArray(): array
    {
        $data = parent::toArray();
        $data['lr_date'] = $this->lr_date->format('Y-m-d');
        foreach (['fromCity' => 'from_city', 'receivingCity' => 'receiving_city'] as $relation => $key) {
            if ($this->relationLoaded($relation) && $this->$relation) {
                $city = $this->$relation;
                $data[$key] = $data[$relation] = ['id' => $city->id, 'name' => $city->value ?? $city->config_value];
            }
        }

        return $data;
    }

    /** @return HasMany<TransportIssue, $this> */
    public function issues(): HasMany
    {
        return $this->hasMany(TransportIssue::class);
    }

    /** @return HasMany<TransportReceipt, $this> */
    public function receipts(): HasMany
    {
        return $this->hasMany(TransportReceipt::class);
    }
}
