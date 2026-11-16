<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Money taken on a dealer invoice when it was made (the rest of the invoice stays on the dealer's account). */
class DealerInvoicePayment extends Model
{
    public const MODES = ['CASH', 'CARD', 'UPI', 'BANK', 'CHEQUE'];

    protected $fillable = ['dealer_invoice_id', 'mode', 'amount', 'reference_no', 'card_type_id', 'upi_provider_id', 'cheque_date'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'cheque_date' => 'date:Y-m-d'];
    }

    /** @return BelongsTo<DealerInvoice, $this> */
    public function dealerInvoice(): BelongsTo
    {
        return $this->belongsTo(DealerInvoice::class);
    }
}
