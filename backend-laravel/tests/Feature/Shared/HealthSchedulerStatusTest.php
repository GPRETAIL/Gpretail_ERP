<?php

namespace Tests\Feature\Shared;

use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/** /api/health tells anyone whether the server cron runs the scheduler, without exposing timestamps. */
class HealthSchedulerStatusTest extends TestCase
{
    public function test_scheduler_status_is_never_running_or_stale(): void
    {
        Cache::forget('ops:scheduler-heartbeat');
        $this->getJson('/api/health')->assertOk()->assertJsonPath('background.scheduler', 'never');

        Cache::put('ops:scheduler-heartbeat', now()->timestamp - 30, 600);
        $this->getJson('/api/health')->assertJsonPath('background.scheduler', 'running');

        Cache::put('ops:scheduler-heartbeat', now()->timestamp - 900, 600);
        $response = $this->getJson('/api/health')->assertJsonPath('background.scheduler', 'stale');
        $this->assertStringNotContainsString((string) (now()->timestamp - 900), $response->getContent());
    }

    public function test_the_scheduler_writes_the_heartbeat_every_minute(): void
    {
        $this->app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        $event = collect($this->app->make(\Illuminate\Console\Scheduling\Schedule::class)->events())
            ->first(fn ($event) => $event->description === 'ops:heartbeat');

        $this->assertNotNull($event);
        $this->assertSame('* * * * *', $event->expression);
    }
}
