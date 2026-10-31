<?php

namespace App\Http\Requests\Warehouse;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;

class GenerateBarcodeRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'message' => 'Validation error', 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'quantity' => 'nullable|integer|min:1|max:500',
        ];
    }
}
