<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MasterImportCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $store = Store::create(['name' => 'Import store', 'code' => 'IMPORT-COVERAGE']);
        Sanctum::actingAs(User::create(['name' => 'Importer', 'username' => 'importer', 'email' => 'importer@example.test', 'password' => 'secret', 'role' => 'admin']));
        $this->withHeader('X-Store-Id', (string) $store->id);
    }

    public function test_each_standard_master_import_retains_sample_fields(): void
    {
        $cases = [
            'brands' => ['brands', ['printing_name' => 'Print', 'min_margin' => 0, 'max_margin' => 20, 'brand_type' => 'Premium'], ['printing_name' => 'Print', 'min_margin' => 0, 'max_margin' => 20]],
            'products' => ['products', ['hsn' => '1234', 'uom' => 'KG', 'active' => false], ['hsn' => '1234', 'uom' => 'KG', 'active' => false]],
            'items' => ['products', ['selling_name' => 'Imported item', 'printing_name' => 'Receipt', 'mrp' => null], ['printing_name' => 'Receipt', 'mrp' => 0]],
            'taxes' => ['taxes', ['tax_percentage' => 18, 'tax_type' => 'GST', 'is_sales_tax' => false, 'is_purchase_tax' => true, 'is_disabled' => true], ['tax_percentage' => 18, 'is_sales_tax' => false, 'is_purchase_tax' => true, 'is_disabled' => true]],
            'suppliers' => ['suppliers', ['contact_person' => 'Contact', 'contact_no' => '123456', 'gst' => 'GST-IMPORT', 'email_id' => 'supplier@example.test'], ['contact_person' => 'Contact', 'contact_no' => '123456', 'gst' => 'GST-IMPORT']],
            'transports' => ['transports', ['contact_person' => 'Driver', 'contact_no' => '123456', 'bank_account_name' => 'Bank account'], ['contact_person' => 'Driver', 'contact_no' => '123456', 'bank_account_name' => 'Bank account']],
            'agents' => ['agents', ['commission_pct' => 12.5, 'commission_amt' => 10], ['commission_pct' => 12.5, 'commission_amt' => 10]],
            'employees' => ['employees', ['employee_code' => 'EMP-IMPORT', 'date_of_joining' => '2026-10-22', 'contact_no' => '123456', 'surname' => 'Surname'], ['date_of_joining' => '2026-10-22', 'contact_no' => '123456', 'surname' => 'Surname']],
            'sizes' => ['sizes', ['measurement' => '40', 'ageSet' => 'Adult', 'UOM' => 'PCS', 'sortOrder' => 3, 'IsComboSize' => true, 'IsMeterSize' => true, 'isVariant' => true], ['measurement' => '40', 'age_set' => 'Adult', 'uom' => 'PCS', 'sort_order' => 3, 'isComboSize' => true, 'isMeterSize' => true, 'isVariant' => true]],
            'size-groups' => ['size_groups', ['sortOrder' => 4, 'enableSizeRatio' => true], ['sort_order' => 4, 'enableSizeRatio' => true]],
        ];
        foreach ($cases as $path => [$table, $fields, $expected]) {
            $code = 'COVER-'.$path;
            $this->postJson('/api/'.$path.'/bulk', [array_replace(['code' => $code, 'name' => 'Imported '.$path], $fields)])->assertCreated()->assertJsonPath('created', 1);
            $id = DB::table($table)->where('code', $code)->value('id');
            $this->assertNotNull($id, $path);
            $record = $this->getJson('/api/'.$path.'/'.$id)->assertOk()->json('data');
            foreach ($expected as $field => $value) {
                $this->assertEquals($value, $record[$field] ?? null, $path.'.'.$field);
            }
        }
    }

    public function test_every_attribute_and_configuration_upload_route_in_the_master_catalog(): void
    {
        $attributes = ['pattern', 'style', 'type', 'colour', 'material', 'sleeve', 'fit', 'marker', 'ageset', 'units', 'productgroups', 'producthierarchy', 'suppliergroup', 'customergroup', 'buyersgroup', 'barcodeid', 'division', 'productdivision', 'itemgroups', 'pricetags', 'sellingnames', 'productcoverage', 'dailypricegroup', 'coreproductgroup', 'dumpinggroup', 'customfields', 'companytype'];
        $configurations = ['location', 'counter', 'tailoring_unit', 'prf_reason', 'return_reason', 'sale_reason', 'seasons', 'po_type', 'settings', 'bank', 'swipping_machine', 'card_types', 'courier_type', 'sale_area', 'discount_remark', 'area_group_1', 'area_group_2', 'priority', 'city', 'district', 'country', 'agent_type', 'state', 'expenses_type', 'customer_category', 'vendor', 'offline_client', 'auto_number', 'loan_provider', 'delivery_location', 'additional_charges', 'upi_provider', 'job_work_charge', 'tailoring_charge', 'bundle_rack', 'document_import', 'supplier_group', 'voucher_type', 'buyer_group', 'customer_group', 'lead_event', 'lead_status', 'lead_priority', 'asset_types', 'food_counter', 'document_type', 'crm_sources', 'crm_visiting', 'purchase_type', 'address_type', 'tds_group'];
        foreach (['attributes' => $attributes, 'configurations' => $configurations] as $resource => $types) {
            foreach ($types as $type) {
                $code = 'IMP-'.$type;
                $this->postJson('/api/'.$resource.'/'.$type.'/bulk', [['code' => $code, 'name' => 'Import '.$type, 'sort_order' => 7, 'is_active' => false, 'extra_data' => ['test_value' => 'Retained', 'enabled' => false]]])->assertCreated()->assertJsonPath('created', 1);
                $table = $resource === 'attributes' ? 'attribute_values' : 'system_configurations';
                $id = DB::table($table)->where('code', $code)->value('id');
                $this->getJson('/api/'.$resource.'/'.$type.'/'.$id)->assertOk()->assertJsonPath('data.name', 'Import '.$type)->assertJsonPath('data.sort_order', 7)->assertJsonPath('data.is_active', false)->assertJsonPath('data.extra_data.test_value', 'Retained')->assertJsonPath('data.extra_data.enabled', false);
            }
        }
    }
}
