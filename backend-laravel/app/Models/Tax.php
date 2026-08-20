<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tax extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'rate',
        'type',
        'cgst_rate',
        'sgst_rate',
        'igst_rate',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:2',
            'cgst_rate' => 'decimal:2',
            'sgst_rate' => 'decimal:2',
            'igst_rate' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function slabs()
    {
        return $this->hasMany(TaxSlab::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
