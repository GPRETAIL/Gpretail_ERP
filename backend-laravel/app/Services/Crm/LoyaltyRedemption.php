<?php

namespace App\Services\Crm;

use App\Models\ApprovalRequest;
use App\Models\Customer;
use App\Models\LoyaltyOtp;
use App\Models\Store;
use App\Models\User;
use App\Services\Approvals\ApprovalService;
use App\Services\Messaging\MessageGateway;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Redeeming loyalty points at POS. The customer approves with a one-time password sent by SMS, WhatsApp or email
 * (Settings > Messaging); when none can be sent, a supervisor approves instead (approval action loyalty_redeem).
 * A supervisor or above at the counter redeems on their own authority.
 */
class LoyaltyRedemption
{
    public const OTP_MINUTES = 5;

    public const TOKEN_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public const RESEND_SECONDS = 30;

    public function __construct(private LoyaltyLedger $ledger, private MessageGateway $gateway, private ApprovalService $approvals) {}

    /** What the POS shows: balance, the most this bill can take, how the customer can approve. */
    public function quote(int $storeId, Customer $customer, float $billAmount): array
    {
        $s = $this->ledger->settings($storeId);
        $balance = (int) $customer->loyalty_points;
        $byPercent = $s['redeem_value'] > 0 ? (int) floor(max(0, $billAmount) * $s['max_percent'] / 100 / $s['redeem_value']) : 0;
        $max = $s['enabled'] && ! $customer->disable_loyalty && $balance >= $s['min_points'] ? min($balance, $byPercent) : 0;

        return [
            'enabled' => $s['enabled'] && ! $customer->disable_loyalty, 'balance' => $balance, 'point_value' => $s['redeem_value'],
            'min_points' => $s['min_points'], 'max_percent' => $s['max_percent'], 'max_points' => $max,
            'otp_required' => $s['otp_required'], 'channels' => $this->channelsFor($storeId, $customer),
            'expiring' => $this->ledger->expiring($customer, 3),
            'tier' => app(LoyaltyTiers::class)->forCustomer($storeId, $customer),
        ];
    }

    /** Sends a code for redeeming $points; returns the OTP id and where it went. */
    public function requestOtp(User $user, int $storeId, Customer $customer, int $points, float $billAmount, ?string $channel = null): array
    {
        $this->check($storeId, $customer, $points, $billAmount);
        $channels = $this->channelsFor($storeId, $customer);
        if (! $channels) {
            throw ValidationException::withMessages(['otp' => 'No OTP can be sent to this customer (no phone/email, or no channel set up in Settings > Messaging). Ask a supervisor to approve.']);
        }
        $channel = $channel && in_array($channel, array_column($channels, 'channel'), true) ? $channel : $channels[0]['channel'];
        $to = $channel === 'email' ? (string) $customer->email : (string) $customer->phone;
        $recent = LoyaltyOtp::where('customer_id', $customer->id)->where('created_at', '>', now()->subSeconds(self::RESEND_SECONDS))->exists();
        if ($recent) {
            throw ValidationException::withMessages(['otp' => 'An OTP was just sent. Wait '.self::RESEND_SECONDS.' seconds before sending another.']);
        }

        $code = (string) random_int(100000, 999999);
        $amount = $this->amount($storeId, $points);
        $otp = LoyaltyOtp::create(['store_id' => $storeId, 'customer_id' => $customer->id, 'channel' => $channel, 'sent_to' => $to,
            'code_hash' => self::hash($code), 'points' => $points, 'amount' => $amount, 'expires_at' => now()->addMinutes(self::OTP_MINUTES), 'created_by' => $user->id]);
        $store = (string) Store::query()->withoutGlobalScopes()->whereKey($storeId)->value('name');
        $sent = $this->gateway->sendOtp($storeId, $channel, $to, ['otp' => $code, 'points' => $points, 'amount' => number_format($amount, 2), 'store' => $store]);
        if (! $sent['ok']) {
            $otp->delete();
            throw ValidationException::withMessages(['otp' => $sent['message'].' Try another channel or ask a supervisor to approve.']);
        }

        return ['otp_id' => $otp->id, 'channel' => $channel, 'sent_to' => self::masked($channel, $to), 'expires_in' => self::OTP_MINUTES * 60];
    }

