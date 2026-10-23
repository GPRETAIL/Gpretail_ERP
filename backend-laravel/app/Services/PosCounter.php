<?php

namespace App\Services;

use App\Models\SystemConfiguration;

class PosCounter
{
    public static function find(?int $id, ?int $storeId): ?SystemConfiguration
    {
        if (! $id || ! $storeId) {
            return null;
        }

        return SystemConfiguration::whereKey($id)->where('store_id', $storeId)
            ->where('is_active', true)
            ->where(fn ($q) => $q->where('key', 'counter')->orWhere('config_key', 'counter')
                ->orWhere('group', 'counter')->orWhere('group_name', 'counter'))->first();
    }
}
