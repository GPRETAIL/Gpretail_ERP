<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockOutward extends Model
{
    use HasFactory;

    protected $fillable = [
        'source_store_id',
        'target_store_id',
        'outward_no',
        'outward_date',
        'status',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'outward_date' => 'date',
        ];
    }

    public function sourceStore()
    {
        return $this->belongsTo(Store::class, 'source_store_id');
    }

    public function targetStore()
    {
        return $this->belongsTo(Store::class, 'target_store_id');
    }

    public function items()
    {
        return $this->hasMany(StockOutwardItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
