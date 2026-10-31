<?php

namespace App\Services;

use App\Models\PosSale;
use App\Models\Store;
use App\Models\SystemConfiguration;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Bills a till saved while it had no internet. Each counter numbers those from its own offline
 * series, INV-{store code}-{date}-F{counter id}-0001, so the printed receipt already carries the
 * final invoice number. The till keeps counting from the high-water mark this class records in
 * document_number_counters (origin "F{counter}"), which it fetches while it is online.
 *
 * The goods have already left the shop, so a stock shortfall, a piece barcode that was sold
 * elsewhere meanwhile, or a discount above the cashier's limit does not reject the bill: it is
 * saved and listed for a manager (pos_sales.sync_review). Only bills that need a live check
 * (credit, part payment, a return credit) are refused offline.
 */
class PosOfflineBilling
{
    /** How long a till may hold an offline bill before it must be entered by hand instead. */
    public const MAX_AGE_DAYS = 30;

    public static function seriesCode(int $counterId): string
    {
        return 'F'.$counterId;
    }

    /** What a till needs to number bills while offline. */
    public static function series(int $storeId, ?SystemConfiguration $counter): ?array
    {
        if (! $counter) {
            return null;
        }
        $code = self::seriesCode($counter->id);
        $period = now()->format('Ymd');

        return [
            'code' => $code,
            'prefix' => 'INV-'.self::storeCode($storeId).'-',
            'period' => $period,
            'next' => (int) (DB::table('document_number_counters')->where(['store_id' => $storeId, 'prefix' => 'INV', 'period' => $period, 'origin' => $code])->value('last_seq') ?? 0) + 1,
            // Invoice dates follow the server's clock; the till formats offline dates the same way.
            'utc_offset_minutes' => now()->utcOffset(),
        ];
    }

    /**
     * Validates an offline bill and decides its invoice number.
     *
     * @return array{billed_at: CarbonImmutable, invoice_no: string, issues: array<int, array<string, mixed>>}|null
     */
    public static function prepare(Request $request, int $storeId, ?SystemConfiguration $counter): ?array
    {
        if (! $request->filled('offline')) {
            return null;
        }
        $billedAt = CarbonImmutable::parse($request->input('offline.billedAt'))->setTimezone(config('app.timezone'));
        $number = (string) $request->input('offline.invoiceNo');
        if ($request->header('X-Sync-Replay') === '1') {
            // Local/cloud store sync re-sending a bill that was already accepted on the other node.
            return ['billed_at' => $billedAt, 'invoice_no' => DocumentNumberService::resolve($request, $storeId, 'INV'), 'issues' => []];
        }
        if (! $counter) {
            throw ValidationException::withMessages(['counter' => 'Offline bills need the counter they were billed on. Assign that counter and sync again.']);
        }
        if ($billedAt->isAfter(now()->addMinutes(10)) || $billedAt->isBefore(now()->subDays(self::MAX_AGE_DAYS))) {
            throw ValidationException::withMessages(['offline.billedAt' => 'This offline bill is dated '.$billedAt->format('d M Y H:i').', outside the last '.self::MAX_AGE_DAYS.' days. Check the till clock, then enter it by hand.']);
        }
        if ($request->boolean('isCredit') || $request->filled('appliedPosReturnId') || $request->input('saleSaveAs') !== 'paid_settled') {
            throw ValidationException::withMessages(['offline' => 'Only fully paid bills can be saved offline. Credit sales and return credits need the internet.']);
        }
        $period = $billedAt->format('Ymd');
        $code = self::seriesCode($counter->id);
        $prefix = 'INV-'.self::storeCode($storeId)."-$period-$code-";
        if (! str_starts_with($number, $prefix) || ! preg_match('/^\d{4,6}$/', substr($number, strlen($prefix)))) {
            throw ValidationException::withMessages(['offline.invoiceNo' => "Offline bill number $number is not from this counter's offline series ($prefix####)."]);
        }

        $issues = [];
        if (PosSale::where('store_id', $storeId)->where('invoice_no', $number)->lockForUpdate()->exists()) {
            // Two tills on one counter both billed offline: keep the bill, give it the next free number.
            $taken = PosSale::where('store_id', $storeId)->where('invoice_no', 'like', $prefix.'%')->pluck('invoice_no')
                ->map(fn ($no) => (int) substr($no, strlen($prefix)))->max();
            $renumbered = $prefix.str_pad((string) ($taken + 1), 4, '0', STR_PAD_LEFT);
            $issues[] = ['type' => 'renumbered', 'message' => "Printed as $number, which another bill already uses. Saved as $renumbered.", 'printed_no' => $number];
            $number = $renumbered;
        }
        $request->attributes->set('_mintedDocumentNumbers', [...$request->attributes->get('_mintedDocumentNumbers', []), 'INV' => $number]);

        return ['billed_at' => $billedAt, 'invoice_no' => $number, 'issues' => $issues];
    }

    /** Moves the counter's offline high-water mark so the next offline number never repeats. */
    public static function record(int $storeId, string $invoiceNo): void
    {
        if (! preg_match('/-(\d{8})-(F\d+)-(\d+)$/', $invoiceNo, $parts)) {
            return;
        }
        [, $period, $code, $seq] = $parts;
        $now = now();
        DB::table('document_number_counters')->insertOrIgnore(['store_id' => $storeId, 'prefix' => 'INV', 'period' => $period, 'origin' => $code, 'last_seq' => 0, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('document_number_counters')->where(['store_id' => $storeId, 'prefix' => 'INV', 'period' => $period, 'origin' => $code])
            ->where('last_seq', '<', (int) $seq)->update(['last_seq' => (int) $seq, 'updated_at' => $now]);
    }

    private static function storeCode(int $storeId): string
    {
        return Store::find($storeId)?->code ?: (string) $storeId;
    }
}
