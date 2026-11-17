<?php

namespace App\Console\Commands;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use App\Services\Crm\LoyaltyExpiry;
use Illuminate\Console\Command;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

/**
 * Nightly: loyalty points past their expiry date leave customers' balances, and customers whose points expire in a
 * week get a reminder. A store with an on-prem server runs this once, there, through the API (POST loyalty/expire),
 * so the sync queue replays the same entries on the cloud; the cloud skips it (as purchase-orders:generate).
 */
class ExpireLoyaltyPoints extends Command
{
    protected $signature = 'loyalty:expire {--store= : Only this store id}';

    protected $description = 'Expire loyalty points past their date and remind customers of points expiring soon';

    public function handle(LoyaltyExpiry $expiry): int
    {
        $onPrem = config('sync.node_role') === 'local';
        $withOnPrem = StoreLocalNode::where('enabled', true)->pluck('store_id')->map(fn ($id) => (int) $id)->all();
        $stores = Store::query()->where('is_active', true)->when($this->option('store'), fn ($q, $id) => $q->whereKey($id))->pluck('name', 'id');
        foreach ($stores as $id => $name) {
            $hasOnPrem = in_array((int) $id, $withOnPrem, true);
            if ($hasOnPrem && ! $onPrem) {
                $this->line("{$name}: done by its on-prem server");

                continue;
            }
            $result = $hasOnPrem ? $this->throughApi((int) $id) : $expiry->run((int) $id);
            $this->line($result === null ? "{$name}: could not run (no active admin for this store)"
                : "{$name}: {$result['points']} point(s) expired for {$result['customers']} customer(s), {$result['reminded']} reminder(s) sent");
        }

        return self::SUCCESS;
    }

    private function throughApi(int $storeId): ?array
    {
        $store = Store::find($storeId);
        $actor = User::where('is_active', true)->where('role', 'admin')
            ->where(fn ($q) => $q->where('store_id', $storeId)->orWhere(fn ($q) => $q->whereNull('store_id')->where('platform_company_code', $store?->platform_company_code)))
            ->whereNotNull('username')->orderByRaw('store_id is null')->orderBy('id')->first();
        if (! $actor) {
            return null;
        }
        $token = $actor->createToken('loyalty-expiry-job', ['client:web']);
        try {
            $request = Request::create('/api/loyalty/expire', 'POST', server: [
                'HTTP_ACCEPT' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer '.$token->plainTextToken, 'HTTP_X_COMPANY_SCOPE_ID' => (string) $storeId,
            ]);
            $response = app(Kernel::class)->handle($request);

            return json_decode((string) $response->getContent(), true)['data'] ?? null;
        } finally {
            $token->accessToken->delete();
        }
    }
}
