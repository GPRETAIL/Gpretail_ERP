<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxSlab extends Model
{
    use HasFactory;

    protected $fillable = [
        'tax_id',
        'min_price',
        'max_price',
        'rate',
        'cgst_rate',
        'sgst_rate',
        'igst_rate',
    ];

    protected function casts(): array
    {
        return [
            'min_price' => 'decimal:2',
            'max_price' => 'decimal:2',
            'rate' => 'decimal:2',
            'cgst_rate' => 'decimal:2',
            'sgst_rate' => 'decimal:2',
            'igst_rate' => 'decimal:2',
        ];
    }

    public function tax()
    {
        return $this->belongsTo(Tax::class);
    }
}
