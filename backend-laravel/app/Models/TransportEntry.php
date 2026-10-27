<?php

namespace App\Models;

use App\Models\Concerns\HasMasterDetails;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    public function transport()
    {
        return $this->belongsTo(Transport::class);
    }

    public function company()
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    public function getSupplierIdAttribute($value)
    {
        return $value ?? ($this->master_details['supplier_id'] ?? null);
    }

    public function supplier()
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

    public function fromCity()
    {
        return $this->belongsTo(SystemConfiguration::class, 'from_city_id');
    }

    public function receivingCity()
    {
        return $this->belongsTo(SystemConfiguration::class, 'receiving_city_id');
    }

    public function toArray(): array
    {
        $data = parent::toArray();
        $data['lr_date'] = $this->lr_date?->format('Y-m-d');
        foreach (['fromCity' => 'from_city', 'receivingCity' => 'receiving_city'] as $relation => $key) {
            if ($this->relationLoaded($relation) && $this->$relation) {
                $city = $this->$relation;
                $data[$key] = $data[$relation] = ['id' => $city->id, 'name' => $city->value ?? $city->config_value];
            }
        }

        return $data;
    }

    public function issues()
    {
        return $this->hasMany(TransportIssue::class);
    }

    public function receipts()
    {
        return $this->hasMany(TransportReceipt::class);
    }
}
