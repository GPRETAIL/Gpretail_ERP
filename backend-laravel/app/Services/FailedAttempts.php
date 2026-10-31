<?php

namespace App\Services;

use Illuminate\Support\Facades\RateLimiter;

/**
 * Locks out repeated wrong guesses (passwords, approval PINs) per account rather than only per
 * IP, so spreading a guessing run across addresses or cashier logins doesn't help. Each limit is
 * [key, max failures, window seconds]; keys are hashed so usernames never land in the cache.
 */
class FailedAttempts
{
    /** Seconds until every limit allows another try (0 = allowed now). */
    public static function lockedFor(array $limits): int
    {
        $wait = 0;
        foreach ($limits as [$key, $max]) {
            if (RateLimiter::tooManyAttempts(self::key($key), $max)) {
                $wait = max($wait, RateLimiter::availableIn(self::key($key)));
            }
        }

        return $wait;
    }

    public static function fail(array $limits): void
    {
        foreach ($limits as [$key, , $window]) {
            RateLimiter::hit(self::key($key), $window);
        }
    }

    public static function clear(array $limits): void
    {
        foreach ($limits as [$key]) {
            RateLimiter::clear(self::key($key));
        }
    }

    public static function message(string $what, int $seconds): string
    {
        $minutes = max(1, (int) ceil($seconds / 60));

        return "Too many wrong {$what}. Try again in {$minutes} minute".($minutes === 1 ? '' : 's').'.';
    }

    private static function key(string $key): string
    {
        return 'failed-attempts:'.hash('sha256', $key);
    }
}
