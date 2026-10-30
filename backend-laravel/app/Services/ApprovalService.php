<?php

namespace App\Services;

use App\Models\ApprovalLimit;
use App\Models\ApprovalRequest;
use App\Models\Barcode;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Discount / refund approvals. A store's approval_limits rows switch the feature on; a store
 * without rows keeps the old behaviour. Limits are per role; a missing role row falls back to
 * RECOMMENDED. Approvals end in a single-use token the sale/return must present, and the server
 * re-checks it against the actual basket, so the screen cannot be bypassed via the API.
 */
class ApprovalService
{
    public const ACTIONS = ['pos_discount', 'pos_refund'];

    /** Lowest to highest authority; admins are always unlimited. */
    public const ROLE_ORDER = ['user', 'staff', 'store_user', 'warehouse_user', 'accountant', 'cashier', 'sales', 'supervisor', 'manager', 'admin', 'super_admin'];

    public const RECOMMENDED = [
        'cashier' => ['max_discount_percent' => 5, 'max_refund_amount' => 0, 'allow_no_receipt_refund' => false],
        'sales' => ['max_discount_percent' => 5, 'max_refund_amount' => 0, 'allow_no_receipt_refund' => false],
        'store_user' => ['max_discount_percent' => 5, 'max_refund_amount' => 0, 'allow_no_receipt_refund' => false],
        'supervisor' => ['max_discount_percent' => 10, 'max_refund_amount' => 2000, 'allow_no_receipt_refund' => false],
        'manager' => ['max_discount_percent' => 20, 'max_refund_amount' => 10000, 'allow_no_receipt_refund' => true],
    ];

    private const TOKEN_TTL_MINUTES = 30;

    private const PENDING_TTL_MINUTES = 15;

    public function enabled(int $storeId): bool
    {
        return ApprovalLimit::withoutGlobalScopes()->where('store_id', $storeId)->exists();
    }

    /** @return array{max_discount_percent: ?float, max_refund_amount: ?float, allow_no_receipt_refund: bool} */
    public function limitFor(User $user, int $storeId): array
    {
        if (in_array($user->role, ['admin', 'super_admin'], true)) {
            return ['max_discount_percent' => null, 'max_refund_amount' => null, 'allow_no_receipt_refund' => true];
        }
        $row = ApprovalLimit::withoutGlobalScopes()->where('store_id', $storeId)->where('role', $user->role)->first();
        $limit = $row?->only(['max_discount_percent', 'max_refund_amount', 'allow_no_receipt_refund'])
            ?? (self::RECOMMENDED[$user->role] ?? ['max_discount_percent' => 0, 'max_refund_amount' => 0, 'allow_no_receipt_refund' => false]);

        return [
            'max_discount_percent' => $limit['max_discount_percent'] === null ? null : (float) $limit['max_discount_percent'],
            'max_refund_amount' => $limit['max_refund_amount'] === null ? null : (float) $limit['max_refund_amount'],
            'allow_no_receipt_refund' => (bool) $limit['allow_no_receipt_refund'],
        ];
    }

    /**
     * Discount of each line against the catalogue price (barcode final price, else product
     * selling price/MRP). Covers both an explicit line discount and a lowered unit price.
     *
     * @return array{max_percent: float, lines: array<int, array<string, mixed>>}
     */
    public function basketDiscount(array $items, Collection $products, Collection $barcodes): array
    {
        $lines = [];
        $max = 0.0;
        foreach ($items as $index => $item) {
            $product = $products->get($item['productId'] ?? null);
            $barcode = ! empty($item['barcodeId']) ? $barcodes->get($item['barcodeId']) : null;
            // First positive price: decimal columns arrive as strings, and "0.00" is truthy in PHP.
            $reference = (float) (collect([$barcode?->final_price, $barcode?->selling_price, $product?->selling_price, $product?->mrp])
                ->first(fn ($price) => (float) $price > 0) ?? 0);
            $qty = max(0.0001, (float) ($item['qty'] ?? 0));
            $effective = ((float) ($item['price'] ?? 0) * $qty - (float) ($item['discount'] ?? 0)) / $qty;
            $percent = $reference > 0 ? max(0, round((1 - $effective / $reference) * 100, 2)) : 0.0;
            $max = max($max, $percent);
            if ($percent > 0) {
                $lines[] = ['index' => $index, 'product' => $product?->name, 'reference_price' => round($reference, 2), 'unit_price' => round($effective, 2), 'qty' => $qty, 'discount_percent' => $percent];
            }
        }

        return ['max_percent' => $max, 'lines' => $lines];
    }

    /** Throws APPROVAL_REQUIRED unless the requester's own limit or a valid token covers the basket. */
    public function authorizeDiscount(User $user, int $storeId, array $basket, ?string $token): ?ApprovalRequest
    {
        if (! $this->enabled($storeId) || $basket['max_percent'] <= 0) {
            return null;
        }
        $limit = $this->limitFor($user, $storeId)['max_discount_percent'];
        if ($limit === null || $basket['max_percent'] <= $limit + 0.001) {
            return null;
        }
        $approval = $this->consumable($token, $storeId, 'pos_discount', $user);
        if (! $approval || (float) $approval->approved_percent + 0.001 < $basket['max_percent']) {
            throw new ApprovalRequiredException('pos_discount', [
                'requested_percent' => $basket['max_percent'], 'your_limit_percent' => $limit, 'lines' => $basket['lines'],
            ], $approval ? 'The approved discount is lower than this bill. Request approval again.' : null);
        }

        return $approval;
    }

