<?php

namespace App\Http\Requests\Warehouse;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;

class ProcessPurchaseFlowRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'message' => 'Validation error', 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'supplier' => 'required|array',
            'invoice' => 'required|array',
            'items' => 'required|array|min:1',
        ];
    }
}
