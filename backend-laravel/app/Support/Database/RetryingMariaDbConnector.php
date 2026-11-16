<?php

namespace App\Support\Database;

use Illuminate\Database\Connectors\MariaDbConnector;

/** MariaDB connector that rides out the host's momentary connection-rate refusals (see RetriesRefusedConnections). */
class RetryingMariaDbConnector extends MariaDbConnector
{
    use RetriesRefusedConnections;
}
