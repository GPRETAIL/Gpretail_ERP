<?php

namespace App\Http\Requests\Sales;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;

class StorePosReturnRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'message' => 'Validation error', 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'items' => 'required|array|min:1',
            'items.*.productId' => 'required|exists:products,id',
            'items.*.qty' => 'required|numeric|min:0.01',
            // How the customer is paid back. A credit note is a numbered note with a balance and an expiry.
            'refundMode' => 'nullable|in:CASH,CARD,UPI,CREDIT_NOTE',
        ];
    }
}