    /** Checks the code the customer reads out; returns a single-use redeem token for checkout. */
    public function verifyOtp(int $storeId, int $otpId, string $code): array
    {
        $otp = LoyaltyOtp::where('store_id', $storeId)->whereKey($otpId)->lockForUpdate()->first();
        if (! $otp || $otp->verified_at || $otp->expires_at->isPast() || $otp->attempts >= self::MAX_ATTEMPTS) {
            throw ValidationException::withMessages(['code' => 'This OTP has expired. Send a new one.']);
        }
        if (! hash_equals($otp->code_hash, self::hash(trim($code)))) {
            $otp->increment('attempts');
            $left = self::MAX_ATTEMPTS - $otp->attempts;
            throw ValidationException::withMessages(['code' => $left > 0 ? "Wrong OTP. {$left} tries left." : 'Wrong OTP too many times. Send a new one.']);
        }
        $token = Str::random(40);
        $otp->forceFill(['verified_at' => now(), 'token_hash' => self::hash($token), 'token_expires_at' => now()->addMinutes(self::TOKEN_MINUTES)])->save();

        return ['token' => $token, 'points' => $otp->points, 'amount' => (float) $otp->amount];
    }

    /**
     * Checkout: the points to redeem on this bill, checked and approved. Returns null when nothing is redeemed.
     *
     * @param  array{points?: int, otpToken?: ?string, approvalToken?: ?string}|null  $input
     * @return array{points: int, amount: float, otp: ?LoyaltyOtp, approval: ?ApprovalRequest}|null
     */
    public function authorize(User $user, int $storeId, ?Customer $customer, ?array $input, float $billAmount): ?array
    {
        $points = (int) ($input['points'] ?? 0);
        if ($points <= 0) {
            return null;
        }
        if (! $customer) {
            throw ValidationException::withMessages(['loyaltyRedeem' => 'Choose the customer whose points are redeemed.']);
        }
        $this->check($storeId, $customer, $points, $billAmount);
        $otp = null;
        $approval = null;
        if ($this->ledger->settings($storeId)['otp_required'] && ! in_array($user->role, ApprovalService::APPROVER_ROLES, true)) {
            if (! empty($input['otpToken'])) {
                $otp = LoyaltyOtp::where('token_hash', self::hash((string) $input['otpToken']))->lockForUpdate()->first();
                if (! $otp || (int) $otp->customer_id !== (int) $customer->id || $otp->used_at || $otp->token_expires_at?->isPast() || $points > $otp->points) {
                    throw ValidationException::withMessages(['loyaltyRedeem' => 'The OTP approval is no longer valid. Send a new OTP.']);
                }
            } else {
                $approval = $this->approvals->authorizeLoyaltyRedeem($user, $storeId, [
                    'customer_name' => $customer->name, 'points' => $points, 'amount' => $this->amount($storeId, $points),
                ], $input['approvalToken'] ?? null);
            }
        }

        return ['points' => $points, 'amount' => $this->amount($storeId, $points), 'otp' => $otp, 'approval' => $approval];
    }

    public function amount(int $storeId, int $points): float
    {
        return round($points * $this->ledger->settings($storeId)['redeem_value'], 2);
    }

    private function check(int $storeId, Customer $customer, int $points, float $billAmount): void
    {
        $q = $this->quote($storeId, $customer, $billAmount);
        $fail = fn (string $m) => throw ValidationException::withMessages(['loyaltyRedeem' => $m]);
        if (! $q['enabled']) {
            $fail('Loyalty points are switched off for this customer or store.');
        }
        if ($points < $q['min_points']) {
            $fail("At least {$q['min_points']} points must be redeemed at a time.");
        }
        if ($points > $q['balance']) {
            $fail("The customer has only {$q['balance']} points.");
        }
        if ($points > $q['max_points']) {
            $fail("At most {$q['max_points']} points can be used on this bill ({$q['max_percent']}% of the bill).");
        }
    }

    /** @return array<int, array{channel: string, sent_to: string}> */
    private function channelsFor(int $storeId, Customer $customer): array
    {
        $out = [];
        foreach ($this->gateway->available($storeId) as $channel) {
            $to = $channel === 'email' ? (string) $customer->email : (string) $customer->phone;
            if ($to !== '' && ($channel === 'email' ? filter_var($to, FILTER_VALIDATE_EMAIL) : strlen(preg_replace('/\D/', '', $to)) >= 10)) {
                $out[] = ['channel' => $channel, 'sent_to' => self::masked($channel, $to)];
            }
        }

        return $out;
    }

    public static function hash(string $value): string
    {
        return hash_hmac('sha256', $value, (string) config('app.key'));
    }

    private static function masked(string $channel, string $to): string
    {
        if ($channel === 'email') {
            [$name, $domain] = array_pad(explode('@', $to, 2), 2, '');

            return substr($name, 0, 2).'***@'.$domain;
        }
        $digits = preg_replace('/\D/', '', $to);

        return str_repeat('*', max(0, strlen($digits) - 4)).substr($digits, -4);
    }
}
