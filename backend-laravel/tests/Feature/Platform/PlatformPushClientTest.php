<?php

namespace Tests\Feature\Platform;

use App\Models\PlatformActivation;
use App\Services\Platform\PlatformPushClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tests\TestCase;

/** The per-minute push of contacts and read receipts to GP Admin: a slow GP Admin is a warning, never an error alert. */
class PlatformPushClientTest extends TestCase
{
    use RefreshDatabase;

    private int $attempts = 0;

    protected function setUp(): void
    {
        parent::setUp();
        PlatformActivation::create(['company_code' => 'CMP-PUSH', 'activated' => true, 'sync_token' => 'sync-only', 'status' => 'active',
            'tenant_admin_email' => 'owner@example.test', 'deployment_id' => (string) Str::uuid()]);
        config(['platform.base_url' => 'https://admin.example.test']);
    }

    private function adminAnswers(bool $up): void
    {
        $this->attempts = 0;
        Http::swap(new Factory);
        Http::fake(function () use ($up) {
            $this->attempts++;
            if (! $up) {
                throw new ConnectionException('cURL error 28: Operation timed out after 10001 milliseconds with 0 bytes received');
            }

            return Http::response(['success' => true, 'data' => []]);
        });
    }

    public function test_a_timeout_is_a_warning_not_an_error_and_the_rest_of_the_run_is_skipped(): void
    {
        Log::spy();
        $this->adminAnswers(false);
        $push = new PlatformPushClient;

        $this->assertFalse($push->request('contacts')['ok']);
        $this->assertFalse($push->request('read')['ok']);
        $this->assertFalse($push->request('unsubscribe')['ok']);

        $this->assertSame(1, $this->attempts, 'after the first timeout the other calls of this run do not wait out another 10 seconds each');
        Log::shouldHaveReceived('warning')->once();
        Log::shouldNotHaveReceived('error');
    }

    public function test_the_next_run_tries_again_and_recovers(): void
    {
        $this->adminAnswers(false);
        $this->assertFalse((new PlatformPushClient)->request('contacts')['ok']);

        $this->adminAnswers(true);
        $this->assertTrue((new PlatformPushClient)->request('contacts')['ok']);
        $this->assertSame(1, $this->attempts);
    }

    public function test_other_failures_are_still_reported(): void
    {
        Log::spy();
        Http::swap(new Factory);
        Http::fake(fn () => throw new \RuntimeException('Something unexpected broke'));

        $this->assertFalse((new PlatformPushClient)->request('contacts')['ok']);

        Log::shouldHaveReceived('error')->atLeast()->once();
    }
}
