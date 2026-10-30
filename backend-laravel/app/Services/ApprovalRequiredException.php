<?php

namespace App\Services;

use RuntimeException;

/**
 * Rendered as HTTP 428 { code: APPROVAL_REQUIRED, action, details } so the POS can ask for approval.
 * Not 409: offline sync replay treats 409 as "this write already landed".
 */
class ApprovalRequiredException extends RuntimeException
{
    public function __construct(public string $action, public array $details, ?string $message = null)
    {
        parent::__construct($message ?? ($action === 'pos_discount'
            ? 'This discount is above your limit. A supervisor or manager must approve it.'
            : 'This refund needs supervisor or manager approval.'));
    }

    public function render()
    {
        return response()->json([
            'success' => false, 'code' => 'APPROVAL_REQUIRED', 'action' => $this->action,
            'message' => $this->getMessage(), 'details' => $this->details,
        ], 428);
    }
}
