<?php

namespace App\Services\Inventory;

use Illuminate\Support\Facades\DB;

/** Store-level stock rules the sales screens and checkout share. */
class StockRules
{
    /**
     * Warehouse Customisation switch "sell without stock": when on, a sale may take an item below zero
     * (the next receipt settles the shortfall); when off, a sale needs the stock to be there.
     */
    public static function allowsSaleWithoutStock(int $storeId): bool
    {
        $raw = DB::table('stores')->where('id', $storeId)->value('barcode_customization');
        $settings = is_string($raw) ? json_decode($raw, true) : (array) $raw;

        return filter_var($settings['allowSaleWithoutStock'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    /** How much of a sale of $qty was not covered by stock, given the stock left after it. */
    public static function shortQty(float $qty, float $after): float
    {
        return round(max(0.0, min($qty, -$after)), 3);
    }
}
