<?php

namespace Tests\Feature\Ops;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\Tenancy\StoreContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/** The licence record and a user's stores are read once per request, and a write is seen straight away. */
class RequestMemoTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_signed_in_call_reads_the_licence_and_the_users_stores_once(): void
    {
        config()->set('notifications.alert_refresh_seconds', 60);
        $store = Store::create(['name' => 'Memo', 'code' => 'MEM-'.Str::random(4), 'is_active' => true]);
        $user = User::factory()->create(['username' => 'm'.Str::random(5), 'role' => 'manager', 'store_id' => $store->id]);
        $headers = ['Authorization' => 'Bearer '.$user->createToken('web', ['client:web'])->plainTextToken, 'X-Store-Id' => (string) $store->id];
        $this->withHeaders($headers)->getJson('/api/notifications/unread-count')->assertOk(); // warms the alert scan
        $this->app['auth']->forgetGuards();

        $sql = [];
        DB::listen(function ($query) use (&$sql) { $sql[] = $query->sql; });
        $this->withHeaders($headers)->getJson('/api/notifications/unread-count')->assertOk();

        $count = fn (string $table) => count(array_filter($sql, fn ($q) => str_contains($q, 'from "'.$table.'"')));
        $this->assertSame(1, $count('platform_activations'));
        $this->assertSame(1, count(array_filter($sql, fn ($q) => str_starts_with($q, 'select * from "stores"'))));
        $this->assertLessThanOrEqual(8, count($sql));
    }

    public function test_a_change_in_the_same_request_is_seen_by_the_next_read(): void
    {
        $first = Store::create(['name' => 'One', 'code' => 'ONE-'.Str::random(4), 'is_active' => true]);
        $owner = User::factory()->create(['username' => 'o'.Str::random(5), 'role' => 'manager', 'store_id' => $first->id]);
        $context = app(StoreContext::class);
        $this->assertSame([$first->id], $context->stores($owner)->pluck('id')->all());
        $second = Store::create(['name' => 'Two', 'code' => 'TWO-'.Str::random(4), 'is_active' => true]);
        $owner->assignedStores()->sync([$second->id]);
        $second->touch(); // any store save also drops the remembered list
        $this->assertSame([$first->id, $second->id], $context->stores($owner)->pluck('id')->all());

        $this->assertNull(PlatformActivation::current());
        $activation = PlatformActivation::forceCreate(['company_code' => 'CMP-1', 'activated' => false]);
        $this->assertSame($activation->id, PlatformActivation::current()?->id);
        $activation->update(['activated' => true]);
        $this->assertTrue(PlatformActivation::current()->activated);
    }
}
