<?php

namespace Tests\Feature;

use App\Services\PaginationService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PaginationServiceTest extends TestCase
{
    protected PaginationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PaginationService();

        Schema::create('test_pagination_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('amount', 10, 2);
            $table->timestamps();
        });

        // Insert 15 deterministic records
        for ($i = 1; $i <= 15; $i++) {
            DB::table('test_pagination_items')->insert([
                'id'         => $i,
                'name'       => "Item {$i}",
                'amount'     => $i * 10.0,
                'created_at' => now()->subMinutes(15 - $i),
                'updated_at' => now(),
            ]);
        }

        // Configure test resources in config
        config()->set('pagination.resources.test_master', [
            'mode'          => 'offset',
            'default_sort'  => 'id',
            'default_order' => 'asc',
            'tie_breaker'   => 'id',
            'allowed_sorts' => ['id', 'name', 'amount', 'created_at'],
        ]);

        config()->set('pagination.resources.test_tx', [
            'mode'          => 'cursor',
            'default_sort'  => 'id',
            'default_order' => 'desc',
            'tie_breaker'   => 'id',
            'allowed_sorts' => ['id', 'amount', 'created_at'],
        ]);
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('test_pagination_items');
        parent::tearDown();
    }

    public function test_offset_mode_paginates_first_and_second_page_correctly(): void
    {
        $query = DB::table('test_pagination_items');
        $request = Request::create('/test', 'GET', ['page' => 1, 'limit' => 5]);

        $res1 = $this->service->paginate($query, 'test_master', $request);

        $this->assertTrue($res1['success']);
        $this->assertSame('offset', $res1['pagination']['mode']);
        $this->assertSame(1, $res1['pagination']['page']);
        $this->assertSame(5, $res1['pagination']['per_page']);
        $this->assertSame(15, $res1['pagination']['total']);
        $this->assertSame(3, $res1['pagination']['total_pages']);
        $this->assertTrue($res1['pagination']['has_next']);
        $this->assertFalse($res1['pagination']['has_previous']);
        $this->assertCount(5, $res1['data']);
        $this->assertSame(1, $res1['data'][0]->id);
        $this->assertSame(5, $res1['data'][4]->id);

        // Page 2
        $request2 = Request::create('/test', 'GET', ['page' => 2, 'limit' => 5]);
        $res2 = $this->service->paginate($query, 'test_master', $request2);

        $this->assertSame(2, $res2['pagination']['page']);
        $this->assertTrue($res2['pagination']['has_previous']);
        $this->assertTrue($res2['pagination']['has_next']);
        $this->assertSame(6, $res2['data'][0]->id);
        $this->assertSame(10, $res2['data'][4]->id);
    }

    public function test_cursor_mode_navigates_forward_continuously_without_count(): void
    {
        $query = DB::table('test_pagination_items');
        // Initial request on cursor resource
        $request1 = Request::create('/test', 'GET', ['limit' => 5]);
        $res1 = $this->service->paginate($query, 'test_tx', $request1);

        $this->assertTrue($res1['success']);
        $this->assertSame('cursor', $res1['pagination']['mode']);
        $this->assertCount(5, $res1['data']);
        $this->assertTrue($res1['pagination']['has_more']);
        $this->assertNotNull($res1['pagination']['next_cursor']);

        // First item should be 15 (descending order)
        $this->assertSame(15, $res1['data'][0]->id);
        $this->assertSame(11, $res1['data'][4]->id);

        // Second request with next_cursor
        $nextCursor = $res1['pagination']['next_cursor'];
        $request2 = Request::create('/test', 'GET', ['limit' => 5, 'cursor' => $nextCursor]);
        $res2 = $this->service->paginate($query, 'test_tx', $request2);

        $this->assertCount(5, $res2['data']);
        $this->assertSame(10, $res2['data'][0]->id);
        $this->assertSame(6, $res2['data'][4]->id);
        $this->assertTrue($res2['pagination']['has_more']);
        $this->assertNotNull($res2['pagination']['next_cursor']);

        // Third request with next_cursor (final page)
        $nextCursor2 = $res2['pagination']['next_cursor'];
        $request3 = Request::create('/test', 'GET', ['limit' => 5, 'cursor' => $nextCursor2]);
        $res3 = $this->service->paginate($query, 'test_tx', $request3);

        $this->assertCount(5, $res3['data']);
        $this->assertSame(5, $res3['data'][0]->id);
        $this->assertSame(1, $res3['data'][4]->id);
        $this->assertFalse($res3['pagination']['has_more']);
        $this->assertNull($res3['pagination']['next_cursor']);
    }

    public function test_explicit_query_params_override_default_mode(): void
    {
        $query = DB::table('test_pagination_items');

        // Passing 'page' on a cursor resource switches to offset
        $request1 = Request::create('/test', 'GET', ['page' => 1, 'limit' => 5]);
        $res1 = $this->service->paginate($query, 'test_tx', $request1);
        $this->assertSame('offset', $res1['pagination']['mode']);

        // Passing 'cursor' on an offset resource switches to cursor
        $request2 = Request::create('/test', 'GET', ['limit' => 5, 'cursor' => 'some-cursor']);
        $mode = $this->service->resolveMode('test_master', config('pagination.resources.test_master'), $request2, []);
        $this->assertSame('cursor', $mode);
    }

    public function test_limit_safeguards_clamp_unreasonable_values(): void
    {
        $query = DB::table('test_pagination_items');
        $request = Request::create('/test', 'GET', ['limit' => 5000]);

        $res = $this->service->paginate($query, 'test_master', $request);
        $this->assertSame(200, $res['pagination']['per_page']);
    }

    public function test_backward_compatibility_top_level_keys_are_present(): void
    {
        $query = DB::table('test_pagination_items');
        $request = Request::create('/test', 'GET', ['page' => 1, 'limit' => 10]);

        $res = $this->service->paginate($query, 'test_master', $request);

        // Check top-level keys that older frontend components depend on
        $this->assertArrayHasKey('total', $res);
        $this->assertArrayHasKey('page', $res);
        $this->assertArrayHasKey('limit', $res);
        $this->assertArrayHasKey('totalPages', $res);
        $this->assertSame(15, $res['total']);
        $this->assertSame(1, $res['page']);
        $this->assertSame(10, $res['limit']);
        $this->assertSame(2, $res['totalPages']);
    }

    public function test_auto_mode_uses_offset_below_50k_threshold(): void
    {
        $query = DB::table('test_pagination_items');
        $request = Request::create('/test', 'GET', ['limit' => 5]);

        // When estimated count is 20,000 (below 50k threshold)
        $res = $this->service->paginate($query, 'test_auto', $request, [
            'estimated_count' => 20000,
        ]);

        $this->assertSame('offset', $res['pagination']['mode']);
    }

    public function test_auto_mode_switches_to_cursor_above_50k_threshold_and_reverts_when_data_removed(): void
    {
        $query = DB::table('test_pagination_items');
        $request = Request::create('/test', 'GET', ['limit' => 5]);

        // 1. When data grows to 60,000 (above 50K threshold) -> auto-switches to cursor
        $resAbove = $this->service->paginate($query, 'test_auto', $request, [
            'estimated_count' => 60000,
        ]);

        $this->assertSame('cursor', $resAbove['pagination']['mode']);
        $this->assertArrayHasKey('next_cursor', $resAbove['pagination']);

        // 2. When data is pruned/removed below 50K (e.g. 30,000) -> automatically reverts to offset!
        $resBelow = $this->service->paginate($query, 'test_auto', $request, [
            'estimated_count' => 30000,
        ]);

        $this->assertSame('offset', $resBelow['pagination']['mode']);
        $this->assertArrayHasKey('total_pages', $resBelow['pagination']);
    }

    public function test_deep_offset_crossing_50k_switches_to_cursor(): void
    {
        $query = DB::table('test_pagination_items');
        // Page 1200 with limit 50 = offset 60,000 (exceeds max_offset of 50,000)
        $request = Request::create('/test', 'GET', ['page' => 1200, 'limit' => 50]);

        $res = $this->service->paginate($query, 'test_master', $request);

        $this->assertSame('cursor', $res['pagination']['mode']);
    }
}
