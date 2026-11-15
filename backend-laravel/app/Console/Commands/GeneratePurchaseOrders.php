<?php

namespace App\Console\Commands;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use App\Services\Inventory\ReorderService;
use Illuminate\Console\Command;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Nightly: drafts purchase orders, per store and supplier, for items at or below their reorder level.
 *
 * A store with an on-prem server drafts them once, there: the cloud skips it, and the on-prem server runs the
 * reorder as a normal API request, which is queued and replayed on the cloud like any other write (same drafts,
 * record numbers and PO numbers). Before, both sides drafted their own, different orders.
 */
class GeneratePurchaseOrders extends Command
{
    protected $signature = 'purchase-orders:generate {--store= : Only this store id}';

    protected $description = 'Draft purchase orders for items at or below their reorder level';

    public function handle(ReorderService $reorder): int
    {
        $onPrem = config('sync.node_role') === 'local';
        $withOnPrem = StoreLocalNode::where('enabled', true)->pluck('store_id')->map(fn ($id) => (int) $id)->all();
        $stores = Store::query()->where('is_active', true)->when($this->option('store'), fn ($q, $id) => $q->whereKey($id))->pluck('name', 'id');
        foreach ($stores as $id => $name) {
            $hasOnPrem = in_array((int) $id, $withOnPrem, true);
            if ($hasOnPrem && ! $onPrem) {
                $this->line("{$name}: drafted by its on-prem server");

                continue;
            }
            $drafts = $hasOnPrem ? $this->throughApi((int) $id) : $reorder->generate((int) $id)->pluck('po_no');
            $this->line("{$name}: ".($drafts === null ? 'could not run (no active admin for this store)'
                : ($drafts->isEmpty() ? 'nothing to reorder' : $drafts->count().' draft(s) '.$drafts->implode(', '))));
        }

        return self::SUCCESS;
    }

    /** Runs the reorder through POST purchase-orders/generate as the store's admin, so the sync queue carries it. */
    private function throughApi(int $storeId): ?Collection
    {
        $store = Store::find($storeId);
        $actor = User::where('is_active', true)->where('role', 'admin')
            ->where(fn ($q) => $q->where('store_id', $storeId)->orWhere(fn ($q) => $q->whereNull('store_id')->where('platform_company_code', $store?->platform_company_code)))
            ->whereNotNull('username')->orderByRaw('store_id is null')->orderBy('id')->first();
        if (! $actor) {
            return null;
        }
        $token = $actor->createToken('reorder-job', ['client:web']);
        try {
            $request = Request::create('/api/purchase-orders/generate', 'POST', server: [
                'HTTP_ACCEPT' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer '.$token->plainTextToken, 'HTTP_X_COMPANY_SCOPE_ID' => (string) $storeId,
            ]);
            $response = app(Kernel::class)->handle($request);

            return collect(json_decode((string) $response->getContent(), true)['data'] ?? [])->pluck('po_no');
        } finally {
            $token->accessToken->delete();
        }
    }
}
