<?php

namespace App\Services\Auth;

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

/** Login Sessions: what each sign-in (Sanctum token) is, for the tenant admin's list. */
class LoginSessions
{
    /** A minute of use counts as "active now" for this long. */
    public const ACTIVE_MINUTES = 5;

    /** Every new sign-in records the device, IP and store it was made from (all sign-in paths create a token). */
    public static function stamp(PersonalAccessToken $token): void
    {
        // Until the migration has run (mid-deploy), sign-in must keep working without these details.
        static $ready = null;
        $ready ??= Schema::hasColumn('personal_access_tokens', 'ip_address');
        if (! $ready) {
            return;
        }
        $request = request();
        $storeAbility = collect($token->abilities ?? [])->first(fn ($ability) => str_starts_with((string) $ability, 'store:'));
        $token->forceFill([
            'ip_address' => $request?->ip(),
            'user_agent' => Str::limit((string) $request?->userAgent(), 250, ''),
            'store_id' => $storeAbility ? (int) substr($storeAbility, 6)
                : ($request?->attributes->get('store_context_id') ?: ($token->tokenable?->store_id ?? null)),
        ]);
    }

    /** Web, Mobile app, Staff app (HR) or a counter's cloud failover sign-in. */
    public static function client(PersonalAccessToken $token): string
    {
        $abilities = $token->abilities ?? [];

        return match (true) {
            in_array('failover', $abilities, true) => 'failover',
            in_array('client:staff', $abilities, true) => 'staff',
            in_array('client:mobile', $abilities, true) => 'mobile',
            default => 'web',
        };
    }

    /** "Chrome on Windows" from a browser's user agent; the raw text when it is not a browser. */
    public static function device(?string $userAgent): string
    {
        $ua = (string) $userAgent;
        if ($ua === '') {
            return '-';
        }
        $browser = match (true) {
            str_contains($ua, 'Edg/') => 'Edge',
            str_contains($ua, 'OPR/') => 'Opera',
            str_contains($ua, 'Chrome/') => 'Chrome',
            str_contains($ua, 'Firefox/') => 'Firefox',
            str_contains($ua, 'Safari/') => 'Safari',
            default => null,
        };
        $os = match (true) {
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'iPhone') || str_contains($ua, 'iPad') => 'iOS',
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Mac OS') => 'macOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => null,
        };

        return $browser ? $browser.($os ? " on $os" : '') : Str::limit($ua, 60);
    }
}
