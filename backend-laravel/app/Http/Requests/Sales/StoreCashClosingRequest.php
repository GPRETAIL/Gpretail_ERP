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

    /** Cash Closing: the counter, who received the cash, expenses and the counted notes (or closing_cash). */
    public function rules(): array
    {
        return [
            'counterId' => 'nullable|integer|min:1',
            'receivedByEmployeeId' => 'nullable|integer|min:1',
            'cashierEmployeeId' => 'nullable|integer|min:1',
            'counterExpenses' => 'nullable|numeric|min:0',
            'closing_cash' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'count_2000' => 'nullable|integer|min:0|max:100000',
            'count_500' => 'nullable|integer|min:0|max:100000',
            'count_200' => 'nullable|integer|min:0|max:100000',
            'count_100' => 'nullable|integer|min:0|max:100000',
            'count_50' => 'nullable|integer|min:0|max:100000',
            'count_20' => 'nullable|integer|min:0|max:100000',
            'count_10' => 'nullable|integer|min:0|max:100000',
            'count_5' => 'nullable|integer|min:0|max:100000',
            'count_2' => 'nullable|integer|min:0|max:100000',
            'count_1' => 'nullable|integer|min:0|max:100000',
        ];
    }
}
