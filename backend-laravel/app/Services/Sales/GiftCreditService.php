<?php

namespace App\Services\Sales;

use App\Models\GiftCredit;
use App\Models\GiftCreditRedemption;
use App\Models\PosPayment;
use App\Models\PosSale;
use App\Services\Documents\DocumentNumberService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Gift vouchers, credit notes and coupons: one engine. A credit is issued with a number, an amount and an expiry; a bill can
 * use it as a payment (in parts for vouchers and credit notes, once for a coupon); cancelling the bill gives the amount back.
 * Every query is for one store, and rows are locked while a bill uses them so the same credit cannot be spent twice.
 */
class GiftCreditService
{
    /** Number prefixes, so the same number is minted on the on-prem server and the cloud (DocumentNumberService). */
    public const PREFIX = [GiftCredit::GIFT_VOUCHER => 'GVC', GiftCredit::CREDIT_NOTE => 'CRN', GiftCredit::COUPON => 'CPN'];

    /** The short form shown and typed at the till: CN261125-0001 for CRN-<store>-20261125-0001. */
    public const LETTER = [GiftCredit::GIFT_VOUCHER => 'GV', GiftCredit::CREDIT_NOTE => 'CN', GiftCredit::COUPON => 'CP'];

    /** The payment mode written on the bill's payment row. */
    public const PAYMENT_MODE = [GiftCredit::GIFT_VOUCHER => 'GIFT_VOUCHER', GiftCredit::CREDIT_NOTE => 'CREDIT_NOTE', GiftCredit::COUPON => 'COUPON'];

    public const LABEL = [GiftCredit::GIFT_VOUCHER => 'gift voucher', GiftCredit::CREDIT_NOTE => 'credit note', GiftCredit::COUPON => 'coupon'];

    /** How many credits one bill can use. */
    public const MAX_PER_BILL = 5;

    private const DEFAULT_EXPIRY_DAYS = [GiftCredit::GIFT_VOUCHER => 365, GiftCredit::CREDIT_NOTE => 90, GiftCredit::COUPON => 30];

    private const SETTING_KEY = [GiftCredit::GIFT_VOUCHER => 'voucherExpiryDays', GiftCredit::CREDIT_NOTE => 'creditNoteExpiryDays'];

    /** @param array{customer_id?: int|null, source_pos_return_id?: int|null, source_pos_sale_id?: int|null, expires_on?: string|null, min_bill_amount?: float|null, payment_mode?: string|null, payment_reference?: string|null, counter_id?: int|null, buyer_name?: string|null, buyer_phone?: string|null, date?: \DateTimeInterface|null, created_by?: int|null}  $attributes */
    public function issue(Request $request, int $storeId, string $kind, float $amount, array $attributes = []): GiftCredit
    {
        $date = $attributes['date'] ?? null;
        $number = DocumentNumberService::resolve($request, $storeId, self::PREFIX[$kind], $date);
        $issuedOn = CarbonImmutable::parse($date ?? now(config('app.business_timezone')))->toDateString();
        $expires = array_key_exists('expires_on', $attributes) ? $attributes['expires_on'] : $this->expiryDate($storeId, $kind, $issuedOn);

        return GiftCredit::create([
            'store_id' => $storeId,
            'kind' => $kind,
            'number' => $number,
            'customer_id' => $attributes['customer_id'] ?? null,
            'source_pos_return_id' => $attributes['source_pos_return_id'] ?? null,
            'source_pos_sale_id' => $attributes['source_pos_sale_id'] ?? null,
            'issued_on' => $issuedOn,
            'expires_on' => $expires,
            'original_amount' => round($amount, 2),
            'balance' => round($amount, 2),
            'min_bill_amount' => $attributes['min_bill_amount'] ?? null,
            'payment_mode' => $attributes['payment_mode'] ?? null,
            'payment_reference' => $attributes['payment_reference'] ?? null,
            'counter_id' => $attributes['counter_id'] ?? null,
            'buyer_name' => $attributes['buyer_name'] ?? null,
            'buyer_phone' => $attributes['buyer_phone'] ?? null,
            'status' => 'ACTIVE',
            'created_by' => $attributes['created_by'] ?? $request->user()?->id,
        ]);
    }

