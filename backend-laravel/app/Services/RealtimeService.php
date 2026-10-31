<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Pusher\Pusher;
use Throwable;

/**
 * "Something changed, refetch" signals over the Pusher protocol, so it works with hosted
 * Pusher on shared hosting today and with Laravel Reverb later by setting PUSHER_HOST/PORT/
 * SCHEME. Sends synchronously (no queue worker on shared hosting), once per request: signals
 * are de-duplicated and sent in one batch when the request finishes. Payloads never carry
 * business data; clients reload through the authenticated API.
 *
 * Channels (all private, authorised by RealtimeController):
 *   private-store-{id}  users of that store      private-user-{id}  that user only
 *   private-company     every signed-in user of this installation
 */
class RealtimeService
{
    private ?Pusher $client = null;

    /** @var array<string, array{channel: string, name: string, data: array}> */
    private array $pending = [];

    private bool $flushScheduled = false;

    /** @var list<array{channel: string, name: string, data: array}>|null Recorded instead of sent when faked. */
    private ?array $sent = null;

    public static function fake(): self
    {
        $fake = new self;
        $fake->sent = [];
        app()->instance(self::class, $fake);

        return $fake;
    }

    public function toStore(?int $storeId, string $event, array $data = []): void
    {
        if ($storeId) {
            $this->queue("private-store-{$storeId}", $event, $data);
        }
    }

    public function toUser(?int $userId, string $event, array $data = []): void
    {
        if ($userId) {
            $this->queue("private-user-{$userId}", $event, $data);
        }
    }

    public function toCompany(string $event, array $data = []): void
    {
        $this->queue('private-company', $event, $data);
    }

    /** @return list<array{channel: string, name: string, data: array}> */
    public function sent(): array
    {
        $this->flush();

        return $this->sent ?? [];
    }

    /** Signed subscription for a channel this user may join, or null. */
    public function authorize(User $user, string $channel, string $socketId): ?string
    {
        $allowed = match (true) {
            $channel === 'private-company' => true,
            (bool) preg_match('/^private-user-(\d+)$/', $channel, $m) => (int) $m[1] === (int) $user->id,
            (bool) preg_match('/^private-store-(\d+)$/', $channel, $m) => app(StoreContext::class)->available($user)->whereKey((int) $m[1])->exists(),
            default => false,
        };
        $client = $allowed && $user->is_active ? $this->client() : null;

        return $client?->authorizeChannel($channel, $socketId);
    }

    public function flush(): void
    {
        $events = array_values($this->pending);
        $this->pending = [];
        if (! $events) {
            return;
        }
        if ($this->sent !== null) {
            array_push($this->sent, ...$events);

            return;
        }
        $client = $this->client();
        if (! $client) {
            return;
        }
        try {
            foreach (array_chunk($events, 10) as $batch) { // Pusher accepts 10 events per batch call.
                $client->triggerBatch($batch);
            }
        } catch (Throwable $e) {
            // A missed nudge must never break the action that caused it; clients keep a slow poll.
            Log::warning('RealtimeService: push failed', ['events' => array_column($events, 'name'), 'error' => $e->getMessage()]);
        }
    }

    private function queue(string $channel, string $event, array $data): void
    {
        $this->pending["$channel|$event"] = ['channel' => $channel, 'name' => $event, 'data' => $data];
        if (! $this->flushScheduled) {
            $this->flushScheduled = true;
            app()->terminating(function () {
                $this->flushScheduled = false;
                $this->flush();
            });
        }
    }

    private function client(): ?Pusher
    {
        $config = config('services.pusher');
        if ($this->client || empty($config['key']) || empty($config['secret']) || empty($config['app_id'])) {
            return $this->client;
        }
        // A host (Laravel Reverb or another Pusher-compatible server) takes precedence over the cluster.
        $options = ! empty($config['host'])
            ? ['host' => $config['host'], 'port' => (int) ($config['port'] ?: 443), 'scheme' => $config['scheme'] ?: 'https', 'useTLS' => ($config['scheme'] ?: 'https') === 'https']
            : ['cluster' => $config['cluster'], 'useTLS' => true];

        return $this->client = new Pusher($config['key'], $config['secret'], $config['app_id'], [...$options, 'timeout' => 2]);
    }
}
