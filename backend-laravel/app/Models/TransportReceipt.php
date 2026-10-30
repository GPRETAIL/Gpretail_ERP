<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransportReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'transport_entry_id',
        'receipt_no',
        'receipt_date',
        'received_by_name',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'receipt_date' => 'date',
        ];
    }

    /** @return BelongsTo<TransportEntry, $this> */
    public function transportEntry(): BelongsTo
    {
        return $this->belongsTo(TransportEntry::class);
    }
}