    /** Sales Customisation sets the days (voucherExpiryDays, creditNoteExpiryDays); 0 means it never expires. */
    public function expiryDate(int $storeId, string $kind, string $issuedOn): ?string
    {
        $settings = json_decode((string) (DB::table('stores')->where('id', $storeId)->value('receipt_customization') ?? ''), true) ?: [];
        $days = array_key_exists(self::SETTING_KEY[$kind] ?? '', $settings) ? (int) $settings[self::SETTING_KEY[$kind]] : self::DEFAULT_EXPIRY_DAYS[$kind];

        return $days > 0 ? CarbonImmutable::parse($issuedOn)->addDays($days)->toDateString() : null;
    }

    public function displayNumber(GiftCredit $credit): string
    {
        return DocumentNumberService::short($credit->number, self::LETTER[$credit->kind] ?? 'GC');
    }

    /** By the full number or the short form the till shows (CN261125-0001), in this store only. */
    public function find(int $storeId, string $typed, bool $lock = false): ?GiftCredit
    {
        $typed = trim($typed);
        if ($typed === '' || strlen($typed) > 80) {
            return null;
        }
        foreach (self::LETTER as $kind => $letter) {
            $query = GiftCredit::where('store_id', $storeId)->where('kind', $kind);
            DocumentNumberService::whereNumber($query, 'number', $typed, $letter);
            if ($lock) {
                $query->lockForUpdate();
            }
            if ($credit = $query->first()) {
                return $credit;
            }
        }

        return null;
    }

    /** Why this credit cannot be used on a bill of this size, in plain words; null when it can. */
    public function problem(GiftCredit $credit, float $billTotal): ?string
    {
        $label = self::LABEL[$credit->kind] ?? 'credit';
        $state = $credit->state;
        if ($state === 'USED') {
            return "This {$label} is already used.";
        }
        if ($state === 'CANCELLED') {
            return "This {$label} was cancelled.";
        }
        if ($state === 'EXPIRED') {
            return "This {$label} expired on ".$credit->expires_on->format('d M Y').'.';
        }
        if ($credit->min_bill_amount !== null && $billTotal + 0.004 < (float) $credit->min_bill_amount) {
            return 'This coupon needs a bill of at least '.$this->money((float) $credit->min_bill_amount).'.';
        }

        return null;
    }

    /** For the till: what a code is worth on this bill. A wrong or unusable code is a 422 with the reason. */
    public function quote(int $storeId, string $typed, float $billTotal, float $due): array
    {
        $credit = $this->find($storeId, $typed);
        if (! $credit) {
            throw ValidationException::withMessages(['number' => 'This code was not found. Check the number and try again.']);
        }
        if ($message = $this->problem($credit, $billTotal)) {
            throw ValidationException::withMessages(['number' => $message]);
        }
        $balance = (float) $credit->balance;

        return [
            'number' => $credit->number,
            'display_number' => $this->displayNumber($credit),
            'kind' => $credit->kind,
            'kind_label' => self::LABEL[$credit->kind],
            'balance' => $balance,
            'expires_on' => $credit->expires_on?->toDateString(),
            // A coupon is used whole, once. A voucher or credit note can be used in part.
            'single_use' => $credit->kind === GiftCredit::COUPON,
            'max_use' => round(min($balance, max(0, $due)), 2),
        ];
    }

