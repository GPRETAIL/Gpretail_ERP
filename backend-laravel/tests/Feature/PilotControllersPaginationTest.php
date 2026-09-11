<?php

namespace Tests\Feature;

use App\Models\PosSale;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PilotControllersPaginationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create([
            'name'  => 'Test Flagship Store',
            'code'  => 'STR-001',
        ]);

        $this->user = User::create([
            'name'     => 'Test Admin',
            'username' => 'testadmin',
            'email'    => 'admin@example.com',
            'password' => bcrypt('secret123'),
            'role'     => 'admin',
            'store_id' => $this->store->id,
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_products_endpoint_uses_offset_mode(): void
    {
        // Create 12 products
        for ($i = 1; $i <= 12; $i++) {
            Product::create([
                'name'          => "Product {$i}",
                'code'          => "PRD-{$i}",
                'sku'           => "SKU-{$i}",
                'barcode'       => "BC-{$i}",
                'selling_price' => $i * 50,
                'is_active'     => true,
            ]);
        }

        // 1. First Page
        $response1 = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/products?page=1&limit=5');

        $response1->assertOk();
        $response1->assertJsonPath('success', true);
        $response1->assertJsonPath('pagination.mode', 'offset');
        $response1->assertJsonPath('pagination.page', 1);
        $response1->assertJsonPath('pagination.per_page', 5);
        $response1->assertJsonPath('pagination.total', 12);
        $response1->assertJsonPath('pagination.total_pages', 3);
        $response1->assertJsonPath('pagination.has_next', true);
        $response1->assertJsonPath('pagination.has_previous', false);

        // Assert top-level backward compatibility keys
        $response1->assertJsonPath('total', 12);
        $response1->assertJsonPath('page', 1);
        $response1->assertJsonPath('limit', 5);
        $response1->assertJsonPath('totalPages', 3);

        $this->assertCount(5, $response1->json('data'));

        // 2. Second Page
        $response2 = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/products?page=2&limit=5');

        $response2->assertOk();
        $response2->assertJsonPath('pagination.page', 2);
        $response2->assertJsonPath('pagination.has_previous', true);
        $this->assertCount(5, $response2->json('data'));
    }

    public function test_pos_sales_endpoint_uses_cursor_mode(): void
    {
        // Create 8 sales
        for ($i = 1; $i <= 8; $i++) {
            PosSale::create([
                'store_id'    => $this->store->id,
                'user_id'     => $this->user->id,
                'invoice_no'  => "INV-{$i}",
                'sale_date'   => now()->subMinutes(10 - $i),
                'grand_total' => $i * 100,
                'status'      => 'COMPLETED',
            ]);
        }

        // 1. Initial Cursor Request
        $response1 = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/pos-sales?limit=3');

        $response1->assertOk();
        $response1->assertJsonPath('success', true);
        $response1->assertJsonPath('pagination.mode', 'cursor');
        $response1->assertJsonPath('pagination.limit', 3);
        $response1->assertJsonPath('pagination.has_more', true);

        $data1 = $response1->json('data');
        $this->assertCount(3, $data1);
        // By default, sales are sorted by id desc
        $this->assertSame(8, $data1[0]['id']);
        $this->assertSame(6, $data1[2]['id']);

        $nextCursor = $response1->json('pagination.next_cursor');
        $this->assertNotNull($nextCursor);

        // 2. Continuous Traversal via next_cursor
        $response2 = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson("/api/pos-sales?limit=3&cursor={$nextCursor}");

        $response2->assertOk();
        $data2 = $response2->json('data');
        $this->assertCount(3, $data2);
        $this->assertSame(5, $data2[0]['id']);
        $this->assertSame(3, $data2[2]['id']);
        $this->assertTrue($response2->json('pagination.has_more'));

        // 3. Explicit ?page=1 on pos-sales switches cleanly to offset mode (Backward Compatibility)
        $response3 = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/pos-sales?page=1&limit=5');

        $response3->assertOk();
        $response3->assertJsonPath('pagination.mode', 'offset');
        $response3->assertJsonPath('pagination.page', 1);
        $response3->assertJsonPath('pagination.total', 8);
    }

    /**
     * index() used to end its query chain with an unconditional ->orderBy('id','desc') applied
     * before PaginationService ever saw it. PaginationService::applySorting() only sorts when the
     * incoming query has no existing orders, so that pre-set orderBy silently shadowed every
     * configured allowed_sorts value except id -- ?sort=grand_total was accepted but had zero
     * effect on the actual result order.
     */
    public function test_pos_sales_sort_parameter_actually_changes_order(): void
    {
        PosSale::create(['store_id' => $this->store->id, 'user_id' => $this->user->id, 'invoice_no' => 'INV-A', 'sale_date' => now(), 'grand_total' => 300, 'status' => 'COMPLETED']);
        PosSale::create(['store_id' => $this->store->id, 'user_id' => $this->user->id, 'invoice_no' => 'INV-B', 'sale_date' => now(), 'grand_total' => 100, 'status' => 'COMPLETED']);
        PosSale::create(['store_id' => $this->store->id, 'user_id' => $this->user->id, 'invoice_no' => 'INV-C', 'sale_date' => now(), 'grand_total' => 200, 'status' => 'COMPLETED']);

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/pos-sales?page=1&limit=10&sort=grand_total&order=asc');

        $res->assertOk();
        $totals = array_map('floatval', array_column($res->json('data'), 'grand_total'));
        $this->assertSame([100.0, 200.0, 300.0], $totals);
    }

    public function test_direct_purchases_endpoint_uses_cursor_mode(): void
    {
        for ($i = 1; $i <= 6; $i++) {
            \App\Models\DirectPurchase::create([
                'store_id'      => $this->store->id,
                'company_id'    => $this->store->id,
                'purchase_no'   => "PUR-{$i}",
                'purchase_date' => now()->toDateString(),
                'total_amount'  => $i * 500,
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/direct-purchases?limit=3');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'cursor');
        $res->assertJsonPath('pagination.has_more', true);
        $this->assertNotNull($res->json('pagination.next_cursor'));
        $this->assertCount(3, $res->json('data'));
    }

    public function test_customer_orders_endpoint_uses_cursor_mode(): void
    {
        $customer = \App\Models\Customer::create([
            'name' => 'Test Customer',
            'code' => 'CUST-001',
        ]);

        for ($i = 1; $i <= 6; $i++) {
            \App\Models\CustomerOrder::create([
                'store_id'     => $this->store->id,
                'customer_id'  => $customer->id,
                'order_no'     => "ORD-{$i}",
                'order_date'   => now()->toDateString(),
                'total_amount' => $i * 200,
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/customer-orders?limit=3');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'cursor');
        $res->assertJsonPath('pagination.has_more', true);
        $this->assertCount(3, $res->json('data'));
    }

    public function test_customers_endpoint_uses_offset_mode(): void
    {
        for ($i = 2; $i <= 7; $i++) {
            \App\Models\Customer::create([
                'name' => "Customer {$i}",
                'code' => "CUST-00{$i}",
                'phone' => "987654321{$i}",
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/customers?page=1&limit=3');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'offset');
        $res->assertJsonPath('pagination.page', 1);
        $this->assertCount(3, $res->json('data'));
    }

    public function test_pos_returns_endpoint_uses_cursor_mode(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            \App\Models\PosReturn::create([
                'store_id'     => $this->store->id,
                'user_id'      => $this->user->id,
                'return_no'    => "RET-{$i}",
                'return_date'  => now()->toDateString(),
                'total_refund' => $i * 50,
                'status'       => 'COMPLETED',
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/pos-returns?limit=2');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'cursor');
        $res->assertJsonPath('pagination.has_more', true);
        $this->assertNotNull($res->json('pagination.next_cursor'));
        $this->assertCount(2, $res->json('data'));
    }

    public function test_taxes_endpoint_uses_offset_mode(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            \App\Models\Tax::create([
                'name' => "GST {$i}",
                'code' => "GST_{$i}",
                'rate' => $i * 5,
                'is_active' => true,
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/taxes?page=1&limit=3');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'offset');
        $res->assertJsonPath('pagination.total', 5);
        $this->assertCount(3, $res->json('data'));
    }

    public function test_transports_endpoint_uses_offset_mode(): void
    {
        for ($i = 1; $i <= 4; $i++) {
            \App\Models\Transport::create([
                'name' => "Transport {$i}",
                'code' => "TRP-{$i}",
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/transports?page=1&limit=2');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'offset');
        $res->assertJsonPath('pagination.total', 4);
        $this->assertCount(2, $res->json('data'));
    }

    public function test_dealer_invoices_endpoint_uses_cursor_mode(): void
    {
        $cust = \App\Models\Customer::create(['name' => 'Dealer Cust', 'code' => 'DC-1']);

        for ($i = 1; $i <= 5; $i++) {
            \App\Models\DealerInvoice::create([
                'store_id'     => $this->store->id,
                'customer_id'  => $cust->id,
                'invoice_no'   => "DINV-{$i}",
                'invoice_date' => now()->toDateString(),
                'total_amount' => $i * 100,
                'created_by'   => $this->user->id,
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/dealer-invoices?limit=2');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'cursor');
        $res->assertJsonPath('pagination.has_more', true);
        $this->assertNotNull($res->json('pagination.next_cursor'));
        $this->assertCount(2, $res->json('data'));
    }

    public function test_tenant_admin_multi_store_aggregation(): void
    {
        $secondStore = Store::create([
            'name' => 'Second Store Branch',
            'code' => 'STR-002',
        ]);

        // Create 3 sales in Store 1
        for ($i = 1; $i <= 3; $i++) {
            PosSale::create([
                'store_id'    => $this->store->id,
                'user_id'     => $this->user->id,
                'invoice_no'  => "INV-S1-{$i}",
                'sale_date'   => now(),
                'grand_total' => 100,
                'status'      => 'COMPLETED',
            ]);
        }

        // Create 4 sales in Store 2
        for ($i = 1; $i <= 4; $i++) {
            PosSale::create([
                'store_id'    => $secondStore->id,
                'user_id'     => $this->user->id,
                'invoice_no'  => "INV-S2-{$i}",
                'sale_date'   => now(),
                'grand_total' => 200,
                'status'      => 'COMPLETED',
            ]);
        }

        // Store 1 isolated fetch
        $resS1 = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/pos-sales?page=1&limit=10');
        $resS1->assertOk();
        $this->assertSame(3, $resS1->json('pagination.total'));

        // Store 2 isolated fetch
        $resS2 = $this->withHeader('X-Company-Scope-Id', (string) $secondStore->id)
            ->getJson('/api/pos-sales?page=1&limit=10');
        $resS2->assertOk();
        $this->assertSame(4, $resS2->json('pagination.total'));

        // Company Superadmin Multi-Store Aggregated fetch ('all')
        $resAll = $this->withHeader('X-Company-Scope-Id', 'all')
            ->getJson('/api/pos-sales?page=1&limit=10');
        $resAll->assertOk();
        $this->assertSame(7, $resAll->json('pagination.total'));
        $this->assertCount(7, $resAll->json('data'));
    }

    // The tests below cover controllers that were converted to PaginationService but had no
    // dedicated pagination test yet -- prioritized by real-money/tenant-scoped data risk.

    public function test_purchase_invoices_endpoint_uses_cursor_mode(): void
    {
        $supplier = \App\Models\Supplier::create(['name' => 'Test Supplier', 'code' => 'SUP-001']);

        for ($i = 1; $i <= 5; $i++) {
            \App\Models\PurchaseInvoice::create([
                'store_id'    => $this->store->id,
                'supplier_id' => $supplier->id,
                'invoice_no'  => "PI-{$i}",
                'invoice_date' => now()->toDateString(),
                'grand_total' => $i * 1000,
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/invoices?limit=2');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'cursor');
        $res->assertJsonPath('pagination.has_more', true);
        $this->assertNotNull($res->json('pagination.next_cursor'));
        $this->assertCount(2, $res->json('data'));
    }

    public function test_stock_outwards_endpoint_uses_cursor_mode(): void
    {
        $secondStore = Store::create(['name' => 'Receiving Store', 'code' => 'STR-RCV']);

        for ($i = 1; $i <= 4; $i++) {
            \App\Models\StockOutward::create([
                'source_store_id' => $this->store->id,
                'target_store_id' => $secondStore->id,
                'outward_no'      => "SO-{$i}",
                'outward_date'    => now()->toDateString(),
                'status'          => 'PENDING',
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/stock-outwards?limit=2');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'cursor');
        $this->assertCount(2, $res->json('data'));
    }

    public function test_supplier_payments_endpoint_uses_cursor_mode(): void
    {
        $supplier = \App\Models\Supplier::create(['name' => 'Payment Supplier', 'code' => 'SUP-PAY']);

        for ($i = 1; $i <= 4; $i++) {
            \App\Models\SupplierPayment::create([
                'supplier_id'  => $supplier->id,
                'store_id'     => $this->store->id,
                'payment_no'   => "PAY-{$i}",
                'payment_date' => now()->toDateString(),
                'amount'       => $i * 500,
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/supplier-payments?limit=2');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'cursor');
        $this->assertCount(2, $res->json('data'));
    }

    public function test_settlements_endpoint_uses_cursor_mode(): void
    {
        for ($i = 1; $i <= 4; $i++) {
            \App\Models\Settlement::create([
                'store_id'        => $this->store->id,
                'batch_no'        => "BATCH-{$i}",
                'settlement_date' => now()->toDateString(),
                'total_sales'     => $i * 1000,
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/settlements?limit=2');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'cursor');
        $this->assertCount(2, $res->json('data'));
    }

    public function test_cash_register_sessions_endpoint_uses_cursor_mode(): void
    {
        for ($i = 1; $i <= 4; $i++) {
            \App\Models\CashRegisterSession::create([
                'store_id'  => $this->store->id,
                'user_id'   => $this->user->id,
                'opened_at' => now()->subHours($i),
                'status'    => 'OPEN',
            ]);
        }

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/cash-openings?limit=2');

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('pagination.mode', 'cursor');
        $this->assertCount(2, $res->json('data'));
    }
}
