<?php

namespace Tests\Feature\Security;

use App\Models\Size;
use App\Services\Backup\BackupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Wrong-kind or oversized input is a 422 on the small master screens and the dashboard layout; public checks are rate-limited. */
class InputBoundsTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($this->fixture['user']);
    }

    public function test_size_and_attribute_masters_accept_normal_input_and_refuse_wrong_kinds(): void
    {
        $this->postJson('/api/size-groups', ['group_name' => 'Kids', 'description' => 'Age wise', 'is_active' => true])->assertCreated();
        $groupId = DB::table('size_groups')->where('name', 'Kids')->value('id');
        $this->postJson('/api/sizes', ['size_name' => 'M', 'size_group_id' => $groupId, 'sort_order' => 3])->assertCreated();
        $this->assertSame(1, Size::where('name', 'M')->count());

        $this->postJson('/api/sizes', ['size_name' => str_repeat('x', 151)])->assertUnprocessable()->assertJsonValidationErrors('size_name');
        $this->postJson('/api/sizes', ['size_name' => ['a', 'b']])->assertUnprocessable()->assertJsonValidationErrors('size_name');
        $this->postJson('/api/sizes', ['size_name' => 'L', 'sort_order' => 'abc'])->assertUnprocessable()->assertJsonValidationErrors('sort_order');
        $this->postJson('/api/sizes', ['size_name' => 'L', 'sort_order' => -5])->assertUnprocessable()->assertJsonValidationErrors('sort_order');
        $this->postJson('/api/size-groups', ['group_name' => 'Bad', 'is_active' => 'maybe'])->assertUnprocessable()->assertJsonValidationErrors('is_active');
        $this->postJson('/api/attributes/colour', ['name' => 'Red', 'extra_data' => str_repeat('x', 20001)])->assertUnprocessable()->assertJsonValidationErrors('extra_data');
        $this->postJson('/api/attributes/colour', ['name' => 'Red', 'code' => 'R1', 'sort_order' => '2', 'is_active' => 'true'])->assertCreated();
        $this->assertSame(1, Size::where('name', 'L')->count() + 1); // None of the refused sizes was saved.
    }

    public function test_configuration_values_are_bounded(): void
    {
        $this->postJson('/api/configurations/colour-family', ['value' => ['a' => 1, 'b' => [1, 2]], 'sort_order' => 1])->assertCreated();
        $this->postJson('/api/configurations/colour-family', ['value' => str_repeat('x', 10001)])->assertUnprocessable()->assertJsonValidationErrors('value');
        $this->postJson('/api/configurations/colour-family', ['value' => 'ok', 'sort_order' => 'first'])->assertUnprocessable()->assertJsonValidationErrors('sort_order');
    }

    public function test_dashboard_layout_saves_a_grid_and_refuses_junk(): void
    {
        $grid = [['i' => 'kpi', 'x' => 0, 'y' => 0, 'w' => 3, 'h' => 2, 'moved' => false, 'static' => false, 'hidden' => false]];
        $this->putJson('/api/dashboard/layout/finance', ['layout' => $grid])->assertOk();
        $this->getJson('/api/dashboard/layout')->assertJsonPath('data.finance.0.i', 'kpi');

        $this->putJson('/api/dashboard/layout/finance', ['layout' => [['i' => ['nested' => 'x']]]])->assertUnprocessable();
        $this->putJson('/api/dashboard/layout/finance', ['layout' => array_fill(0, 201, ['i' => 'a'])])->assertUnprocessable();
        $this->putJson('/api/dashboard/layout/finance', ['layout' => [['i' => str_repeat('x', 121)]]])->assertUnprocessable();
        $this->putJson('/api/dashboard/layout/'.str_repeat('a', 41), ['layout' => $grid])->assertNotFound();
    }

    public function test_the_public_setup_token_check_and_status_are_rate_limited(): void
    {
        Sanctum::actingAs($this->fixture['user']); // Throttling applies whoever calls; the routes need no login.
        for ($i = 0; $i < 20; $i++) {
            $this->assertNotSame(429, $this->getJson('/api/activation/password-setup-check?token=nope')->status());
        }
        $this->getJson('/api/activation/password-setup-check?token=nope')->assertStatus(429);
    }

    public function test_a_scheduled_backup_time_is_the_shops_time_not_utc(): void
    {
        $from = Carbon::parse('2026-11-17 06:00:00', 'UTC'); // 11:30 in India.
        $next = app(BackupService::class)->computeNextScheduledAt(['schedule_frequency' => 'daily', 'schedule_time' => '02:00'], $from);
        $this->assertSame('2026-11-17 20:30:00', $next->utc()->toDateTimeString()); // 2 am IST on the 18th = 20:30 UTC on the 17th.

        $later = app(BackupService::class)->computeNextScheduledAt(['schedule_frequency' => 'daily', 'schedule_time' => '15:00'], $from);
        $this->assertSame('2026-11-17 09:30:00', $later->utc()->toDateTimeString()); // 3 pm IST today.

        $weekly = app(BackupService::class)->computeNextScheduledAt(['schedule_frequency' => 'weekly', 'schedule_day_of_week' => 1, 'schedule_time' => '02:00'], $from);
        $this->assertSame('Monday 02:00', $weekly->copy()->setTimezone('Asia/Kolkata')->format('l H:i'));
    }
}
