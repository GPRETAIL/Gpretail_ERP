<?php

namespace Tests\Feature\Sales;

use App\Models\PosSale;
use App\Support\BusinessDay;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Reports count a bill on its India business day: 01:30 IST on 18 Nov is 20:00 UTC on 17 Nov, and belongs to the 18th. */
class BusinessDayReportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_business_day_bounds_and_daily_grouping(): void
    {
        [$start, $end] = BusinessDay::range('2026-11-18');
        $this->assertSame('2026-11-17 18:30:00', $start->format('Y-m-d H:i:s'));
        $this->assertSame('2026-11-18 18:29:59', $end->format('Y-m-d H:i:s'));
        $this->assertSame('2026-11-18', BusinessDay::start(Carbon::parse('2026-11-18 23:00:00', 'UTC'))->setTimezone(BusinessDay::tz())->toDateString());

        $this->assertSame('2026-11-18', DB::selectOne('select '.BusinessDay::dateSql("'2026-11-17 20:00:00'").' as d')->d);
        $this->assertSame('2026-11-17', DB::selectOne('select '.BusinessDay::dateSql("'2026-11-17 18:00:00'").' as d')->d);
    }

    public function test_a_late_night_bill_counts_on_the_india_day_in_dashboard_and_reports(): void
    {
        $this->travelTo(Carbon::parse('2026-11-18 06:00:00', 'UTC')); // 18 Nov, 11:30 IST
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $store = $fixture['store']->id;
        $sale = fn (string $utc, float $amount, string $no) => PosSale::create(['store_id' => $store, 'user_id' => $fixture['user']->id, 'invoice_no' => $no,
            'sale_date' => $utc, 'subtotal' => $amount, 'grand_total' => $amount, 'paid_amount' => $amount, 'status' => 'PAID']);
        $sale('2026-11-17 20:00:00', 300, 'LATE-1');  // 18 Nov 01:30 IST
        $sale('2026-11-17 10:00:00', 100, 'DAY17-1'); // 17 Nov 15:30 IST

        $this->getJson('/api/dashboard/overview?from=2026-11-18&to=2026-11-18')->assertOk()->assertJsonPath('data.overview.total_sales', 300);
        $this->getJson('/api/dashboard/overview?from=2026-11-17&to=2026-11-17')->assertOk()->assertJsonPath('data.overview.total_sales', 100);
        $this->assertSame(['LATE-1'], collect($this->getJson('/api/pos-sales?from=2026-11-18&to=2026-11-18')->json('data'))->pluck('invoice_no')->all());
    }
}
