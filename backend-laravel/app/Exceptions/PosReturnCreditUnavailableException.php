<?php

namespace App\Exceptions;

use Exception;

/**
 * Thrown when a POS Sale tries to apply a return's credit balance that
 * doesn't exist, isn't in this store, or has already been consumed by
 * another sale - guards against double-spending the same return credit.
 */
class PosReturnCreditUnavailableException extends Exception
{
    public function __construct()
    {
        parent::__construct('This return credit is no longer available (already applied, cancelled, or not found).');
    }
}