    /**
     * Checks what the till asked to use and locks those rows for this bill.
     *
     * @param  list<array{number?: string, amount?: float|int|string}>|null  $requested
     * @param  float  $cap  The most the bill can take from credits (what is still due after loyalty points).
     * @return list<array{credit: GiftCredit, amount: float}>
     */
    public function authorize(int $storeId, ?array $requested, float $billTotal, float $cap): array
    {
        if (! $requested) {
            return [];
        }
        if (count($requested) > self::MAX_PER_BILL) {
            throw ValidationException::withMessages(['vouchers' => 'A bill can use up to '.self::MAX_PER_BILL.' vouchers, credit notes or coupons.']);
        }
        $uses = [];
        $left = round(max(0, $cap), 2);
        $seen = [];
        foreach ($requested as $index => $row) {
            $credit = $this->find($storeId, (string) ($row['number'] ?? ''), true);
            if (! $credit) {
                throw ValidationException::withMessages(["vouchers.$index.number" => 'This code was not found. Check the number and try again.']);
            }
            if (isset($seen[$credit->id])) {
                throw ValidationException::withMessages(["vouchers.$index.number" => 'The same code is on this bill twice.']);
            }
            $seen[$credit->id] = true;
            if ($message = $this->problem($credit, $billTotal)) {
                throw ValidationException::withMessages(["vouchers.$index.number" => $message]);
            }
            $balance = (float) $credit->balance;
            // A coupon is used whole and once; if the bill is smaller than the coupon, the rest of it is gone.
            $amount = $credit->kind === GiftCredit::COUPON ? min($balance, $left) : round((float) ($row['amount'] ?? 0), 2);
            if ($amount <= 0) {
                throw ValidationException::withMessages(["vouchers.$index.amount" => 'Enter the amount to use from '.$this->displayNumber($credit).'.']);
            }
            if ($amount > $balance + 0.004) {
                throw ValidationException::withMessages(["vouchers.$index.amount" => 'Only '.$this->money($balance).' is left on '.$this->displayNumber($credit).'.']);
            }
            if ($amount > $left + 0.004) {
                throw ValidationException::withMessages(["vouchers.$index.amount" => 'The bill needs only '.$this->money($left).' more.']);
            }
            $left = round($left - $amount, 2);
            $uses[] = ['credit' => $credit, 'amount' => $amount];
        }

        return $uses;
    }

    /**
     * Writes the uses of an authorised list: a redemption row and a payment row each, and the new balance. A coupon is
     * finished after one use; a voucher or credit note is finished when nothing is left.
     *
     * @param  list<array{credit: GiftCredit, amount: float}>  $uses
     */
    public function redeem(PosSale $sale, array $uses, ?int $userId): void
    {
        $day = CarbonImmutable::parse($sale->sale_date ?? now())->toDateString();
        foreach ($uses as ['credit' => $credit, 'amount' => $amount]) {
            GiftCreditRedemption::create([
                'store_id' => $sale->store_id, 'gift_credit_id' => $credit->id, 'pos_sale_id' => $sale->id,
                'amount' => $amount, 'redeemed_on' => $day, 'created_by' => $userId,
            ]);
            $balance = round((float) $credit->balance - $amount, 2);
            $credit->forceFill([
                'balance' => $credit->kind === GiftCredit::COUPON ? 0 : $balance,
                'status' => $credit->kind === GiftCredit::COUPON || $balance <= 0.004 ? 'USED' : 'ACTIVE',
            ])->save();
            PosPayment::create([
                'pos_sale_id' => $sale->id, 'payment_mode' => self::PAYMENT_MODE[$credit->kind], 'amount' => $amount, 'reference_no' => $credit->number,
            ]);
        }
    }

    /** Cancelling a bill gives back what it used. The use rows stay, marked reversed. */
    public function reverseSale(PosSale $sale): void
    {
        $rows = GiftCreditRedemption::where('pos_sale_id', $sale->id)->whereNull('reversed_at')->get();
        foreach ($rows as $row) {
            $credit = GiftCredit::where('id', $row->gift_credit_id)->lockForUpdate()->first();
            if ($credit) {
                $restored = $credit->kind === GiftCredit::COUPON ? (float) $credit->original_amount : round((float) $credit->balance + (float) $row->amount, 2);
                $credit->forceFill([
                    'balance' => min((float) $credit->original_amount, $restored),
                    'status' => $credit->status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE',
                ])->save();
            }
            $row->forceFill(['reversed_at' => now()])->save();
        }
    }

    /** What a bill used, for its receipt: the number, what was taken and what is left on it. */
    public function usedOnSale(int $saleId): array
    {
        return GiftCreditRedemption::with('giftCredit')->where('pos_sale_id', $saleId)->whereNull('reversed_at')->orderBy('id')->get()
            ->map(fn (GiftCreditRedemption $row) => [
                'number' => $row->giftCredit?->number,
                'display_number' => $row->giftCredit ? $this->displayNumber($row->giftCredit) : null,
                'kind' => $row->giftCredit?->kind,
                'amount' => (float) $row->amount,
                'balance_after' => $row->giftCredit ? (float) $row->giftCredit->balance : 0.0,
            ])->all();
    }

    private function money(float $amount): string
    {
        return '₹'.number_format($amount, 2);
    }
}
