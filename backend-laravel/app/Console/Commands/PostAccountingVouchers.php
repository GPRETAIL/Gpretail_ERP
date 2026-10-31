<?php

namespace App\Console\Commands;

use App\Services\Accounting\LedgerPoster;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Brings the books up to date: posts documents that have no voucher yet or changed since theirs
 * was written, and drops vouchers whose document is gone. Safe to run any number of times; a
 * document never gets two vouchers. --all reposts everything (e.g. after changing posting rules).
 */
class PostAccountingVouchers extends Command
{
    protected $signature = 'accounting:post {--all : Repost every document, not only new or changed ones} {--store= : Only this store id}';

    protected $description = 'Post bills, returns, purchases, payments and transfers to the double-entry books';

    public function handle(): int
    {
        $store = $this->option('store') ? (int) $this->option('store') : null;
        $failed = 0;
        foreach (LedgerPoster::SOURCES as $type => [$table, $storeColumn]) {
            $query = DB::table("$table as d")
                ->leftJoin('vouchers as v', fn ($join) => $join->on('v.source_id', '=', 'd.id')->where('v.source_type', '=', $type))
                ->when($store, fn ($q) => $q->where("d.$storeColumn", $store))
                ->when(! $this->option('all'), fn ($q) => $q->where(fn ($q) => $q->whereNull('v.id')->orWhereColumn('d.updated_at', '>', 'v.updated_at')));
            $posted = 0;
            // By id, not offset: posting changes which rows still match the filter.
            $query->select('d.id')->chunkById(500, function ($rows) use ($type, &$posted, &$failed) {
                foreach ($rows as $row) {
                    try {
                        LedgerPoster::post($type, (int) $row->id);
                        $posted++;
                    } catch (\Throwable $e) {
                        $failed++;
                        $this->warn("$type #{$row->id}: ".$e->getMessage());
                    }
                }
            }, 'd.id', 'id');
            // Vouchers whose bill or payment was deleted.
            $orphans = DB::table('vouchers as v')->where('v.source_type', $type)
                ->when($store, fn ($q) => $q->where('v.store_id', $store))
                ->whereNotExists(fn ($q) => $q->selectRaw('1')->from("$table as d")->whereColumn('d.id', 'v.source_id'))
                ->pluck('v.source_id');
            foreach ($orphans as $id) {
                LedgerPoster::post($type, (int) $id);
            }
            if ($posted || $orphans->isNotEmpty()) {
                $this->line(sprintf('%-17s %5d posted, %d removed', $type, $posted, $orphans->count()));
            }
        }
        $this->info($failed ? "Done with $failed document(s) that could not be posted (see above)." : 'Books are up to date.');

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
