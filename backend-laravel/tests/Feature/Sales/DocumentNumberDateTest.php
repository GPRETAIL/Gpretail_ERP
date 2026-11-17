<?php

namespace Tests\Feature\Sales;

use App\Models\Store;
use App\Services\Documents\DocumentNumberService;
use App\Services\Sales\BusinessDate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/** Bill numbers carry the business day in India time: a bill at 1:30 am IST is numbered for that day, not the UTC day before. */
class DocumentNumberDateTest extends TestCase
{
    use RefreshDatabase;

    public function test_numbers_made_after_midnight_india_time_carry_the_india_date(): void
    {
        $store = Store::create(['name' => 'TEMP Number Date', 'code' => 'TEMP-ND', 'is_active' => true]);
        $this->travelTo(Carbon::parse('2026-11-17 20:00:00', 'UTC')); // 18 Nov, 01:30 IST

        $this->assertSame('20261118', DocumentNumberService::period());
        $this->assertStringEndsWith('-20261118-0001', DocumentNumberService::next($store->id, 'INV'));
        $this->assertStringEndsWith('-20261118-0002', DocumentNumberService::peek($store->id, 'INV'));
        $this->assertSame('2026-11-18', BusinessDate::today()->toDateString());

        // A business date passed in (after cash closing) is kept as that day.
        $this->assertStringEndsWith('-20261119-0001', DocumentNumberService::next($store->id, 'INV', false, null, BusinessDate::today()->addDay()));
        // An offline bill timed 01:30 IST (20:00 UTC) belongs to 18 Nov too.
        $this->assertSame('20261118', DocumentNumberService::period(Carbon::parse('2026-11-17 20:00:00', 'UTC')->toImmutable()));

        $this->travelTo(Carbon::parse('2026-11-18 06:00:00', 'UTC')); // 11:30 IST, same India day
        $this->assertStringEndsWith('-20261118-0002', DocumentNumberService::next($store->id, 'INV'));
    }
}
