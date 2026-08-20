<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    public function transportEntry()
    {
        return $this->belongsTo(TransportEntry::class);
    }
}
