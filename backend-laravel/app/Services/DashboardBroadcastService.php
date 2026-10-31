<?php

namespace App\Services;

/**
 * Tells any open dashboard for a store to silently refetch (useDashboardRealtime.js), on the
 * store's private channel. Only a "something changed" signal, never business data: the
 * client reloads the real numbers through its authenticated REST path.
 */
class DashboardBroadcastService
{
    public static function salesUpdated(int $storeId): void
    {
        app(RealtimeService::class)->toStore($storeId, 'dashboard.updated', ['reason' => 'sale']);
    }

    public static function cashPositionUpdated(int $storeId): void
    {
        app(RealtimeService::class)->toStore($storeId, 'dashboard.updated', ['reason' => 'cash']);
    }

    public static function stockAlert(int $storeId): void
    {
        app(RealtimeService::class)->toStore($storeId, 'dashboard.updated', ['reason' => 'stock']);
    }
}
