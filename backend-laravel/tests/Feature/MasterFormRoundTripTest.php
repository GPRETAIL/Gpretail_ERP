<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MasterFormRoundTripTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->store = Store::create(['name' => 'Round trip store', 'code' => 'ROUNDTRIP']);
        Sanctum::actingAs(User::create(['name' => 'Master Owner', 'username' => 'masterowner', 'email' => 'master@example.test', 'password' => 'secret', 'role' => 'admin']));
        $this->withHeader('X-Store-Id', (string) $this->store->id);
    }

    public function test_brand_printing_details_survive_create_list_reopen_and_partial_update(): void
    {
        $id = $this->postJson('/api/brands', ['name' => 'Brand', 'printing_name' => 'Printed Brand', 'min_margin' => 0, 'product_ids' => [2], 'product_margins' => ['2' => 4], 'created_by' => 'Forged'])->assertCreated()->json('data.id');
        $this->getJson('/api/brands/'.$id)->assertOk()->assertJsonPath('data.printing_name', 'Printed Brand')->assertJsonPath('data.created_by', 'Master Owner')->assertJsonPath('data.min_margin', 0)->assertJsonPath('data.company_id', $this->store->id);
        $this->putJson('/api/brands/'.$id, ['name' => 'Changed'])->assertOk()->assertJsonPath('data.printing_name', 'Printed Brand');
        $this->getJson('/api/brands')->assertOk()->assertJsonPath('data.0.printing_name', 'Printed Brand');
    }

    public function test_supplier_camel_case_form_values_and_inactive_rows_round_trip(): void
    {
        $id = $this->postJson('/api/suppliers', ['name' => 'Supplier', 'contactPerson' => 'Contact', 'contactNo' => '9876543210', 'gst' => 'GST-TEST', 'companyRegName' => 'Registered', 'emailId' => 'supplier@example.test', 'autoPOLimit' => '12', 'supportPO' => true, 'tanPan2' => 'PAN-TEST', 'active' => false])->assertCreated()->json('data.id');
        $this->getJson('/api/suppliers/'.$id)->assertOk()->assertJsonPath('data.contact_person', 'Contact')->assertJsonPath('data.contact_no', '9876543210')->assertJsonPath('data.gst', 'GST-TEST')->assertJsonPath('data.auto_po_limit', '12')->assertJsonPath('data.pan', 'PAN-TEST')->assertJsonPath('data.support_po', true)->assertJsonPath('data.is_active', false);
        $this->getJson('/api/suppliers')->assertOk()->assertJsonPath('data.0.contact_person', 'Contact');
        $this->putJson('/api/suppliers/'.$id, ['contactNo' => '123', 'supportPO' => false])->assertOk();
        $this->getJson('/api/suppliers/'.$id)->assertOk()->assertJsonPath('data.contact_no', '123')->assertJsonPath('data.gst', 'GST-TEST')->assertJsonPath('data.support_po', false);
    }

    public function test_transport_all_form_fields_and_rates_are_retained(): void
    {
        $id = $this->postJson('/api/transports', ['name' => 'Transport', 'businessMode' => 'Courier', 'contactPerson' => 'Driver', 'contactNo' => '123456', 'emailId' => 'driver@example.test', 'gst' => 'GST', 'bankAccountName' => 'Account', 'loadingPerBox' => '0', 'rcm' => false, 'isActive' => false, 'rates' => [['cityId' => '8', 'perKg' => '15']]])->assertCreated()->json('data.id');
        $this->getJson('/api/transports/'.$id)->assertOk()->assertJsonPath('data.contact_person', 'Driver')->assertJsonPath('data.contact_no', '123456')->assertJsonPath('data.email_id', 'driver@example.test')->assertJsonPath('data.bank_account_name', 'Account')->assertJsonPath('data.loading_per_box', '0')->assertJsonPath('data.rates.0.city_id', '8')->assertJsonPath('data.is_active', false);
        $this->getJson('/api/transports')->assertOk()->assertJsonPath('data.0.contact_person', 'Driver');
    }

    public function test_agent_commission_and_creator_round_trip(): void
    {
        $id = $this->postJson('/api/agents', ['name' => 'Agent', 'commissionPct' => '12.5', 'commissionAmt' => '2', 'active' => false])->assertCreated()->json('data.id');
        $this->getJson('/api/agents')->assertOk()->assertJsonPath('data.0.commission_pct', 12.5)->assertJsonPath('data.0.created_by', 'Master Owner');
        $this->putJson('/api/agents/'.$id, ['commissionPct' => 0])->assertOk()->assertJsonPath('data.commission_pct', 0);
    }

    public function test_item_can_be_created_from_the_actual_form_and_reopened_without_unknown_columns(): void
    {
        $brandId = $this->postJson('/api/brands', ['name' => 'Brand', 'code' => 'BR-ITEM'])->assertCreated()->json('data.id');
        $parent = $this->postJson('/api/products', ['name' => 'Parent product', 'code' => 'PARENT'])->assertCreated()->json('data.id');
        $id = $this->postJson('/api/items', ['item_code' => 'ITEM', 'selling_name' => 'Item', 'printing_name' => 'Receipt Item', 'brand_id' => $brandId, 'product_id' => $parent, 'pur_rate' => '12.5', 'sale_rate' => '18', 'design' => 'Design', 'type_id' => '', 'expiry' => true, 'expiry_value' => '30', 'active' => true])->assertCreated()->json('data.id');
        $this->getJson('/api/items/'.$id)->assertOk()->assertJsonPath('data.printing_name', 'Receipt Item')->assertJsonPath('data.product_id', $parent)->assertJsonPath('data.design', 'Design')->assertJsonPath('data.pur_rate', 12.5)->assertJsonPath('data.expiry', true);
        $this->putJson('/api/items/'.$id, ['sale_rate' => 25])->assertOk()->assertJsonPath('data.item_code', 'ITEM')->assertJsonPath('data.selling_name', 'Item')->assertJsonPath('data.printing_name', 'Receipt Item')->assertJsonPath('data.design', 'Design');
        $this->postJson('/api/items', ['item_code' => 'ITEM', 'selling_name' => 'Duplicate', 'brand_id' => $brandId])->assertUnprocessable();
    }

    public function test_every_configuration_type_returns_code_status_creator_and_store(): void
    {
        foreach (['location', 'counter', 'tailoring_unit', 'bank', 'sale_reason', 'seasons', 'state', 'agent_type', 'delivery_location'] as $type) {
            $id = $this->postJson('/api/configurations/'.$type, ['name' => 'Config '.$type, 'extra_data' => ['floor' => '1']])->assertCreated()->json('data.id');
            $row = $this->getJson('/api/configurations/'.$type.'?paginate=true')->assertOk()->json('data.0');
            $this->assertNotEmpty($row['code'], $type);
            $this->assertTrue($row['is_active']);
            $this->assertSame('Master Owner', $row['created_by']);
            $this->assertSame($this->store->id, $row['company_id']);
            $this->getJson('/api/configurations/'.$type.'/'.$id)->assertOk()->assertJsonPath('data.extra_data.floor', '1');
            $this->putJson('/api/configurations/'.$type.'/'.$id, ['is_active' => false])->assertOk();
            $this->getJson('/api/configurations/'.$type.'/'.$id)->assertOk()->assertJsonPath('data.is_active', false);
        }
    }

    public function test_tax_splits_flags_and_range_details_are_not_lost(): void
    {
        $id = $this->postJson('/api/taxes', ['tax_code' => 'GST-RT', 'name' => 'Tax', 'taxPercentage' => 18, 'is_sales_tax' => false, 'is_purchase_tax' => true, 'extra_fields' => ['cgst' => 0, 'sgst' => 18, 'rangedtable' => [['from' => 0, 'to' => 100, 'taxPercentage' => 5]]]])->assertCreated()->json('data.id');
        $this->getJson('/api/taxes/'.$id)->assertOk()->assertJsonPath('data.code', 'GST-RT')->assertJsonPath('data.cgst', 0)->assertJsonPath('data.is_sales_tax', false)->assertJsonPath('data.extra_fields.rangedtable.0.to', 100)->assertJsonPath('data.company_id', $this->store->id);
    }

    public function test_employee_details_and_collections_are_not_silently_discarded(): void
    {
        $id = $this->postJson('/api/employees', ['employee_code' => 'EMP-RT', 'name' => 'Employee', 'contact_no' => '123456', 'email_id' => 'employee@example.test', 'surname' => 'Test', 'gross_pay' => '12000', 'date_of_joining' => '2026-10-01', 'pf_no' => 'PF-RT', 'families' => [['name' => 'Family']], 'additionalInfos' => [['name' => 'Remark', 'value' => 'Test']]])->assertCreated()->json('data.id');
        $this->getJson('/api/employees/'.$id)->assertOk()->assertJsonPath('data.employee_code', 'EMP-RT')->assertJsonPath('data.contact_no', '123456')->assertJsonPath('data.date_of_joining', '2026-10-01')->assertJsonPath('data.surname', 'Test')->assertJsonPath('data.pf_no', 'PF-RT')->assertJsonPath('data.families.0.name', 'Family')->assertJsonPath('data.additionalInfos.0.name', 'Remark')->assertJsonPath('data.created_by', 'Master Owner');
    }

    public function test_blank_item_prices_and_stock_do_not_override_required_defaults(): void
    {
        $id = $this->postJson('/api/items', ['selling_name' => 'Blank prices', 'pur_rate' => '', 'sale_rate' => null, 'mrp' => '', 'reorder_min' => '', 'reorder_max' => null])->assertCreated()->json('data.id');
        $this->getJson('/api/items/'.$id)->assertOk()->assertJsonPath('data.mrp', 0)->assertJsonPath('data.pur_rate', 0)->assertJsonPath('data.sale_rate', 0);
        $this->putJson('/api/items/'.$id, ['mrp' => '', 'pur_rate' => '', 'reorder_min' => ''])->assertOk();
    }

    public function test_duplicate_brand_code_has_an_actionable_error_and_does_not_overwrite_existing_record(): void
    {
        $id = $this->postJson('/api/brands', ['code' => '1', 'name' => 'Existing'])->assertCreated()->json('data.id');
        $this->postJson('/api/brands', ['code' => '1', 'name' => 'New Testing'])->assertUnprocessable()->assertJsonValidationErrors('code')->assertJsonPath('message', 'The code has already been taken.');
        $this->getJson('/api/brands/'.$id)->assertOk()->assertJsonPath('data.name', 'Existing');
    }

    public function test_master_create_view_edit_save_list_delete_and_import_lifecycle(): void
    {
        foreach (['brands', 'items', 'products', 'suppliers', 'transports', 'agents', 'taxes', 'employees', 'sizes', 'size-groups', 'attributes/style', 'configurations/location', 'configurations/counter', 'configurations/tailoring_unit'] as $path) {
            $payload = ['name' => 'Lifecycle '.$path, 'code' => 'LIFE-'.str_replace('/', '-', $path)];
            $id = $this->postJson('/api/'.$path, $payload)->assertCreated()->json('data.id');
            $this->assertNotNull($id, $path);
            $this->getJson('/api/'.$path.'/'.$id)->assertOk()->assertJsonPath('data.name', $payload['name']);
            $this->putJson('/api/'.$path.'/'.$id, ['name' => 'Edited '.$path])->assertOk();
            $this->getJson('/api/'.$path.'/'.$id)->assertOk()->assertJsonPath('data.name', 'Edited '.$path);
            $this->getJson('/api/'.$path.'?paginate=true')->assertOk();
            $this->deleteJson('/api/'.$path.'/'.$id)->assertOk();
            $this->getJson('/api/'.$path.'/'.$id)->assertNotFound();
            $this->postJson('/api/'.$path.'/bulk', [array_replace($payload, ['code' => 'IMPORT-'.$payload['code']])])->assertCreated()->assertJsonPath('created', 1);
        }
    }

    public function test_import_failure_identifies_row_and_rolls_back_the_entire_batch(): void
    {
        $this->postJson('/api/brands', ['code' => 'EXISTING', 'name' => 'Existing'])->assertCreated();
        $response = $this->postJson('/api/brands/bulk', [['code' => 'ROLLBACK', 'name' => 'Valid'], ['code' => 'EXISTING', 'name' => 'Duplicate']])->assertUnprocessable();
        $this->assertSame('Excel row 3: The code has already been taken.', $response->json('errors')['rows.1.code'][0]);
        $this->assertDatabaseMissing('brands', ['code' => 'ROLLBACK']);
        $this->postJson('/api/brands/bulk', [])->assertUnprocessable();
    }

    public function test_item_import_resolves_store_owned_product_and_brand_names(): void
    {
        $brand = $this->postJson('/api/brands', ['name' => 'Import Brand', 'code' => 'IMP-BR'])->assertCreated()->json('data.id');
        $product = $this->postJson('/api/products', ['name' => 'Import Product', 'code' => 'IMP-PR'])->assertCreated()->json('data.id');
        $this->postJson('/api/items/bulk', [['item_code' => 123, 'selling_name' => 'Import Item', 'brand_id' => 'Import Brand', 'product_id' => 'IMP-PR', 'mrp' => '']])->assertCreated()->assertJsonPath('created', 1);
        $this->assertDatabaseHas('products', ['code' => '123', 'parent_product_id' => $product, 'brand_id' => $brand, 'mrp' => 0, 'company_id' => $this->store->id]);
    }

    public function test_import_keeps_store_ownership_and_denies_cashier_master_writes(): void
    {
        $otherStore = Store::create(['name' => 'Other', 'code' => 'OTHER-IMPORT']);
        $this->postJson('/api/brands/bulk', [['name' => 'Scoped import', 'code' => 'SCOPED', 'store_id' => $otherStore->id, 'created_by' => 'Forged']])->assertCreated();
        $this->assertDatabaseHas('brands', ['code' => 'SCOPED', 'store_id' => $this->store->id, 'created_by' => 'Master Owner']);
        Sanctum::actingAs(User::create(['name' => 'Cashier', 'username' => 'cashier-import', 'email' => 'cashier-import@example.test', 'password' => 'secret', 'role' => 'cashier']));
        $this->postJson('/api/brands/bulk', [['name' => 'Forbidden', 'code' => 'FORBIDDEN']])->assertForbidden();
        $this->assertDatabaseMissing('brands', ['code' => 'FORBIDDEN']);
    }
}
