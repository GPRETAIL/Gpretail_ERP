<?php

namespace Tests\Feature;

use App\Models\Barcode;
use App\Models\PosSale;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class PosOfflineBillingTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        Sanctum::actingAs($this->fixture['user']);
        $counter = $this->fixture['user']->counter_id;
        $this->prefix = 'INV-TEMP-POS-PERF-'.now()->format('Ymd')."-F$counter-";
    }

    private function offlineBill(int $seq, array $overrides = [], ?string $billedAt = null): array
    {
        return ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100, 'items' => [$this->fixture['items'][0]],
            'offline' => ['invoiceNo' => $this->prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT), 'billedAt' => $billedAt ?? now()->subMinutes(20)->toIso8601String()], ...$overrides];
    }

    public function test_a_till_downloads_its_series_and_catalog_then_syncs_an_offline_bill_under_its_printed_number(): void
    {
        $series = $this->getJson('/api/pos-sales/offline/series')->assertOk()->json('data.series');
        $this->assertSame('F'.$this->fixture['user']->counter_id, $series['code']);
        $this->assertSame(1, $series['next']);
        $catalog = $this->getJson('/api/pos-sales/offline/catalog?kind=barcodes')->assertOk();
        $this->assertSame(['TEMP-PERF-0001', 'TEMP-PERF-0002'], array_column($catalog->json('data'), 'barcode'));
        $this->assertEquals(1000, $catalog->json('data.0.qty'));
        $this->assertNull($catalog->json('meta.next'));

        $billedAt = now()->subMinutes(20)->startOfSecond();
        $bill = $this->offlineBill(1, [], $billedAt->toIso8601String());
        $saved = $this->postJson('/api/pos-sales', $bill)->assertCreated();
        $saved->assertJsonPath('data.invoice_no', $this->prefix.'0001')
            ->assertJsonPath('data.bill_no', now()->format('ymd').'-F'.$this->fixture['user']->counter_id.'-0001');
        $sale = PosSale::findOrFail($saved->json('data.id'));
        $this->assertTrue($sale->sale_date->equalTo($billedAt));
        $this->assertTrue($sale->created_at->equalTo($billedAt)); // Reports put it on the day it was billed.
        $this->assertNull($sale->sync_review);
        $this->assertSame(2, $this->getJson('/api/pos-sales/offline/series')->json('data.series.next'));

        // The till retrying after a lost response gets the same bill back.
        $this->postJson('/api/pos-sales', $bill)->assertCreated()->assertHeader('X-Pos-Checkout-Replayed', '1');
        $this->assertSame(1, PosSale::count());
        // The printed number is searchable like any bill number.
        $this->assertSame($sale->id, PosSale::billNumber($sale->bill_no)->value('id'));
    }

    public function test_a_piece_sold_elsewhere_and_short_stock_are_saved_and_flagged_for_the_manager(): void
    {
        $item = $this->fixture['items'][0];
        Product::whereKey($item['productId'])->update(['selling_mode' => 'PIECE']);
        // Sold online at another counter while this till was offline.
        $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100, 'items' => [$item]])->assertCreated();
        DB::table('stocks')->where('variant_id', $item['variantId'])->update(['quantity' => 0, 'available_quantity' => 0]);

        $saved = $this->postJson('/api/pos-sales', $this->offlineBill(1))->assertCreated();
        $issues = collect(PosSale::findOrFail($saved->json('data.id'))->sync_review)->pluck('type')->all();
        $this->assertEqualsCanonicalizing(['piece_resold', 'stock_short'], $issues);
        $this->assertEquals(0, DB::table('stocks')->where('variant_id', $item['variantId'])->value('quantity')); // Never negative.
        $this->assertFalse(Barcode::find($item['barcodeId'])->is_active);
        $this->assertDatabaseHas('app_notifications', ['type' => 'POS_OFFLINE_REVIEW', 'link' => '/sales/offline-bills', 'store_id' => $this->fixture['store']->id]);

        $cashier = User::create(['name' => 'Cashier', 'username' => 'offline-cashier', 'email' => 'cashier@offline.test', 'password' => 'secret-pass',
            'role' => 'cashier', 'store_id' => $this->fixture['store']->id, 'counter_id' => $this->fixture['user']->counter_id, 'is_active' => true]);
        Sanctum::actingAs($cashier);
        $list = $this->getJson('/api/pos-sales/offline/review')->assertOk()->json('data');
        $this->assertCount(1, $list);
        $this->postJson('/api/pos-sales/offline/review/'.$list[0]['id'])->assertForbidden();

        Sanctum::actingAs($this->fixture['user']);
        $this->postJson('/api/pos-sales/offline/review/'.$list[0]['id'], ['note' => 'Recounted, two pieces on the rack'])->assertOk();
        $this->assertSame([], $this->getJson('/api/pos-sales/offline/review')->json('data'));
        $this->assertSame('Recounted, two pieces on the rack', $this->getJson('/api/pos-sales/offline/review?status=all')->json('data.0.review_note'));
    }

    public function test_a_number_already_used_by_another_till_is_renumbered_and_flagged(): void
    {
        $this->postJson('/api/pos-sales', $this->offlineBill(1))->assertCreated();
        $second = $this->postJson('/api/pos-sales', $this->offlineBill(1, ['items' => [$this->fixture['items'][1]]]))->assertCreated();
        $second->assertJsonPath('data.invoice_no', $this->prefix.'0002');
        $this->assertSame('renumbered', PosSale::findOrFail($second->json('data.id'))->sync_review[0]['type']);
    }

    public function test_bills_that_need_a_live_check_are_refused_offline(): void
    {
        $this->postJson('/api/pos-sales', $this->offlineBill(1, ['isCredit' => true, 'saleSaveAs' => 'unsettled', 'cashAmount' => 0]))
            ->assertUnprocessable()->assertJsonValidationErrors('offline');
        $this->postJson('/api/pos-sales', $this->offlineBill(1, ['offline' => ['invoiceNo' => 'INV-TEMP-POS-PERF-'.now()->format('Ymd').'-F999-0001', 'billedAt' => now()->toIso8601String()]]))
            ->assertUnprocessable()->assertJsonValidationErrors('offline.invoiceNo');
        $this->postJson('/api/pos-sales', $this->offlineBill(1, [], now()->subDays(40)->toIso8601String()))
            ->assertUnprocessable()->assertJsonValidationErrors('offline.billedAt');
        $this->assertSame(0, PosSale::count());
    }

    public function test_a_timed_out_online_save_queued_offline_with_the_same_key_resolves_to_the_saved_bill(): void
    {
        $online = ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100, 'items' => [$this->fixture['items'][0]]];
        $first = $this->postJson('/api/pos-sales', $online)->assertCreated();
        $this->postJson('/api/pos-sales', [...$online, 'offline' => ['invoiceNo' => $this->prefix.'0001', 'billedAt' => now()->toIso8601String()]])
            ->assertCreated()->assertHeader('X-Pos-Checkout-Replayed', '1')->assertJsonPath('data.id', $first->json('data.id'));
        $this->assertSame(1, PosSale::count());
    }
}
