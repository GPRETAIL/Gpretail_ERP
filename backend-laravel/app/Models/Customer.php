<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'phone',
        'email',
        'address',
        'city',
        'state',
        'pincode',
        'gstin',
        'credit_limit',
        'current_balance',
        'loyalty_points',
        'is_active',
        'customer_type',
        'customer_category_id',
        'billing_name',
        'gender',
        'date_of_birth',
        'married',
        'marriage_date',
        'kids_boy',
        'kids_girl',
        'loyalty_card_number',
        'disable_loyalty',
        'supply_type',
        'tan_pan',
        'support_credit',
        'credit_days',
        'credit_amount',
        'district_id',
        'state_id',
        'country_id',
        'registering_at_id',
        'approved_by_id',
        'bank_account_name',
        'account_no_ifsc',
    ];

    protected function casts(): array
    {
        return [
            'credit_limit' => 'decimal:2',
            'current_balance' => 'decimal:2',
            'loyalty_points' => 'integer',
            'is_active' => 'boolean',
            'date_of_birth' => 'date',
            'married' => 'boolean',
            'marriage_date' => 'date',
            'kids_boy' => 'integer',
            'kids_girl' => 'integer',
            'disable_loyalty' => 'boolean',
            'support_credit' => 'boolean',
            'credit_days' => 'integer',
            'credit_amount' => 'decimal:2',
        ];
    }

    public function posSales()
    {
        return $this->hasMany(PosSale::class);
    }

    public function orders()
    {
        return $this->hasMany(CustomerOrder::class);
    }

    public function loyaltyTransactions()
    {
        return $this->hasMany(LoyaltyTransaction::class);
    }

    public function creditLedgers()
    {
        return $this->hasMany(CreditLedger::class);
    }
}
