<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockBatchAllocation extends Model
{
    protected $fillable = [
        'stock_batch_id',
        'stock_transaction_id',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
        ];
    }

    public function batch()
    {
        return $this->belongsTo(StockBatch::class, 'stock_batch_id');
    }

    public function transaction()
    {
        return $this->belongsTo(StockTransaction::class, 'stock_transaction_id');
    }
}
