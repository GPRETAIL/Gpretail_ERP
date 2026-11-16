<?php

namespace App\Support\Database;

use Illuminate\Database\Connectors\MySqlConnector;

/** MySQL connector that rides out the host's momentary connection-rate refusals (see RetriesRefusedConnections). */
class RetryingMySqlConnector extends MySqlConnector
{
    use RetriesRefusedConnections;
}
