<?php

namespace App\Http\Requests\Finance;

use App\Http\Requests\ApiFormRequest;
use App\Services\Accounting\SupplierPaymentWriter;
use Illuminate\Support\MessageBag;

class StoreSupplierPaymentRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'message' => 'Validation error', 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'amount' => 'required|numeric|min:0.01|max:999999999',
            'payment_mode' => 'required|in:'.implode(',', SupplierPaymentWriter::MODES),
            'payment_date' => 'nullable|date',
            'reference_no' => 'nullable|string|max:100|required_if:payment_mode,CHEQUE',
            'cheque_date' => 'nullable|date',
            'notes' => 'nullable|string|max:500',
            'allocations' => 'nullable|array|max:500',
            'allocations.*.invoice_type' => 'required|in:'.implode(',', SupplierPaymentWriter::TYPES),
            'allocations.*.id' => 'required|integer',
            'allocations.*.amount' => 'required|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return ['reference_no.required_if' => 'Enter the cheque number.'];
    }
}
