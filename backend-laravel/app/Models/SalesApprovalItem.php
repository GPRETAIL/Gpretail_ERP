<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesApprovalItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_approval_id',
        'product_id',
        'quantity',
        'price',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'price'    => 'decimal:2',
        ];
    }

    public function salesApproval()
    {
        return $this->belongsTo(SalesApproval::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
