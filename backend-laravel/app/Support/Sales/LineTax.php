<?php

namespace App\Support\Sales;

/**
 * The tax on one bill line, to the paisa. Most bills price items without tax and add it on top; POS Old prices items with
 * the tax already in them, so its tax is taken out of the line instead and the line total stays what the customer pays.
 */
final class LineTax
{
    /** @return array{tax: float, net: float} the tax, and the line without it */
    public static function split(float $lineTotalAfterDiscount, float $ratePercent, bool $inclusive): array
    {
        if ($inclusive) {
            $tax = round($lineTotalAfterDiscount - $lineTotalAfterDiscount / (1 + $ratePercent / 100), 2);

            return ['tax' => $tax, 'net' => round($lineTotalAfterDiscount - $tax, 2)];
        }

        return ['tax' => round($lineTotalAfterDiscount * $ratePercent / 100, 2), 'net' => $lineTotalAfterDiscount];
    }
}
