<?php

namespace App\Http\Requests\Sales;

use App\Http\Requests\ApiFormRequest;
use Illuminate\Support\MessageBag;

/** Accepts what SalesOnApproval.jsx sends (barcodeId, qty, discount, tax %) and the older product_id/quantity shape. */
class StoreSalesApprovalRequest extends ApiFormRequest
{
    protected function errorBody(MessageBag $errors): array
    {
        return ['success' => false, 'message' => 'Validation error', 'errors' => $errors];
    }

    public function rules(): array
    {
        return [
            'customerId' => 'nullable|integer',
            'customer_id' => 'nullable|integer',
            'customer.name' => 'nullable|string|max:150',
            'customer.mobileNo' => 'nullable|string|max:30',
            'approval_date' => 'nullable|date',
            'items' => 'required|array|min:1|max:500',
            'items.*.barcodeId' => 'nullable|integer',
            'items.*.productId' => 'nullable|integer',
            'items.*.product_id' => 'nullable|integer',
            'items.*.qty' => 'required_without:items.*.quantity|numeric|min:0.01',
            'items.*.quantity' => 'required_without:items.*.qty|numeric|min:0.01',
            'items.*.price' => 'nullable|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0|max:100',
        ];
    }
}
