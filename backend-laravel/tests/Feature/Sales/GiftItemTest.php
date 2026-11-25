<?php

namespace Tests\Feature\Sales;

use App\Models\ApprovalLimit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** A gift item is given free with a bill: it takes stock, has no price, and is listed on the Gift Issue report. */
class GiftItemTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        $this->store = $this->fixture['store']->id;
        Sanctum::actingAs($this->fixture['user']);
    }

    private function bill(array $lines, array $extra = []): array
    {
        return ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'items' => $lines, ...$extra];
    }

    private function line(int $index, array $over = []): array
    {
        return [...$this->fixture['items'][$index], ...$over];
    }

    private function stock(int $index): float
    {
        return (float) DB::table('stocks')->where('product_id', $this->fixture['items'][$index]['productId'])->value('quantity');
    }

    public function test_a_gift_line_takes_stock_but_adds_nothing_to_the_bill(): void
    {
        $sale = $this->postJson('/api/pos-sales', $this->bill([
            $this->line(0, ['price' => 100]),
            $this->line(1, ['price' => 0, 'qty' => 2, 'mrp' => 100, 'isGift' => true]),
        ], ['cashAmount' => 100]))->assertCreated()->json('data');

        $this->assertEquals(100, $sale['grand_total'], 'the gift adds nothing to the bill');
        $this->assertSame(999.0, $this->stock(0));
        $this->assertSame(998.0, $this->stock(1), 'the gift went out of stock');
        $gift = DB::table('pos_sale_items')->where('pos_sale_id', $sale['id'])->where('is_gift', true)->first();
        $this->assertSame([2.0, 0.0, 100.0], [(float) $gift->quantity, (float) $gift->selling_price, (float) $gift->unit_mrp]);
        $this->assertSame(1, DB::table('pos_sale_items')->where('pos_sale_id', $sale['id'])->where('is_gift', false)->count());
    }

    public function test_a_gift_item_cannot_carry_a_price_or_a_discount(): void
    {
        $this->postJson('/api/pos-sales', $this->bill([$this->line(0, ['price' => 50, 'isGift' => true])], ['cashAmount' => 0]))
            ->assertUnprocessable()->assertJsonValidationErrors(['items.0.isGift' => 'A gift item is given free. Remove its price and discount, or untick Gift.']);
        $this->postJson('/api/pos-sales', $this->bill([$this->line(0, ['price' => 0, 'discount' => 10, 'isGift' => true])], ['cashAmount' => 0]))
            ->assertUnprocessable()->assertJsonValidationErrors(['items.0.isGift']);
        $this->assertSame(0, DB::table('pos_sales')->count());
        $this->assertSame(1000.0, $this->stock(0));
    }

    public function test_the_gift_issue_report_lists_gifts_with_their_worth_and_cost_and_drops_a_cancelled_bill(): void
    {
        DB::table('products')->where('id', $this->fixture['items'][1]['productId'])->update(['cost_price' => 40]);
        $sale = $this->postJson('/api/pos-sales', $this->bill([
            $this->line(0, ['price' => 100]),
            $this->line(1, ['price' => 0, 'qty' => 2, 'mrp' => 100, 'isGift' => true]),
        ], ['cashAmount' => 100]))->assertCreated()->json('data');
        $this->postJson('/api/pos-sales', $this->bill([$this->line(0, ['price' => 100])], ['cashAmount' => 100]))->assertCreated();

        $rows = $this->getJson('/api/sales-reports/store/gift_issues')->assertOk()->json('data');
        $this->assertCount(1, $rows, 'only the gift line, not the paid ones');
        $this->assertSame($sale['bill_no'], $rows[0]['bill_no']);
        $this->assertSame([2.0, 200.0, 80.0], [(float) $rows[0]['quantity'], (float) $rows[0]['price_value'], (float) $rows[0]['cost_value']]);

        $this->deleteJson('/api/pos-sales/'.$sale['id'])->assertOk();
        $this->assertSame([], $this->getJson('/api/sales-reports/store/gift_issues')->assertOk()->json('data'));
        $this->assertSame(1000.0, $this->stock(1), 'cancelling gave the gift back');
    }

    public function test_a_cashier_over_the_discount_limit_needs_approval_to_give_a_gift(): void
    {
        ApprovalLimit::create(['store_id' => $this->store, 'role' => 'cashier', 'max_discount_percent' => 5, 'max_refund_amount' => 0]);
        $cashier = User::create(['name' => 'Till Cashier', 'username' => 'till-cashier', 'email' => 'till-cashier@example.test', 'password' => 'secret123',
            'role' => 'cashier', 'store_id' => $this->store, 'counter_id' => $this->fixture['user']->counter_id, 'is_active' => true]);
        Sanctum::actingAs($cashier);

        $this->postJson('/api/pos-sales', $this->bill([$this->line(0, ['price' => 0, 'mrp' => 100, 'isGift' => true])], ['cashAmount' => 0]))
            ->assertStatus(428)->assertJsonPath('code', 'APPROVAL_REQUIRED')->assertJsonPath('details.requested_percent', 100);
        $this->assertSame(1000.0, $this->stock(0));
    }
}
