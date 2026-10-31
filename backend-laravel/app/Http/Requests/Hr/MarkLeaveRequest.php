<?php

namespace App\Http\Requests\Hr;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;

class MarkLeaveRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'message' => 'Validation error', 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'employee_id' => 'required|exists:employees,id',
        ];
    }
}
