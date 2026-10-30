<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    /** @return BelongsTo<PosSale, $this> */
    public function posSale(): BelongsTo
    {
        return $this->belongsTo(PosSale::class);
    }
}
