<?php

namespace App\Support;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Business days (India time) for queries on timestamp columns, which are stored in UTC (sale_date, return_date,
 * created_at, ...). A report for 17 Nov must cover 17 Nov 00:00–23:59 IST, i.e. 16 Nov 18:30 – 17 Nov 18:29:59 UTC;
 * comparing the UTC date put bills made between midnight and 5:30 am on the previous day.
 * Plain DATE columns (invoice_date, order_date, ...) already hold the business date and need none of this.
 */
final class BusinessDay
{
    public static function tz(): string
    {
        return (string) config('app.business_timezone', 'Asia/Kolkata');
    }

    /** Today's business date, Y-m-d. */
    public static function today(): string
    {
        return Carbon::now(self::tz())->toDateString();
    }

    /** UTC instant when business day $date starts (00:00 IST). */
    public static function start(string|CarbonInterface $date): Carbon
    {
        return self::local($date)->startOfDay()->utc();
    }

    /** UTC instant when business day $date ends (23:59:59 IST). */
    public static function end(string|CarbonInterface $date): Carbon
    {
        return self::local($date)->endOfDay()->utc();
    }

    /** [start, end] in UTC for whereBetween on a timestamp column, from one business date to another. */
    public static function range(string|CarbonInterface $from, string|CarbonInterface|null $to = null): array
    {
        return [self::start($from), self::end($to ?? $from)];
    }

    /** SQL for the business (IST) date of a UTC timestamp column, for GROUP BY / SELECT per day. */
    public static function dateSql(string $column): string
    {
        $minutes = Carbon::now(self::tz())->utcOffset();

        return in_array(DB::connection()->getDriverName(), ['sqlite'], true)
            ? "date({$column}, '".($minutes >= 0 ? '+' : '')."{$minutes} minutes')"
            : "DATE(DATE_ADD({$column}, INTERVAL {$minutes} MINUTE))";
    }

    /** A date string or Carbon read as a calendar day in the business timezone. */
    private static function local(string|CarbonInterface $date): Carbon
    {
        $day = $date instanceof CarbonInterface ? $date->format('Y-m-d') : substr(trim($date), 0, 10);

        return Carbon::createFromFormat('Y-m-d', $day, self::tz());
    }
}
