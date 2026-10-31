<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PosCheckoutAttempt
{
    /** Called inside the sale transaction; concurrent retries wait for its outcome. */
    public static function reserve(Request $request, int $storeId): ?object
    {
        if (! $request->filled('checkoutKey')) {
            return null; // Existing integrations remain compatible.
        }
        // "offline" is left out: a bill whose online save timed out may be queued offline with the
        // same key, and must then resolve to whichever save actually landed, not a 409.
        $payload = $request->except(['checkoutKey', 'saleAt', 'offline', '_syncDocumentNumbers']);
        $canonicalize = function (array $value) use (&$canonicalize): array {
            if (! array_is_list($value)) {
                ksort($value);
            }
            foreach ($value as &$entry) {
                if (is_array($entry)) {
                    $entry = $canonicalize($entry);
                }
            }

            return $value;
        };
        $hash = hash('sha256', json_encode($canonicalize($payload), JSON_THROW_ON_ERROR));
        $inserted = DB::table('pos_checkout_requests')->insertOrIgnore([
            'store_id' => $storeId,
            'user_id' => $request->user()->id,
            'checkout_key' => $request->input('checkoutKey'),
            'payload_hash' => $hash,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $attempt = DB::table('pos_checkout_requests')->where('store_id', $storeId)
            ->where('checkout_key', $request->input('checkoutKey'))->lockForUpdate()->first();
        abort_unless($attempt && (int) $attempt->user_id === (int) $request->user()->id && hash_equals($attempt->payload_hash, $hash), 409, 'This checkout key belongs to a different sale.');
        abort_if(! $inserted && ! $attempt->pos_sale_id, 409, 'This checkout was cancelled. Check the sales list before starting another sale.');

        return $attempt;
    }

    public static function complete(?object $attempt, int $saleId): void
    {
        if ($attempt) {
            DB::table('pos_checkout_requests')->where('id', $attempt->id)->update(['pos_sale_id' => $saleId, 'updated_at' => now()]);
        }
    }
}
