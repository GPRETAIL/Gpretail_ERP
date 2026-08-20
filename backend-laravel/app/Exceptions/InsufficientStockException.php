<?php

namespace App\Exceptions;

use Exception;

/**
 * Thrown by StockService::adjust() when a decrement would take a stock row
 * negative - callers catch this and return a 422 instead of silently
 * allowing (or, previously, silently skipping) an over-issue of stock.
 */
class InsufficientStockException extends Exception
{
    public function __construct(
        public readonly int $productId,
        public readonly float $available,
        public readonly float $requested,
    ) {
        parent::__construct(
            "Insufficient stock for product {$productId}: {$available} available, {$requested} requested."
        );
    }
}
