<?php

namespace App\Services\Reports\Scheduled;

use Carbon\CarbonImmutable;

/** The date range a scheduled report covers, worked out on the day it is sent (business time zone). */
class ReportPeriod
{
    public const PERIODS = [
        'yesterday' => 'Yesterday',
        'today' => 'Today',
        'last_7_days' => 'Last 7 days',
        'this_week' => 'This week (Mon to today)',
        'last_week' => 'Last week (Mon to Sun)',
        'month_to_date' => 'This month to date',
        'last_month' => 'Last month',
        'as_of_today' => 'As on today',
    ];

    /** @return array{0: string, 1: string} [from, to] as Y-m-d */
    public static function resolve(string $period, ?CarbonImmutable $today = null): array
    {
        $today ??= CarbonImmutable::now(config('app.business_timezone'))->startOfDay();

        [$from, $to] = match ($period) {
            'today', 'as_of_today' => [$today, $today],
            'last_7_days' => [$today->subDays(7), $today->subDay()],
            'this_week' => [$today->startOfWeek(), $today],
            'last_week' => [$today->subWeek()->startOfWeek(), $today->subWeek()->endOfWeek()],
            'month_to_date' => [$today->startOfMonth(), $today],
            'last_month' => [$today->subMonthNoOverflow()->startOfMonth(), $today->subMonthNoOverflow()->endOfMonth()],
            default => [$today->subDay(), $today->subDay()],
        };

        return [$from->toDateString(), $to->toDateString()];
    }

    public static function describe(string $from, string $to): string
    {
        $f = CarbonImmutable::parse($from);
        $t = CarbonImmutable::parse($to);

        return $from === $to ? $f->format('d M Y') : $f->format('d M Y').' to '.$t->format('d M Y');
    }
}
