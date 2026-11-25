<?php

namespace App\Http\Requests\Sales;

use App\Http\Requests\ApiFormRequest;

/** Sales of a gift voucher at the counter. */
class StoreGiftVoucherRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'amount' => 'required|numeric|min:1|max:1000000',
            'payment_mode' => 'required|in:CASH,CARD,UPI',
            'payment_reference' => 'nullable|string|max:100',
            'customer_id' => 'nullable|integer',
            'buyer_name' => 'nullable|string|max:120',
            'buyer_phone' => 'nullable|string|max:30',
            // Days the voucher is valid; blank uses the store's setting (Sales Customisation), 0 means it never expires.
            'valid_days' => 'nullable|integer|min:0|max:3650',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => 'Enter the voucher amount.',
            'amount.min' => 'The voucher amount must be at least ₹1.',
            'payment_mode.required' => 'Choose how the customer paid.',
            'payment_mode.in' => 'Choose cash, card or UPI.',
        ];
    }
}
