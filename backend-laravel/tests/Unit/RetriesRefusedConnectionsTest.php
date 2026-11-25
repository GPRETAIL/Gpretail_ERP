<?php

namespace Tests\Unit;

use App\Support\Database\RetriesRefusedConnections;
use PDOException;
use PHPUnit\Framework\TestCase;

class FlakyConnectorBase
{
    public int $calls = 0;

    public function __construct(public int $failures, public string $message) {}

    public function createConnection($dsn, array $config, array $options)
    {
        $this->calls++;
        if ($this->calls <= $this->failures) {
            throw new PDOException($this->message);
        }

        return 'connected';
    }
}

class RetryingFlakyConnector extends FlakyConnectorBase
{
    use RetriesRefusedConnections;

    protected function retryPausesMs(): array
    {
        return [0, 0];
    }
}

/** The host's momentary "[2002] Operation not permitted" is retried; other connection errors are not. */
class RetriesRefusedConnectionsTest extends TestCase
{
    private const REFUSED = 'SQLSTATE[HY000] [2002] Operation not permitted';

    public function test_a_momentary_refusal_is_retried_until_it_connects(): void
    {
        $connector = new RetryingFlakyConnector(2, self::REFUSED);
        $this->assertSame('connected', $connector->createConnection('dsn', [], []));
        $this->assertSame(3, $connector->calls);
    }

    public function test_the_socket_flavoured_refusal_is_retried_too(): void
    {
        $connector = new RetryingFlakyConnector(1, 'SQLSTATE[HY000] [2002] No such file or directory');
        $this->assertSame('connected', $connector->createConnection('dsn', [], []));
        $this->assertSame(2, $connector->calls);
    }

    public function test_it_gives_up_after_two_retries(): void
    {
        $connector = new RetryingFlakyConnector(5, self::REFUSED);
        $this->expectException(PDOException::class);
        try {
            $connector->createConnection('dsn', [], []);
        } finally {
            $this->assertSame(3, $connector->calls);
        }
    }

    public function test_other_errors_fail_at_once(): void
    {
        $connector = new RetryingFlakyConnector(1, "SQLSTATE[HY000] [1045] Access denied for user 'x'");
        $this->expectException(PDOException::class);
        try {
            $connector->createConnection('dsn', [], []);
        } finally {
            $this->assertSame(1, $connector->calls);
        }
    }
}
