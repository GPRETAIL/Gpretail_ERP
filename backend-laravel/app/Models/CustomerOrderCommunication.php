<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerOrderCommunication extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_order_id',
        'communication_date',
        'communication_person',
        'communication_message',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'communication_date' => 'date',
        ];
    }

    public function order()
    {
        return $this->belongsTo(CustomerOrder::class, 'customer_order_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
