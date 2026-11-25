<?php

namespace App\Support;

/**
 * Sales > Employee Sticker: the size of the sticker, kept per store inside the Sales Customisation settings. It
 * overrides the product label size from Warehouse > Barcode Customisation for employee stickers only. Anything that is
 * not a number inside the allowed range is dropped, so a bad value can never reach the label printer.
 */
final class EmployeeStickerSize
{
    /** key => [min, max, decimals] */
    private const LIMITS = [
        'labelWidthMm' => [20, 200, 2],
        'labelHeightMm' => [10, 150, 2],
        'labelsPerRow' => [1, 3, 0],
        'codeSizeMm' => [5, 60, 2],
        'nameFontSizePx' => [6, 40, 0],
        'detailFontSizePx' => [6, 40, 0],
    ];

    /** @return array<string, int|float>|null null (or anything that is not a list of settings) means "same as product stickers" */
    public static function sanitize(mixed $value): ?array
    {
        if (! is_array($value)) {
            return null;
        }
        $clean = [];
        foreach (self::LIMITS as $key => [$min, $max, $decimals]) {
            if (! isset($value[$key]) || ! is_numeric($value[$key])) {
                continue;
            }
            $number = round(min($max, max($min, (float) $value[$key])), $decimals);
            $clean[$key] = $decimals === 0 ? (int) $number : $number;
        }

        return $clean === [] ? null : $clean;
    }
}
