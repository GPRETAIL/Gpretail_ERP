<?php

namespace App\Http\Requests\Masters;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'code' => ['required', 'string', 'max:50', Rule::unique('categories', 'code')->where('store_id', $this->attributes->get('store_context_id'))],
        ];
    }
}
