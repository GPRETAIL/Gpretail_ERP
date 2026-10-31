<?php

namespace App\Http\Requests\Sales;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;

class StoreCashOpeningRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'message' => 'Validation error', 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'opening_cash' => 'required|numeric|min:0',
        ];
    }
}
