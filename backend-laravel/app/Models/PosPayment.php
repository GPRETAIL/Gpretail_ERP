<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'pos_sale_id',
        'payment_mode',
        'amount',
        'reference_no',
        'card_type_id',
        'upi_provider_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function posSale()
    {
        return $this->belongsTo(PosSale::class);
    }
}
