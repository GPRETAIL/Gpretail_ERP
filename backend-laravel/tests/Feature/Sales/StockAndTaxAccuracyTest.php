<?php

namespace Tests\Feature\Sales;

use App\Models\CashRegisterSession;
use App\Services\Sales\CashRegisterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/**
 * One product at a time: what a sale and a return do to the stock rows in the database, and what the bill, the
 * payments and the cash drawer say for every tax rate, discount, payment mix and return.
 */
class StockAndTaxAccuracyTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(6);
        Sanctum::actingAs($this->fixture['user']);
    }

    private function item(int $index = 0): array
    {
        return $this->fixture['items'][$index];
    }

    private function stock(int $index = 0): float
    {
        return (float) DB::table('stocks')->where('variant_id', $this->item($index)['variantId'])->value('quantity');
    }

    private function batchLeft(int $index = 0): float
    {
        return (float) DB::table('stock_batches')->where('variant_id', $this->item($index)['variantId'])->sum('remaining_qty');
    }

    private function returnLine(int $index, float $qty, float $price = 100): array
    {
        return ['productId' => $this->item($index)['productId'], 'variantId' => $this->item($index)['variantId'], 'qty' => $qty, 'price' => $price];
    }

    private function openDrawer(float $opening = 0): CashRegisterSession
    {
        return app(CashRegisterService::class)->open($this->fixture['store']->id, $this->fixture['user']->id,
            ['counterId' => $this->fixture['user']->counter_id, 'opening_cash' => $opening]);
    }

    private function position(CashRegisterSession $session): array
    {
        return app(CashRegisterService::class)->position($session);
    }

    /** @param array<int, array{index?: int, qty: float, price: float, discount?: float, tax?: float}> $lines */
    private function checkout(array $lines, array $pay = [], array $extra = [])
    {
        $items = array_map(fn ($line) => [...$this->item($line['index'] ?? 0), 'qty' => $line['qty'], 'price' => $line['price'], 'discount' => $line['discount'] ?? 0, 'tax' => $line['tax'] ?? 0], $lines);

        return $this->postJson('/api/pos-sales', array_merge(['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'items' => $items], $pay, $extra));
    }

    /** What the bill should say: each line is priced, discounted, then taxed on what is left, rounded to the paisa, and the bill adds the lines up. */
    private function expected(array $lines): array
    {
        $subtotal = 0.0;
        $tax = 0.0;
        $discount = 0.0;
        foreach ($lines as $line) {
            $base = round($line['qty'] * $line['price'] - ($line['discount'] ?? 0), 2);
            $subtotal += $base;
            $tax += round($base * ($line['tax'] ?? 0) / 100, 2);
            $discount += $line['discount'] ?? 0;
        }

        return ['subtotal' => round($subtotal, 2), 'tax' => round($tax, 2), 'discount' => round($discount, 2), 'grand' => round($subtotal + $tax, 2)];
    }

    // ───────────────────────── stock ─────────────────────────

    public function test_selling_one_takes_exactly_one_out_of_the_stock_row_and_the_batch(): void
    {
        $this->assertSame(1000.0, $this->stock());
        $this->checkout([['qty' => 1, 'price' => 100]], ['cashAmount' => 100])->assertCreated();

        $this->assertSame(999.0, $this->stock(), 'stocks.quantity is down by 1, not more');
        $this->assertSame(999.0, (float) DB::table('stocks')->where('variant_id', $this->item()['variantId'])->value('available_quantity'));
        $this->assertSame(999.0, $this->batchLeft(), 'the FIFO batch is down by 1 as well');
        $this->assertSame(1, DB::table('pos_sale_items')->count());
        $this->assertSame(1.0, (float) DB::table('pos_sale_items')->value('quantity'));
        foreach ([1, 2, 3] as $other) {
            $this->assertSame(1000.0, $this->stock($other), 'no other product moves');
        }
    }

    public function test_each_sale_takes_its_own_quantity_and_two_products_move_independently(): void
    {
        $this->checkout([['qty' => 1, 'price' => 100]], ['cashAmount' => 100])->assertCreated();
        $this->checkout([['qty' => 1, 'price' => 100]], ['cashAmount' => 100])->assertCreated();
        $this->assertSame(998.0, $this->stock());

        $this->checkout([['index' => 0, 'qty' => 3, 'price' => 100], ['index' => 1, 'qty' => 2, 'price' => 100]], ['cashAmount' => 500])->assertCreated();
        $this->assertSame(995.0, $this->stock(0));
        $this->assertSame(998.0, $this->stock(1));
        $this->assertSame(995.0, $this->batchLeft(0));
        $this->assertSame(998.0, $this->batchLeft(1));
    }

    public function test_a_return_of_one_puts_exactly_one_back_and_returning_more_than_was_sold_is_refused(): void
    {
        $saleId = $this->checkout([['qty' => 3, 'price' => 100]], ['cashAmount' => 300])->assertCreated()->json('data.id');
        $this->assertSame(997.0, $this->stock());
        $line = $this->returnLine(0, 1);

        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [$line]])->assertSuccessful();
        $this->assertSame(998.0, $this->stock(), 'one returned, one back');
        $this->assertSame(998.0, $this->batchLeft());
        $this->assertSame(1.0, (float) DB::table('pos_return_items')->sum('quantity'));

        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [[...$line, 'qty' => 3]]])->assertStatus(422);
        $this->assertSame(998.0, $this->stock(), 'a refused return changes nothing');

        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [[...$line, 'qty' => 2]]])->assertSuccessful();
        $this->assertSame(1000.0, $this->stock());
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [$line]])->assertStatus(422);
        $this->assertSame(1000.0, $this->stock(), 'nothing left to return, nothing added');
    }

    public function test_a_sale_that_is_refused_moves_no_stock(): void
    {
        $this->checkout([['qty' => 2, 'price' => 100]], ['cashAmount' => 50])->assertStatus(422);
        $this->assertSame(1000.0, $this->stock(), 'underpaid, so nothing was saved and nothing came out of stock');
        $this->assertSame(1000.0, $this->batchLeft());
        $this->assertSame(0, DB::table('pos_sales')->count());
    }

    public function test_a_retried_checkout_with_the_same_key_takes_the_stock_out_once(): void
    {
        $key = (string) Str::uuid();
        $this->checkout([['qty' => 1, 'price' => 100]], ['cashAmount' => 100], ['checkoutKey' => $key])->assertCreated();
        $this->checkout([['qty' => 1, 'price' => 100]], ['cashAmount' => 100], ['checkoutKey' => $key]);
        $this->assertSame(999.0, $this->stock());
        $this->assertSame(1, DB::table('pos_sales')->count());
    }

    // ───────────────────────── tax: every rate, one by one ─────────────────────────

    public static function rates(): array
    {
        return ['exempt 0%' => [0.0], 'GST 0.25%' => [0.25], 'GST 3%' => [3.0], 'GST 5%' => [5.0], 'GST 12%' => [12.0], 'GST 18%' => [18.0], 'GST 28%' => [28.0], 'cess 1%' => [1.0], 'VAT 14.5%' => [14.5]];
    }

    #[DataProvider('rates')]
    public function test_one_item_at_each_tax_rate_is_billed_and_saved_to_the_paisa(float $rate): void
    {
        $lines = [['qty' => 1, 'price' => 100, 'tax' => $rate]];
        $e = $this->expected($lines);
        $data = $this->checkout($lines, ['cashAmount' => $e['grand']])->assertCreated()->json('data');

        $sale = DB::table('pos_sales')->where('id', $data['id'])->first();
        $this->assertEqualsWithDelta($e['subtotal'], (float) $sale->subtotal, 0.0001);
        $this->assertEqualsWithDelta($e['tax'], (float) $sale->tax_amount, 0.0001);
        $this->assertEqualsWithDelta($e['grand'], (float) $sale->grand_total, 0.0001);
        $this->assertSame('PAID', $sale->status);
        $item = DB::table('pos_sale_items')->where('pos_sale_id', $sale->id)->first();
        $this->assertEqualsWithDelta($rate, (float) $item->tax_rate, 0.0001);
        $this->assertEqualsWithDelta($e['tax'], (float) $item->tax_amount, 0.0001);
        $this->assertEqualsWithDelta($e['grand'], (float) $item->subtotal, 0.0001, 'the line total is after discount, tax included');
        $this->assertSame(999.0, $this->stock(), 'one sold at any rate is one out of stock');
    }

    #[DataProvider('rates')]
    public function test_quantity_and_a_discount_at_each_tax_rate(float $rate): void
    {
        $lines = [['qty' => 3, 'price' => 499.99, 'discount' => 50, 'tax' => $rate]];
        $e = $this->expected($lines);
        $data = $this->checkout($lines, ['cashAmount' => $e['grand']])->assertCreated()->json('data');

        $sale = DB::table('pos_sales')->where('id', $data['id'])->first();
        $this->assertEqualsWithDelta($e['discount'], (float) $sale->discount_amount, 0.0001);
        $this->assertEqualsWithDelta($e['subtotal'], (float) $sale->subtotal, 0.0001, 'subtotal is after discount');
        $this->assertEqualsWithDelta($e['tax'], (float) $sale->tax_amount, 0.0001);
        $this->assertEqualsWithDelta($e['grand'], (float) $sale->grand_total, 0.0001);
        $this->assertSame(997.0, $this->stock());
    }

    public function test_a_bill_with_three_rates_adds_each_lines_own_tax(): void
    {
        $lines = [['index' => 0, 'qty' => 2, 'price' => 120.50, 'tax' => 5], ['index' => 1, 'qty' => 1, 'price' => 999.99, 'tax' => 12, 'discount' => 99.99], ['index' => 2, 'qty' => 4, 'price' => 33.33, 'tax' => 18]];
        $e = $this->expected($lines);
        $data = $this->checkout($lines, ['cashAmount' => $e['grand']])->assertCreated()->json('data');

        $sale = DB::table('pos_sales')->where('id', $data['id'])->first();
        $this->assertEqualsWithDelta($e['tax'], (float) $sale->tax_amount, 0.0001);
        $this->assertEqualsWithDelta($e['grand'], (float) $sale->grand_total, 0.0001);
        $perLine = round((float) DB::table('pos_sale_items')->where('pos_sale_id', $sale->id)->sum('tax_amount'), 2);
        $this->assertEqualsWithDelta((float) $sale->tax_amount, $perLine, 0.0001, 'the lines add up to the bill tax');
        $this->assertSame(998.0, $this->stock(0));
        $this->assertSame(999.0, $this->stock(1));
        $this->assertSame(996.0, $this->stock(2));
    }

    public function test_lines_with_fractions_of_a_paisa_still_add_up_to_the_bill_tax(): void
    {
        $lines = array_map(fn ($i) => ['index' => $i, 'qty' => 1, 'price' => 10.03, 'tax' => 18], [0, 1, 2, 3, 4, 5]);
        $e = $this->expected($lines);
        $sale = DB::table('pos_sales')->where('id', $this->checkout($lines, ['cashAmount' => 100])->assertCreated()->json('data.id'))->first();
        $perLine = round((float) DB::table('pos_sale_items')->where('pos_sale_id', $sale->id)->sum('tax_amount'), 2);
        $this->assertEqualsWithDelta($perLine, (float) $sale->tax_amount, 0.0001, "bill tax {$sale->tax_amount} against the sum of line taxes {$perLine}");
        $this->assertEqualsWithDelta($e['grand'], (float) $sale->grand_total, 0.0001);
    }

    public function test_igst_bills_carry_the_same_tax_and_remember_that_they_are_igst(): void
    {
        $lines = [['qty' => 2, 'price' => 250, 'tax' => 18]];
        $e = $this->expected($lines);
        $gst = DB::table('pos_sales')->where('id', $this->checkout($lines, ['cashAmount' => $e['grand']])->assertCreated()->json('data.id'))->first();
        $igst = DB::table('pos_sales')->where('id', $this->checkout($lines, ['cashAmount' => $e['grand'], 'igst' => true])->assertCreated()->json('data.id'))->first();

        $this->assertEqualsWithDelta((float) $gst->tax_amount, (float) $igst->tax_amount, 0.0001);
        $this->assertEqualsWithDelta((float) $gst->grand_total, (float) $igst->grand_total, 0.0001);
        $this->assertFalse((bool) $gst->igst);
        $this->assertTrue((bool) $igst->igst);
    }

    // ───────────────────────── cash and payments ─────────────────────────

    public function test_cash_over_the_bill_gives_change_and_the_drawer_counts_only_the_bill(): void
    {
        $session = $this->openDrawer(1000);
        $lines = [['qty' => 1, 'price' => 400, 'tax' => 18]]; // 472.00
        $sale = $this->checkout($lines, ['cashAmount' => 500])->assertCreated()->json('data');
        $row = DB::table('pos_sales')->where('id', $sale['id'])->first();

        $this->assertEqualsWithDelta(472.0, (float) $row->grand_total, 0.0001);
        $this->assertEqualsWithDelta(500.0, (float) $row->paid_amount, 0.0001);
        $this->assertEqualsWithDelta(28.0, (float) $row->change_amount, 0.0001);
        $this->assertSame('CASH', $row->payment_mode);
        $this->assertEqualsWithDelta(500.0, (float) DB::table('pos_payments')->where('pos_sale_id', $row->id)->where('payment_mode', 'CASH')->sum('amount'), 0.0001);

        $position = $this->position($session);
        $this->assertEqualsWithDelta(472.0, (float) $position['cash_sales'], 0.0001, 'cash taken less the change handed back');
        $this->assertEqualsWithDelta(1472.0, (float) $position['expected_before_expenses'], 0.0001, 'opening cash plus the bill');
    }

    public function test_cash_card_and_upi_together_are_saved_as_three_payments_and_only_the_cash_is_in_the_drawer(): void
    {
        $session = $this->openDrawer();
        $lines = [['qty' => 1, 'price' => 1000, 'tax' => 12]]; // 1120.00
        $sale = $this->checkout($lines, ['cashAmount' => 520, 'cardAmount' => 400, 'upiAmount' => 200])->assertCreated()->json('data');
        $row = DB::table('pos_sales')->where('id', $sale['id'])->first();

        $this->assertEqualsWithDelta(1120.0, (float) $row->grand_total, 0.0001);
        $this->assertEqualsWithDelta(1120.0, (float) $row->paid_amount, 0.0001);
        $this->assertEqualsWithDelta(0.0, (float) $row->change_amount, 0.0001);
        $payments = DB::table('pos_payments')->where('pos_sale_id', $row->id)->pluck('amount', 'payment_mode')->map(fn ($v) => (float) $v)->all();
        $this->assertEqualsWithDelta(520.0, $payments['CASH'], 0.0001);
        $this->assertEqualsWithDelta(400.0, $payments['CARD'], 0.0001);
        $this->assertEqualsWithDelta(200.0, $payments['UPI'], 0.0001);
        $this->assertEqualsWithDelta(520.0, (float) $this->position($session)['cash_sales'], 0.0001, 'card and UPI never enter the drawer');
    }

    public function test_a_credit_sale_takes_stock_and_records_no_cash(): void
    {
        $this->checkout([['qty' => 2, 'price' => 100, 'tax' => 5]], ['isCredit' => true], ['saleSaveAs' => 'unsettled'])->assertCreated();
        $this->assertSame(998.0, $this->stock());
        $this->assertEqualsWithDelta(0.0, (float) DB::table('pos_payments')->sum('amount'), 0.0001);
    }

    // ───────────────────────── returns: stock, refund, cash ─────────────────────────

    public function test_returning_one_of_three_refunds_a_third_of_the_taxed_discounted_line_and_puts_one_back(): void
    {
        $lines = [['qty' => 3, 'price' => 100, 'discount' => 10, 'tax' => 18]]; // (300 - 10) * 1.18 = 342.20
        $saleId = $this->checkout($lines, ['cashAmount' => 342.20])->assertCreated()->json('data.id');

        $return = $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [$this->returnLine(0, 1)], 'refundMode' => 'CASH'])->assertSuccessful()->json('data');
        $row = DB::table('pos_returns')->where('id', $return['id'])->first();
        $this->assertEqualsWithDelta(114.07, (float) $row->total_refund, 0.0001, 'a third of 342.20');
        $item = DB::table('pos_return_items')->where('pos_return_id', $row->id)->first();
        $this->assertEqualsWithDelta(3.33, (float) $item->discount, 0.0001);
        $this->assertEqualsWithDelta(17.40, (float) $item->tax_amount, 0.0001);
        $this->assertSame(998.0, $this->stock(), 'exactly one back');
    }

    public function test_returning_a_bill_one_piece_at_a_time_never_refunds_more_than_was_paid(): void
    {
        $lines = [['qty' => 3, 'price' => 100, 'discount' => 10, 'tax' => 18]];
        $saleId = $this->checkout($lines, ['cashAmount' => 342.20])->assertCreated()->json('data.id');

        foreach ([1, 2, 3] as $unit) {
            $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [$this->returnLine(0, 1)]])->assertSuccessful();
        }
        $refunded = round((float) DB::table('pos_returns')->sum('total_refund'), 2);
        $this->assertEqualsWithDelta(342.20, $refunded, 0.0001, "three single returns refunded {$refunded}, the bill was 342.20");
        $this->assertSame(1000.0, $this->stock());
    }

    public function test_returning_a_whole_bill_in_one_go_refunds_exactly_the_bill_total(): void
    {
        $lines = [['index' => 0, 'qty' => 2, 'price' => 249.99, 'tax' => 12], ['index' => 1, 'qty' => 1, 'price' => 99.50, 'tax' => 5, 'discount' => 4.5]];
        $e = $this->expected($lines);
        $saleId = $this->checkout($lines, ['cashAmount' => $e['grand']])->assertCreated()->json('data.id');

        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [$this->returnLine(0, 2, 249.99), $this->returnLine(1, 1, 99.50)]])->assertSuccessful();
        $this->assertEqualsWithDelta($e['grand'], round((float) DB::table('pos_returns')->sum('total_refund'), 2), 0.0001);
        $this->assertSame(1000.0, $this->stock(0));
        $this->assertSame(1000.0, $this->stock(1));
    }

    public function test_a_cash_refund_comes_out_of_the_drawer(): void
    {
        $session = $this->openDrawer();
        $saleId = $this->checkout([['qty' => 2, 'price' => 100, 'tax' => 18]], ['cashAmount' => 236])->assertCreated()->json('data.id');
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [$this->returnLine(0, 1)], 'refundMode' => 'CASH'])->assertSuccessful();

        $position = $this->position($session);
        $this->assertEqualsWithDelta(236.0, (float) $position['cash_sales'], 0.0001);
        $this->assertEqualsWithDelta(118.0, (float) $position['cash_refunds'], 0.0001);
        $this->assertEqualsWithDelta(118.0, (float) $position['expected_before_expenses'], 0.0001);
    }

    public function test_a_return_without_a_bill_adds_the_stock_back_and_refunds_with_the_tax_on_it(): void
    {
        $line = [...$this->returnLine(0, 2), 'tax' => 12];
        $return = $this->postJson('/api/pos-returns', ['standalone' => true, 'items' => [$line]])->assertSuccessful()->json('data');
        $this->assertEqualsWithDelta(224.0, (float) DB::table('pos_returns')->where('id', $return['id'])->value('total_refund'), 0.0001);
        $this->assertSame(1002.0, $this->stock());
    }
}
