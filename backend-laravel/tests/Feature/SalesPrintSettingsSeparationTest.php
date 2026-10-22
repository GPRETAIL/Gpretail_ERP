<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SalesPrintSettingsSeparationTest extends TestCase
{
    use RefreshDatabase;

    public function test_section_saves_preserve_the_other_editors_latest_settings(): void
    {
        $store = Store::create(['name' => 'Print store', 'code' => 'PRINT', 'receipt_customization' => [
            'billNumberReset' => 'yearly', 'receiptWidthInches' => '2.5', 'thankYouMessage' => 'Existing message', 'legacyExtra' => 'preserved',
        ]]);
        Sanctum::actingAs(User::create(['name' => 'Owner', 'username' => 'printowner', 'email' => 'print@example.test', 'password' => 'secret', 'role' => 'admin']));
        $this->withHeader('X-Store-Id', (string) $store->id);

        $this->putJson('/api/sales-customization', ['companyId' => $store->id, 'settingsSection' => 'sales', 'billNumberReset' => 'monthly', 'receiptWidthInches' => '4.0'])
            ->assertOk()->assertJsonPath('data.billNumberReset', 'monthly')->assertJsonPath('data.receiptWidthInches', '2.5');
        $this->putJson('/api/sales-customization', ['companyId' => $store->id, 'settingsSection' => 'receipt', 'receiptWidthInches' => '3.5', 'billNumberReset' => 'daily'])
            ->assertOk()->assertJsonPath('data.billNumberReset', 'monthly')->assertJsonPath('data.receiptWidthInches', '3.5');
        $this->getJson('/api/sales-customization?companyId='.$store->id)->assertOk()
            ->assertJsonPath('data.thankYouMessage', 'Existing message')->assertJsonPath('data.legacyExtra', 'preserved');
        $this->assertArrayNotHasKey('settingsSection', $store->fresh()->receipt_customization);
    }

    public function test_legacy_a4_width_is_not_reset_by_saving_sales_behaviour(): void
    {
        $store = Store::create(['name' => 'Legacy store', 'code' => 'LEGACY-PRINT', 'receipt_customization' => ['receiptWidthInches' => 'A4']]);
        Sanctum::actingAs(User::create(['name' => 'Owner', 'username' => 'legacyowner', 'email' => 'legacyprint@example.test', 'password' => 'secret', 'role' => 'admin']));
        $this->withHeader('X-Store-Id', (string) $store->id);
        $this->putJson('/api/sales-customization', ['companyId' => $store->id, 'settingsSection' => 'sales', 'saleSaveAs' => 'unsettled'])
            ->assertOk()->assertJsonPath('data.receiptWidthInches', 'A4');
    }
}
