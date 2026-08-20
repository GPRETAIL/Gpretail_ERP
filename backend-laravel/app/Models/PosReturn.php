<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'pos_sale_id',
        'customer_id',
        'return_no',
        'return_date',
        'total_refund',
        'refund_mode',
        'status',
        'created_by',
        'return_reason_id',
        'return_reason_name',
        'standalone',
        'credit_applied_to_sale_id',
        'credit_applied_at',
    ];

    protected function casts(): array
    {
        return [
            'return_date'  => 'datetime',
            'total_refund' => 'decimal:2',
            'standalone'   => 'boolean',
            'credit_applied_at' => 'datetime',
        ];
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function appliedToSale()
    {
        return $this->belongsTo(PosSale::class, 'credit_applied_to_sale_id');
    }

    public function posSale()
    {
        return $this->belongsTo(PosSale::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(PosReturnItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
