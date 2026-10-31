<?php

namespace App\Http\Requests\Finance;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;

class StoreSupplierPaymentRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'message' => 'Validation error', 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'supplier_id' => 'required|exists:suppliers,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_mode' => 'nullable|string',
            'payment_date' => 'nullable|date',
        ];
    }
}
