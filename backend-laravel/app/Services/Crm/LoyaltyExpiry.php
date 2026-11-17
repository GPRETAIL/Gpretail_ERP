<?php

namespace App\Services\Crm;

use App\Models\Customer;
use App\Models\Store;
use App\Services\Messaging\MessageGateway;
use App\Services\Sales\BusinessDate;
use Illuminate\Support\Facades\DB;

/**
 * Nightly, per store: points past their expiry date leave customers' balances (EXPIRE rows), and customers whose
 * points expire in 7 days get a reminder on the first channel that reaches them (Settings > Messaging).
 */
class LoyaltyExpiry
{
    public const REMIND_DAYS = 7;

    public function __construct(private LoyaltyLedger $ledger, private MessageGateway $gateway) {}

    /** @return array{customers: int, points: int, reminded: int} */
    public function run(int $storeId): array
    {
        $today = BusinessDate::today()->toDateString();
        $customers = DB::table('loyalty_transactions')->where('store_id', $storeId)->whereIn('type', LoyaltyLedger::IN)
            ->where('remaining', '>', 0)->whereNotNull('expires_at')->whereDate('expires_at', '<', $today)->distinct()->pluck('customer_id');
        $points = 0;
        foreach ($customers as $customerId) {
            $points += DB::transaction(function () use ($customerId, $today) {
                $customer = Customer::query()->withoutGlobalScopes()->whereKey($customerId)->lockForUpdate()->first();

                return $customer ? $this->ledger->expire($customer, $today) : 0;
            });
        }

        return ['customers' => $customers->count(), 'points' => $points, 'reminded' => $this->remind($storeId)];
    }

    /** Customers whose points expire exactly REMIND_DAYS from today (so each expiry date is reminded once). */
    private function remind(int $storeId): int
    {
        $channels = $this->gateway->available($storeId);
        if (! $channels) {
            return 0;
        }
        $day = BusinessDate::today()->addDays(self::REMIND_DAYS);
        $due = DB::table('loyalty_transactions')->where('store_id', $storeId)->whereIn('type', LoyaltyLedger::IN)->where('remaining', '>', 0)
            ->whereDate('expires_at', $day->toDateString())->selectRaw('customer_id, SUM(remaining) as points')->groupBy('customer_id')->pluck('points', 'customer_id');
        if ($due->isEmpty()) {
            return 0;
        }
        $store = (string) Store::query()->withoutGlobalScopes()->whereKey($storeId)->value('name');
        $sent = 0;
        foreach (Customer::query()->withoutGlobalScopes()->whereIn('id', $due->keys())->where('disable_loyalty', false)->get(['id', 'name', 'phone', 'email']) as $customer) {
            foreach ($channels as $channel) {
                $to = $channel === 'email' ? (string) $customer->email : (string) $customer->phone;
                if ($to === '') {
                    continue;
                }
                $result = $this->gateway->sendReminder($storeId, $channel, $to, ['name' => $customer->name, 'points' => (int) $due[$customer->id],
                    'date' => $day->format('d M Y'), 'store' => $store]);
                if ($result['ok']) {
                    $sent++;
                    break;
                }
            }
        }

        return $sent;
    }
}
