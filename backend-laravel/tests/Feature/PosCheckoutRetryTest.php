<?php

namespace Tests\Feature;

use App\Models\Barcode;
use App\Models\PosPayment;
use App\Models\PosSale;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class PosCheckoutRetryTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private array $payload;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        Sanctum::actingAs($this->fixture['user']);
        $this->payload = ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100, 'items' => [$this->fixture['items'][0]]];
    }

    public function test_retries_return_one_invoice_and_do_not_decrement_stock_or_charge_twice(): void
    {
        config(['sync.node_role' => 'local']);
        Product::whereKey($this->fixture['items'][0]['productId'])->update(['selling_mode' => 'PIECE']);
        $first = $this->postJson('/api/pos-sales', $this->payload)->assertCreated()->assertHeader('Server-Timing');
        $retry = $this->postJson('/api/pos-sales', [...$this->payload, 'saleAt' => now()->addSecond()->toIso8601String()]);
        $retry->assertCreated()->assertHeader('X-Pos-Checkout-Replayed', '1')->assertJsonPath('data.id', $first->json('data.id'));
        $this->assertSame(1, PosSale::count());
        $this->assertSame(1, PosPayment::count());
        $this->assertDatabaseCount('stock_transactions', 1);
        $this->assertDatabaseCount('stock_batch_allocations', 1);
        $this->assertDatabaseCount('sync_outbox', 1);
        $this->assertEquals(999, DB::table('stocks')->where('product_id', $this->fixture['items'][0]['productId'])->value('quantity'));
        $this->assertFalse(Barcode::find($this->fixture['items'][0]['barcodeId'])->is_active);
        $this->postJson('/api/pos-sales', [...$this->payload, 'checkoutKey' => (string) Str::uuid()])->assertUnprocessable();
    }

    public function test_changed_payload_or_different_user_cannot_reuse_an_existing_key(): void
    {
        $this->postJson('/api/pos-sales', $this->payload)->assertCreated();
        $this->postJson('/api/pos-sales', [...$this->payload, 'cashAmount' => 200])->assertConflict();
        $other = User::create(['name' => 'Other operator', 'username' => 'other-perf', 'email' => 'other-perf@example.test', 'password' => 'test-only', 'role' => 'admin', 'store_id' => $this->fixture['store']->id, 'is_active' => true]);
        Sanctum::actingAs($other);
        $this->postJson('/api/pos-sales', $this->payload)->assertConflict();
        $this->assertSame(1, PosSale::count());
    }

    public function test_failed_transaction_releases_the_key_for_a_corrected_retry(): void
    {
        DB::table('stocks')->update(['quantity' => 0, 'available_quantity' => 0]);
        $this->postJson('/api/pos-sales', $this->payload)->assertUnprocessable();
        $this->assertDatabaseCount('pos_checkout_requests', 0);
        $this->assertDatabaseCount('pos_sales', 0);
        $this->assertDatabaseCount('stock_transactions', 0);
        DB::table('stocks')->update(['quantity' => 1000, 'available_quantity' => 1000]);
        $this->postJson('/api/pos-sales', $this->payload)->assertCreated();
        $this->assertDatabaseCount('pos_sales', 1);
    }

    public function test_bulk_product_resolution_rejects_foreign_products_and_mismatched_barcodes(): void
    {
        $other = Store::create(['name' => 'Foreign', 'code' => 'FOREIGN-PERF', 'is_active' => true]);
        $product = Product::create(['company_id' => $other->id, 'name' => 'Foreign', 'code' => 'FOREIGN-PERF', 'mrp' => 100]);
        $foreign = $this->payload;
        $foreign['items'][0]['productId'] = $product->id;
        $this->postJson('/api/pos-sales', $foreign)->assertUnprocessable();
        $mismatch = $this->payload;
        $mismatch['items'][0]['barcodeId'] = $this->fixture['items'][1]['barcodeId'];
        $this->postJson('/api/pos-sales', $mismatch)->assertUnprocessable();
        $this->assertDatabaseCount('pos_sales', 0);
        $this->assertDatabaseCount('pos_checkout_requests', 0);
    }
}
