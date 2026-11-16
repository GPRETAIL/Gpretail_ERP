<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** The part of a dealer receipt that pays one invoice. */
class DealerReceiptItem extends Model
{
    protected $fillable = ['dealer_receipt_id', 'dealer_invoice_id', 'amount'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    /** @return BelongsTo<DealerInvoice, $this> */
    public function dealerInvoice(): BelongsTo
    {
        return $this->belongsTo(DealerInvoice::class);
    }
}
