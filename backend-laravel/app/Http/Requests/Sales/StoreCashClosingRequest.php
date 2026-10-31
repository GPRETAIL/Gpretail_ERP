<?php

namespace App\Http\Requests\Sales;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;

class StoreCashClosingRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'message' => 'Validation error', 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'closing_cash' => 'required|numeric|min:0',
        ];
    }
}
