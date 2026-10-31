<?php

namespace App\Http\Requests\Crm;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;

class StoreCustomerOrderRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'message' => 'Validation error', 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'items' => 'required|array|min:1',
        ];
    }
}
