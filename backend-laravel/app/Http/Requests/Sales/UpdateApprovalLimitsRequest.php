<?php

namespace App\Http\Requests\Sales;

use App\Http\Requests\ApiFormRequest;
use App\Services\Approvals\ApprovalService;

class UpdateApprovalLimitsRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'enabled' => 'required|boolean',
            'limits' => 'array|max:20',
            'limits.*.role' => 'required|string|in:'.implode(',', array_keys(ApprovalService::RECOMMENDED)),
            'limits.*.max_discount_percent' => 'nullable|numeric|min:0|max:100',
            'limits.*.max_refund_amount' => 'nullable|numeric|min:0|max:100000000',
            'limits.*.allow_no_receipt_refund' => 'boolean',
        ];
    }
}
