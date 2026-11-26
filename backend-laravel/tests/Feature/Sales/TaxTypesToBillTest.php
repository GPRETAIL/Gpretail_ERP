<?php

namespace Tests\Feature\Sales;

use App\Models\Tax;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Each tax type on the Tax master: the rate the POS is given for a product, and the bill that follows from it. */
class TaxTypesToBillTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        Sanctum::actingAs($this->fixture['user']);
    }

    public static function taxTypes(): array
    {
        $ranges = [
            ['from' => 0, 'to' => 1000, 'taxPercentage' => 5, 'cgstPercentage' => 2.5, 'sgstPercentage' => 2.5, 'inCost' => false],
            ['from' => 1000.01, 'to' => 0, 'taxPercentage' => 12, 'cgstPercentage' => 6, 'sgstPercentage' => 6, 'inCost' => false],
        ];

        return [
            'GST 18%' => ['GST', 18.0, [], 500.0, 18.0],
            'GST 5%' => ['GST', 5.0, [], 999.0, 5.0],
            'GST 0% exempt' => ['GST', 0.0, [], 250.0, 0.0],
            'VAT 14.5%' => ['VAT', 14.5, [], 800.0, 14.5],
            'CESS 1%' => ['CESS', 1.0, [], 800.0, 1.0],
            'Ranged GST below the band edge' => ['RGST', 0.0, ['rangedtable' => $ranges], 500.0, 5.0],
            'Ranged GST on the band edge' => ['RGST', 0.0, ['rangedtable' => $ranges], 1000.0, 5.0],
            'Ranged GST above the band edge' => ['RGST', 0.0, ['rangedtable' => $ranges], 2000.0, 12.0],
            'Ranged GST with no bands falls back to its rate' => ['RGST', 7.0, [], 500.0, 7.0],
        ];
    }

    #[DataProvider('taxTypes')]
    public function test_the_pos_gets_the_right_rate_for_the_tax_type_and_the_bill_follows_it(string $type, float $rate, array $extra, float $price, float $expectedRate): void
    {
        $tax = Tax::create(['store_id' => $this->fixture['store']->id, 'code' => 'TX-'.Str::random(5), 'name' => "$type $rate", 'type' => $type, 'rate' => $rate,
            'cgst_rate' => $rate / 2, 'sgst_rate' => $rate / 2, 'igst_rate' => $rate, 'extra_fields' => $extra, 'is_sales_tax' => true, 'is_active' => true]);
        $item = $this->fixture['items'][0];
        DB::table('products')->where('id', $item['productId'])->update(['tax_id' => $tax->id, 'sales_tax_id' => $tax->id, 'selling_price' => $price, 'mrp' => $price]);

        $row = collect($this->getJson('/api/pos-sales/stock-products?all=true')->assertOk()->json('data'))->firstWhere('productId', $item['productId']);
        $this->assertNotNull($row, 'the product is on the POS list');
        $this->assertEqualsWithDelta($expectedRate, (float) $row['tax'], 0.0001, "$type at $price");

        $tax = round($price * $expectedRate / 100, 2);
        $grand = round($price + $tax, 2);
        $sale = $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => $grand,
            'items' => [[...$item, 'qty' => 1, 'price' => $price, 'tax' => (float) $row['tax'], 'taxName' => $row['taxName'], 'taxType' => $row['taxType']]]])->assertCreated()->json('data');
        $saved = DB::table('pos_sales')->where('id', $sale['id'])->first();
        $this->assertEqualsWithDelta($tax, (float) $saved->tax_amount, 0.0001);
        $this->assertEqualsWithDelta($grand, (float) $saved->grand_total, 0.0001);
        $this->assertSame($type, DB::table('pos_sale_items')->where('pos_sale_id', $sale['id'])->value('tax_type'));
    }

    public function test_a_barcode_lookup_gives_the_same_rate_as_the_list(): void
    {
        $ranges = [['from' => 0, 'to' => 1000, 'taxPercentage' => 5], ['from' => 1000.01, 'to' => 0, 'taxPercentage' => 12]];
        $tax = Tax::create(['store_id' => $this->fixture['store']->id, 'code' => 'TX-R', 'name' => 'Ranged', 'type' => 'RGST', 'rate' => 0, 'extra_fields' => ['rangedtable' => $ranges], 'is_sales_tax' => true, 'is_active' => true]);
        $item = $this->fixture['items'][1];
        DB::table('products')->where('id', $item['productId'])->update(['tax_id' => $tax->id, 'selling_price' => 1500, 'mrp' => 1500]);
        DB::table('barcodes')->where('id', $item['barcodeId'])->update(['selling_price' => 1500, 'mrp' => 1500, 'final_price' => 1500]);

        $code = DB::table('barcodes')->where('id', $item['barcodeId'])->value('barcode');
        $found = $this->getJson('/api/pos-sales/barcode-lookup?barcode='.$code)->assertOk()->json('data');
        $this->assertEqualsWithDelta(12.0, (float) $found['tax_rate'], 0.0001);
    }
}
