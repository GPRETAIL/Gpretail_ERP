<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GeneralLedger extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'account_type',
        'account_name',
        'reference_type',
        'reference_id',
        'debit',
        'credit',
        'balance',
        'description',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'debit'   => 'decimal:2',
            'credit'  => 'decimal:2',
            'balance' => 'decimal:2',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
