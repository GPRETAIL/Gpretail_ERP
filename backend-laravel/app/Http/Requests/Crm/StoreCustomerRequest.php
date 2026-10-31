<?php

namespace App\Http\Requests\Crm;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;

class StoreCustomerRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'mobileNo' => 'nullable|string|max:50',
        ];
    }
}
