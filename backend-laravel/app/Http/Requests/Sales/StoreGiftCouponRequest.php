<?php

namespace App\Http\Requests\Sales;

use App\Http\Requests\ApiFormRequest;

/** A coupon given by hand (a supervisor, for a customer), outside the bill-settlement rule. */
class StoreGiftCouponRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'amount' => 'required|numeric|min:1|max:1000000',
            'customer_id' => 'nullable|integer',
            'buyer_name' => 'nullable|string|max:120',
            'buyer_phone' => 'nullable|string|max:30',
            // Days the coupon is valid; 0 means it never expires. Blank uses the store's coupon rule.
            'valid_days' => 'nullable|integer|min:0|max:3650',
            // The smallest bill it can be used on.
            'min_bill_amount' => 'nullable|numeric|min:0|max:10000000',
            'reason' => 'required|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => 'Enter the coupon value.',
            'amount.min' => 'The coupon value must be at least ₹1.',
            'reason.required' => 'Say why the coupon is given.',
        ];
    }
}
