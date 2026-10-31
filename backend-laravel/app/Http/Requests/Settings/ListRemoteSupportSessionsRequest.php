<?php

namespace App\Http\Requests\Settings;

use App\Http\Requests\ApiFormRequest;

class ListRemoteSupportSessionsRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return ['page' => 'nullable|integer|min:1', 'per_page' => 'nullable|integer|min:1|max:100',
            'category' => 'nullable|string|max:60', 'search' => 'nullable|string|max:120'];
    }
}
