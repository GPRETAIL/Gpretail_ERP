<?php

namespace App\Console\Commands;

use App\Models\Store;
use App\Services\ReorderService;
use Illuminate\Console\Command;

/** Nightly: drafts purchase orders, per store and supplier, for items at or below their reorder level. */
class GeneratePurchaseOrders extends Command
{
    protected $signature = 'purchase-orders:generate {--store= : Only this store id}';

    protected $description = 'Draft purchase orders for items at or below their reorder level';

    public function handle(ReorderService $reorder): int
    {
        $stores = Store::query()->where('is_active', true)->when($this->option('store'), fn ($q, $id) => $q->whereKey($id))->pluck('name', 'id');
        foreach ($stores as $id => $name) {
            $drafts = $reorder->generate((int) $id);
            $this->line("{$name}: ".($drafts->isEmpty() ? 'nothing to reorder' : $drafts->count().' draft(s) '.$drafts->pluck('po_no')->implode(', ')));
        }

        return self::SUCCESS;
    }
}