    public function authorizeRefund(User $user, int $storeId, float $amount, bool $withoutReceipt, ?string $token): ?ApprovalRequest
    {
        if (! $this->enabled($storeId) || $amount <= 0) {
            return null;
        }
        $limit = $this->limitFor($user, $storeId);
        $overAmount = $limit['max_refund_amount'] !== null && $amount > $limit['max_refund_amount'] + 0.001;
        $receiptRule = $withoutReceipt && ! $limit['allow_no_receipt_refund'];
        if (! $overAmount && ! $receiptRule) {
            return null;
        }
        $approval = $this->consumable($token, $storeId, 'pos_refund', $user);
        if (! $approval || (float) $approval->amount + 0.001 < $amount) {
            throw new ApprovalRequiredException('pos_refund', [
                'amount' => round($amount, 2), 'your_limit_amount' => $limit['max_refund_amount'], 'without_receipt' => $withoutReceipt,
            ], $approval ? 'The approved refund is lower than this return. Request approval again.' : null);
        }

        return $approval;
    }

    /** Whether $approver may approve this request on their own authority. */
    public function canDecide(User $approver, ApprovalRequest $request): bool
    {
        if ((int) $approver->id === (int) $request->requested_by || ! $approver->is_active) {
            return false;
        }
        if (! in_array($approver->role, ['supervisor', 'manager', 'admin', 'super_admin'], true)) {
            return false;
        }
        $limit = $this->limitFor($approver, (int) $request->store_id);

        return $request->action === 'pos_discount'
            ? $limit['max_discount_percent'] === null || (float) $request->requested_percent <= $limit['max_discount_percent'] + 0.001
            : ($limit['max_refund_amount'] === null || (float) $request->amount <= $limit['max_refund_amount'] + 0.001)
                && (! ($request->payload['without_receipt'] ?? false) || $limit['allow_no_receipt_refund']);
    }

    public function createRequest(User $user, int $storeId, string $action, array $data, string $channel = 'remote'): ApprovalRequest
    {
        return ApprovalRequest::create([
            'store_id' => $storeId, 'action' => $action, 'status' => 'pending', 'channel' => $channel, 'requested_by' => $user->id,
            'requested_percent' => $action === 'pos_discount' ? round((float) ($data['requested_percent'] ?? 0), 2) : null,
            'amount' => isset($data['amount']) ? round((float) $data['amount'], 2) : null,
            'reason_code' => $data['reason_code'] ?? null, 'note' => $data['note'] ?? null,
            'payload' => $data['payload'] ?? null, 'expires_at' => now()->addMinutes(self::PENDING_TTL_MINUTES),
        ]);
    }

    /** Records the approver's decision; the requester collects the token separately (issueToken). */
    public function approve(ApprovalRequest $request, User $approver, ?float $approvedPercent = null, ?string $note = null): void
    {
        $percent = $request->action === 'pos_discount'
            ? min((float) $request->requested_percent, $approvedPercent ?? (float) $request->requested_percent)
            : null;
        $request->forceFill([
            'status' => 'approved', 'decided_by' => $approver->id, 'decided_at' => now(), 'decision_note' => $note,
            'approved_percent' => $percent, 'expires_at' => now()->addMinutes(self::TOKEN_TTL_MINUTES),
        ])->save();
    }

    /** Plain single-use token for the requester; only its hash is stored, and re-issuing replaces it. */
    public function issueToken(ApprovalRequest $request): string
    {
        $token = Str::random(48);
        $request->forceFill(['token_hash' => hash('sha256', $token)])->save();

        return $token;
    }

    public function verifyPin(string $login, string $pin, int $storeId): ?User
    {
        $approver = User::withoutGlobalScopes()->where(fn ($q) => $q->where('username', $login)->orWhereRaw('LOWER(email) = ?', [strtolower($login)]))->first();
        if (! $approver?->approval_pin_hash || ! Hash::check($pin, $approver->approval_pin_hash)) {
            return null;
        }
        // The approver must be able to work in this store.
        $stores = app(StoreContext::class)->available($approver)->pluck('id')->map(fn ($id) => (int) $id)->all();

        return in_array($storeId, $stores, true) ? $approver : null;
    }

    private function consumable(?string $token, int $storeId, string $action, User $user): ?ApprovalRequest
    {
        if (! $token) {
            return null;
        }
        $approval = ApprovalRequest::withoutGlobalScopes()->where('token_hash', hash('sha256', $token))->lockForUpdate()->first();
        if (! $approval || $approval->status !== 'approved' || (int) $approval->store_id !== $storeId || $approval->action !== $action
            || (int) $approval->requested_by !== (int) $user->id || $approval->expires_at?->isPast()) {
            throw ValidationException::withMessages(['approvalToken' => 'This approval is no longer valid. Request approval again.']);
        }

        return $approval;
    }
}
