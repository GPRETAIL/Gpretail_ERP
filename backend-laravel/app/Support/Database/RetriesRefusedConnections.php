<?php

namespace App\Support\Database;

use Throwable;

/**
 * Shared hosting (Hostinger) refuses new MySQL connections for a moment when an account opens more than 20 per second:
 * "SQLSTATE[HY000] [2002] Operation not permitted". When too many connections are open at once (a deploy, a busy
 * minute) it answers "[1040] Too many connections" or "[1226] max_user_connections". Both pass within a second or two,
 * so connecting is tried again after a short pause (three times at most) instead of failing the request or scheduled task.
 */
trait RetriesRefusedConnections
{
    /** Pauses before each retry, in milliseconds. */
    protected function retryPausesMs(): array
    {
        return [150, 500, 1500];
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

        // The server is full for the moment: nothing else to check, the message is the whole story.
        if (str_contains($message, '[1040]') || str_contains($message, '[1226]')) {
            return true;
        }

        if (! str_contains($message, '[2002]')) {
            return false;
        }

        // "No such file or directory" is the same momentary refusal seen through the socket path (it failed a deploy's migrate once).
        foreach (['Operation not permitted', 'Resource temporarily unavailable', 'No such file or directory'] as $known) {
            if (str_contains($message, $known)) {
                return true;
            }
        }

        return false;
    }
}
