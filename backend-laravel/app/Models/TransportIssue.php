<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransportIssue extends Model
{
    use HasFactory;

    protected $fillable = [
        'transport_entry_id',
        'issue_no',
        'issue_date',
        'recipient_name',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
        ];
    }

    /** @return BelongsTo<TransportEntry, $this> */
    public function transportEntry(): BelongsTo
    {
        return $this->belongsTo(TransportEntry::class);
    }
}
