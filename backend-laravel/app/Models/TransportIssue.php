<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    public function transportEntry()
    {
        return $this->belongsTo(TransportEntry::class);
    }
}
