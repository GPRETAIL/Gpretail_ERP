<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A bill a customer or supplier owed when the store started its books (Finance > Opening Balance). */
class OpeningBill extends Model
{
    public const PARTY_TYPES = ['customer', 'supplier'];

    protected $fillable = ['store_id', 'party_type', 'party_id', 'bill_no', 'bill_date', 'due_date', 'amount', 'paid_amount', 'notes', 'created_by'];

    protected function casts(): array
    {
        return ['bill_date' => 'date', 'due_date' => 'date', 'amount' => 'decimal:2', 'paid_amount' => 'decimal:2'];
    }

    public function balance(): float
    {
        return round(max(0, (float) $this->amount - (float) $this->paid_amount), 2);
    }
}
