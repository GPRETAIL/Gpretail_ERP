<?php

namespace Tests\Feature\Sales;

use App\Support\EmployeeStickerSize;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Sales > Employee Sticker: the sticker size is saved per store in Sales Customisation, inside safe ranges. */
class EmployeeStickerSizeTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($this->fixture['user']);
    }

    private function save(mixed $size): array
    {
        return $this->postJson('/api/sales-customization', ['companyId' => $this->fixture['store']->id, 'settingsSection' => 'sales', 'employeeSticker' => $size])
            ->assertOk()->json('data');
    }

    public function test_the_size_is_saved_and_read_back_for_the_store(): void
    {
        $this->save(['labelWidthMm' => 50, 'labelHeightMm' => 25, 'labelsPerRow' => 2, 'codeSizeMm' => 14.5, 'nameFontSizePx' => 11, 'detailFontSizePx' => 9]);

        $stored = $this->getJson('/api/sales-customization?company_id='.$this->fixture['store']->id)->assertOk()->json('data.employeeSticker');
        $this->assertEquals(['labelWidthMm' => 50, 'labelHeightMm' => 25, 'labelsPerRow' => 2, 'codeSizeMm' => 14.5, 'nameFontSizePx' => 11, 'detailFontSizePx' => 9], $stored);
    }

    public function test_values_are_kept_inside_safe_ranges_and_bad_ones_are_dropped(): void
    {
        $saved = $this->save(['labelWidthMm' => 9999, 'labelHeightMm' => -3, 'labelsPerRow' => 7, 'codeSizeMm' => 'big', 'nameFontSizePx' => 11.6, 'unknown' => 5])['employeeSticker'];

        $this->assertEquals(['labelWidthMm' => 200, 'labelHeightMm' => 10, 'labelsPerRow' => 3, 'nameFontSizePx' => 12], $saved);
        $this->assertArrayNotHasKey('codeSizeMm', $saved, 'not a number: dropped, so the product sticker value stays in use');
        $this->assertArrayNotHasKey('unknown', $saved);
    }

    public function test_null_or_nothing_usable_goes_back_to_the_product_sticker_size(): void
    {
        $this->save(['labelWidthMm' => 40]);
        $this->assertNull($this->save(null)['employeeSticker']);
        $this->assertNull($this->save(['labelWidthMm' => 'abc'])['employeeSticker']);
        $this->assertNull(EmployeeStickerSize::sanitize('50x25'));
    }

    public function test_saving_the_size_keeps_the_other_sales_settings(): void
    {
        $this->postJson('/api/sales-customization', ['companyId' => $this->fixture['store']->id, 'settingsSection' => 'sales', 'saleSaveAs' => 'unsettled'])->assertOk();

        $data = $this->save(['labelWidthMm' => 60]);

        $this->assertSame('unsettled', $data['saleSaveAs']);
        $this->assertEquals(60, $data['employeeSticker']['labelWidthMm']);
    }
}
