<?php

namespace App\Services;

use App\Models\DocumentNumberCounter;
use App\Models\Store;
use App\Models\StoreLocalNode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Mints document numbers (invoice, bill, order, etc.) that stay unique across a
 * store's local install and the shared cloud install once both can independently
 * write for the same store (local-server / cloud-failover). See
 * document_number_counters: one row per store+prefix+day+origin, incremented
 * inside a transaction with a row-level lock (SELECT ... FOR UPDATE), so
 * concurrent requests for the same counter are serialized rather than racing.
 *
 * Note: this deliberately does not use MySQL/MariaDB's common
 * INSERT ... ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)
 * trick. That pattern only works on tables with no auto-increment column of
 * their own -- here document_number_counters has its own `id`, and on a fresh
 * INSERT (no prior row for that store+prefix+day) the engine's own
 * auto-increment assignment overwrites LAST_INSERT_ID() with that row's `id`
 * instead of the value the statement explicitly requested, corrupting the
 * very first mint of every new counter. Confirmed by testing directly against
 * the real dev database before settling on the lock-based approach below.
 */
class DocumentNumberService
{
    /**
     * The request-aware entry point every controller call site should use. Detects
     * whether this request is a sync replay (X-Sync-Replay header, set only by
     * SyncCycleService when pushing a queued local write to cloud or a queued cloud
     * write down to local) and, if so, reuses the original number instead of minting
     * a new one. Also stashes whatever number it mints/reuses onto the request's
     * attribute bag so CaptureSyncOutbox can read it back after the controller
     * returns and include it in what gets queued for the *next* hop -- this is what
     * lets a plain generic capture-and-replay pipeline preserve document numbers
     * without every controller/middleware needing to know each other's field names.
     */
    public static function resolve(Request $request, int $storeId, string $prefix): string
    {
        $isReplay = $request->header('X-Sync-Replay') === '1';
        $suppliedNumber = $request->input("_syncDocumentNumbers.{$prefix}");

        $number = self::next($storeId, $prefix, $isReplay, $suppliedNumber);

        $minted = $request->attributes->get('_mintedDocumentNumbers', []);
        $minted[$prefix] = $number;
        $request->attributes->set('_mintedDocumentNumbers', $minted);

        return $number;
    }

    public static function next(int $storeId, string $prefix, bool $isReplay = false, ?string $suppliedNumber = null): string
    {
        if ($isReplay) {
            if (! $suppliedNumber) {
                throw new \InvalidArgumentException('A replayed write must supply its original document number.');
            }

            return $suppliedNumber;
        }

        $store = Store::find($storeId);
        $storeCode = $store?->code ?: (string) $storeId;
        $period = now()->format('Ymd');
        $origin = self::resolveOrigin($storeId);

        $seq = DB::transaction(function () use ($storeId, $prefix, $period, $origin) {
            $now = now();

            DB::statement(
                'INSERT IGNORE INTO document_number_counters (store_id, prefix, period, origin, last_seq, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 0, ?, ?)',
                [$storeId, $prefix, $period, $origin, $now, $now]
            );

            $row = DB::table('document_number_counters')
                ->where(['store_id' => $storeId, 'prefix' => $prefix, 'period' => $period, 'origin' => $origin])
                ->lockForUpdate()
                ->first();

            $newSeq = (int) $row->last_seq + 1;

            DB::table('document_number_counters')->where('id', $row->id)->update([
                'last_seq' => $newSeq,
                'updated_at' => $now,
            ]);

            return $newSeq;
        }, 5); // retries: the INSERT IGNORE + lockForUpdate pair can deadlock under real
        // concurrent contention on a brand new row (confirmed under a 10-way parallel
        // test against the real dev DB) before the unique index is settled; Laravel
        // retries the whole closure on a deadlock when attempts > 1.

        $padded = str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        $suffix = $origin === 'cloud_failover' ? "C{$padded}" : $padded;

        return "{$prefix}-{$storeCode}-{$period}-{$suffix}";
    }

    /**
     * Read-only preview of what next() would mint right now, without consuming a
     * sequence number -- for "next bill no" UI previews, which must not create gaps
     * every time a cashier reopens/refreshes the screen.
     */
    public static function peek(int $storeId, string $prefix): string
    {
        $store = Store::find($storeId);
        $storeCode = $store?->code ?: (string) $storeId;
        $period = now()->format('Ymd');
        $origin = self::resolveOrigin($storeId);

        $padded = str_pad((string) self::peekSeq($storeId, $prefix), 4, '0', STR_PAD_LEFT);
        $suffix = $origin === 'cloud_failover' ? "C{$padded}" : $padded;

        return "{$prefix}-{$storeCode}-{$period}-{$suffix}";
    }

    /**
     * Raw next sequence number (no prefix/store-code/date formatting) -- for callers
     * that only ever displayed a plain running counter, not the full document number.
     */
    public static function peekSeq(int $storeId, string $prefix): int
    {
        $period = now()->format('Ymd');
        $origin = self::resolveOrigin($storeId);

        $counter = DocumentNumberCounter::where([
            'store_id' => $storeId,
            'prefix' => $prefix,
            'period' => $period,
            'origin' => $origin,
        ])->first();

        return ($counter->last_seq ?? 0) + 1;
    }

    /**
     * 'cloud_failover' only when this node is the shared cloud install AND the store
     * has local-server sync enabled -- i.e. this write can only be happening because
     * the store's local install is unreachable right now. Every other case (a plain
     * cloud-only store, or the local install itself) uses 'normal', so the everyday
     * number format is unchanged and the C-marker only ever appears on numbers minted
     * during a real outage.
     */
    private static function resolveOrigin(int $storeId): string
    {
        if (config('sync.node_role') !== 'cloud') {
            return 'normal';
        }

        $hasEnabledLocalNode = StoreLocalNode::where('store_id', $storeId)->where('enabled', true)->exists();

        return $hasEnabledLocalNode ? 'cloud_failover' : 'normal';
    }
}
