<?php

namespace App\Support\Database;

use Throwable;

/**
 * Shared hosting (Hostinger) refuses new MySQL connections for a moment when an account opens more than 20 per second:
 * "SQLSTATE[HY000] [2002] Operation not permitted". The refusal is momentary, so connecting is tried again after a
 * short pause (twice at most) instead of failing the request or scheduled task.
 */
trait RetriesRefusedConnections
{
    /** Pauses before each retry, in milliseconds. */
    protected function retryPausesMs(): array
    {
        return [150, 500];
    }

    public function createConnection($dsn, array $config, array $options)
    {
        foreach ($this->retryPausesMs() as $pause) {
            try {
                return parent::createConnection($dsn, $config, $options);
            } catch (Throwable $e) {
                if (! self::isMomentaryRefusal($e)) {
                    throw $e;
                }
                usleep($pause * 1000);
            }
        }

        return parent::createConnection($dsn, $config, $options);
    }

    /** The host's connection-rate refusal (not wrong credentials, a missing database or a server that is down). */
    public static function isMomentaryRefusal(Throwable $e): bool
    {
        $message = $e->getMessage();

        return str_contains($message, '[2002]') && (str_contains($message, 'Operation not permitted') || str_contains($message, 'Resource temporarily unavailable'));
    }
}
