<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
            'price' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<SalesApproval, $this> */
    public function salesApproval(): BelongsTo
    {
        return $this->belongsTo(SalesApproval::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
