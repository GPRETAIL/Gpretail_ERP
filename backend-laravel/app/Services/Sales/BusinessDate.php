<?php

namespace App\Services\Sales;

use App\Models\User;
use App\Services\Tenancy\StoreContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Which date a counter bills on. Sales Customisation > "Billing date after cash closing":
 * - off: always today;
 * - auto: once the counter's cash closing for today is done, tomorrow (until the day turns);
 * - manual: any date from today to MAX_DAYS_AHEAD ahead, set for the counter by the tenant admin or by the roles and
 *   users the tenant admin allows (Sales Customisation > billingDateChangers).
 * Never earlier than today. Dates are shop (business time zone) dates.
 *
 * A bill on a later business date is stamped at the start of that day plus the time since the closing (or since the
 * date was set), so it sorts in order, falls on that day in every report and is counted in the counter's next cash
 * session; billed_at keeps the real time.
 */
class BusinessDate
{
    public const MODES = ['off', 'auto', 'manual'];

    /** Manual mode: how far ahead a counter's billing date may be set (e.g. for a holiday closing). */
    public const MAX_DAYS_AHEAD = 7;

    public function mode(int $storeId): string
    {
        $value = (string) (DB::table('stores')->where('id', $storeId)->value('receipt_customization') ?? '');
        $mode = json_decode($value, true)['billingDateAfterClosing'] ?? 'off';

        return in_array($mode, self::MODES, true) ? $mode : 'off';
    }

    public static function today(): Carbon
    {
        return Carbon::today(config('app.business_timezone'));
    }

    /**
     * @return array{mode: string, date: string, today: string, shifted: bool, reason: ?string, since: ?Carbon}
     */
    public function forCounter(int $storeId, ?int $counterId): array
    {
        $mode = $this->mode($storeId);
        $today = self::today();
        $date = $today->copy();
        $reason = null;
        $since = null;

        if ($mode === 'auto') {
            $closed = DB::table('cash_register_sessions')->where('store_id', $storeId)->where('status', 'CLOSED')
                ->when($counterId, fn ($q) => $q->where('counter_id', $counterId), fn ($q) => $q->whereNull('counter_id'))
                ->orderByDesc('closed_at')->first(['closed_at', 'business_date']);
            $closedDay = $closed ? ($closed->business_date ? substr((string) $closed->business_date, 0, 10)
                : Carbon::parse($closed->closed_at)->setTimezone(config('app.business_timezone'))->toDateString()) : null;
            $openToday = DB::table('cash_register_sessions')->where('store_id', $storeId)->where('status', 'OPEN')
                ->when($counterId, fn ($q) => $q->where('counter_id', $counterId), fn ($q) => $q->whereNull('counter_id'))
                ->where(fn ($q) => $q->whereNull('business_date')->orWhereDate('business_date', '<=', $today->toDateString()))->exists();
            if ($closedDay === $today->toDateString() && ! $openToday) {
                $date = $today->copy()->addDay();
                $reason = 'Day closed for '.$today->format('j M').': new bills are dated '.$date->format('j M').'.';
                $since = Carbon::parse($closed->closed_at);
            }
        } elseif ($mode === 'manual') {
            $set = DB::table('counter_billing_dates')->where('store_id', $storeId)
                ->when($counterId, fn ($q) => $q->where('counter_id', $counterId), fn ($q) => $q->whereNull('counter_id'))->first();
            if ($set && substr((string) $set->business_date, 0, 10) > $today->toDateString()) {
                $date = Carbon::parse(substr((string) $set->business_date, 0, 10), config('app.business_timezone'))->startOfDay();
                $reason = 'Billing date set to '.$date->format('j M').' for this counter.';
                $since = Carbon::parse($set->set_at);
            }
        }

        return ['mode' => $mode, 'date' => $date->toDateString(), 'today' => $today->toDateString(),
            'shifted' => $date->gt($today), 'reason' => $reason, 'since' => $since];
    }

    /**
     * The sale_date to store for a bill billed now: now, or on a later business date the start of that day plus the
     * time since the closing (capped below the day's end).
     */
    public function stamp(array $state): Carbon
    {
        if (! $state['shifted']) {
            return now();
        }
        $start = Carbon::parse($state['date'], config('app.business_timezone'))->startOfDay();
        $elapsed = $state['since'] ? max(0, (int) $state['since']->diffInSeconds(now(), false)) : 0;

        return $start->addSeconds(min($elapsed, 86399))->setTimezone(config('app.timezone'));
    }

    /**
     * Who may change a counter's billing date: the tenant admin always; anyone else only when the tenant admin allowed
     * their role or them by name (Sales Customisation > "Who can change the billing date").
     */
    public function mayChange(User $user, int $storeId): bool
    {
        if (app(StoreContext::class)->isTenantAdmin($user)) {
            return true;
        }
        $allowed = $this->changers($storeId);

        return in_array($user->role, $allowed['roles'], true) || in_array((int) $user->id, $allowed['users'], true);
    }

    /** @return array{roles: list<string>, users: list<int>} */
    public function changers(int $storeId): array
    {
        $value = json_decode((string) (DB::table('stores')->where('id', $storeId)->value('receipt_customization') ?? ''), true)['billingDateChangers'] ?? [];

        return ['roles' => array_values(array_filter((array) ($value['roles'] ?? []), 'is_string')),
            'users' => array_values(array_map('intval', array_filter((array) ($value['users'] ?? []), 'is_numeric')))];
    }

    /** Manual mode: sets the counter's billing date: 'today', 'tomorrow' or a date up to MAX_DAYS_AHEAD ahead. */
    public function setForCounter(User $user, int $storeId, ?int $counterId, string $which): array
    {
        if ($this->mode($storeId) !== 'manual') {
            throw ValidationException::withMessages(['date' => 'Changing the billing date is switched off in Sales Customisation.']);
        }
        abort_unless($this->mayChange($user, $storeId), 403, 'Only the tenant admin, or the users they allow in Sales Customisation, can change the billing date.');
        $today = self::today();
        $date = match (true) {
            $which === 'today' => $today->copy(),
            $which === 'tomorrow' => $today->copy()->addDay(),
            (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $which) => Carbon::parse($which, config('app.business_timezone'))->startOfDay(),
            default => throw ValidationException::withMessages(['date' => 'Choose a date.']),
        };
        if ($date->lt($today) || $date->gt($today->copy()->addDays(self::MAX_DAYS_AHEAD))) {
            throw ValidationException::withMessages(['date' => 'The billing date can be from today up to '.self::MAX_DAYS_AHEAD.' days ahead ('.$today->copy()->addDays(self::MAX_DAYS_AHEAD)->format('j M').').']);
        }
        DB::table('counter_billing_dates')->updateOrInsert(
            ['store_id' => $storeId, 'counter_id' => $counterId],
            ['business_date' => $date->toDateString(), 'set_by' => $user->id, 'set_at' => now(), 'updated_at' => now(), 'created_at' => now()],
        );

        return $this->forCounter($storeId, $counterId);
    }
}
