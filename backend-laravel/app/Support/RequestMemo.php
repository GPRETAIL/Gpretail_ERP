<?php

namespace App\Support;

/**
 * Values looked up once per request instead of on every call (the licence record, a user's stores).
 * Emptied after each request and whenever a store, user or activation record is saved or deleted,
 * so a write in the same request is seen by the next read.
 */
final class RequestMemo
{
    /** @var array<string, mixed> */
    private array $values = [];

    public function remember(string $key, callable $resolve): mixed
    {
        if (! array_key_exists($key, $this->values)) {
            $this->values[$key] = $resolve();
        }

        return $this->values[$key];
    }

    public function flush(): void
    {
        $this->values = [];
    }
}
