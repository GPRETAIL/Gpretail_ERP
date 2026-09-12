<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Pusher\Pusher;
use Throwable;

/**
 * Fire-and-forget push signal telling any open dashboard for a store to
 * silently refetch, replacing 30s polling (useDashboardRealtime.js) with an
 * actual push. Deliberately NOT wired through Laravel's Broadcasting/Echo
 * facades: those queue ShouldBroadcast events by default, and this app has no
 * persistent queue worker on shared hosting (sync:cycle and backups are both
 * cron-triggered for the same reason) -- a plain synchronous Pusher SDK call
 * needs nothing running in the background.
 *
 * Sends only a "something changed, refetch" signal, never business data --
 * the client already has an authenticated REST path for the real numbers, so
 * there's no need to duplicate that data (or its access control) over Pusher's
 * public channels.
 */
class DashboardBroadcastService
{
    private static ?Pusher $client = null;

    public static function salesUpdated(int $storeId): void
    {
        self::send($storeId, 'dashboard.updated', ['reason' => 'sale']);
    }

    public static function cashPositionUpdated(int $storeId): void
    {
        self::send($storeId, 'dashboard.updated', ['reason' => 'cash']);
    }

    public static function stockAlert(int $storeId): void
    {
        self::send($storeId, 'dashboard.updated', ['reason' => 'stock']);
    }

    private static function send(int $storeId, string $event, array $payload): void
    {
        $client = self::client();
        if (! $client) {
            return;
        }

        try {
            $client->trigger("store-{$storeId}", $event, $payload);
        } catch (Throwable $e) {
            // A live-dashboard nudge failing must never break the sale/action that
            // triggered it -- log and move on, the 3-minute poll fallback in
            // useDashboardRealtime.js catches anything a dropped event misses.
            Log::warning('DashboardBroadcastService: Pusher trigger failed', [
                'store_id' => $storeId,
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private static function client(): ?Pusher
    {
        if (self::$client) {
            return self::$client;
        }

        $key = config('services.pusher.key');
        $secret = config('services.pusher.secret');
        $appId = config('services.pusher.app_id');
        $cluster = config('services.pusher.cluster');

        if (! $key || ! $secret || ! $appId) {
            return null;
        }

        self::$client = new Pusher($key, $secret, $appId, [
            'cluster' => $cluster,
            'useTLS' => true,
        ]);

        return self::$client;
    }
}
