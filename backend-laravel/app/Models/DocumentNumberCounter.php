<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentNumberCounter extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'prefix',
        'period',
        'origin',
        'last_seq',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}
