<?php

namespace App\Services\Platform;

use Illuminate\Support\Facades\Cache;

/**
 * What the on-prem sync is doing right now, for the footer ("Syncing… 12 left") and the Configure Local Server
 * page. Set only while there is real work, so an idle 15-second cycle never flickers the footer.
 */
class SyncProgress
{
    private const KEY = 'sync:progress';

    /** A sync that stopped mid-way (crash, killed process) stops showing after this. */
    private const STALE_SECONDS = 900;

    public static function start(string $task, string $label, ?int $left = null): void
    {
        Cache::put(self::KEY, ['task' => $task, 'label' => $label, 'left' => $left, 'started_at' => now()->toIso8601String()], self::STALE_SECONDS);
    }

    public static function update(array $changes): void
    {
        $current = Cache::get(self::KEY);
        if ($current) {
            Cache::put(self::KEY, array_merge($current, $changes), self::STALE_SECONDS);
        }
    }

    public static function finish(): void
    {
        Cache::forget(self::KEY);
    }

    public static function current(): ?array
    {
        return Cache::get(self::KEY);
    }
}
