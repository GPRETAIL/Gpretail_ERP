<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    /** @return BelongsTo<CustomerOrder, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(CustomerOrder::class, 'customer_order_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
