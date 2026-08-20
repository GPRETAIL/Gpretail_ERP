<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransportEntry extends Model
{
    use HasFactory;

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
            'lr_date'         => 'date',
            'packages_count'  => 'integer',
            'weight_kg'       => 'decimal:2',
            'freight_charges' => 'decimal:2',
        ];
    }

    public function transport()
    {
        return $this->belongsTo(Transport::class);
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
