<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RecordListRoundTripTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->store = Store::create(['name' => 'List Audit Store', 'code' => 'LIST-AUDIT']);
        Sanctum::actingAs(User::create(['name' => 'List Auditor', 'username' => 'list-auditor',
            'email' => 'list-auditor@example.test', 'password' => 'secret', 'role' => 'admin', 'store_id' => $this->store->id]));
        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id);
    }

    private function listed(string $path, int $id): array
    {
        $rows = $this->getJson('/api/'.$path)->assertOk()->json('data');
        $row = collect($rows)->firstWhere('id', $id);
        $this->assertNotNull($row, $path.' must include the newly saved record');

        return $row;
    }

    public function test_product_lists_keep_separate_taxes_size_store_and_optional_columns_at_every_page_size(): void
    {
        $sales = $this->postJson('/api/taxes', ['name' => 'Sales GST', 'code' => 'SALES-GST', 'tax_percentage' => 18])->assertCreated()->json('data.id');
        $purchase = $this->postJson('/api/taxes', ['name' => 'Purchase GST', 'code' => 'PUR-GST', 'tax_percentage' => 5])->assertCreated()->json('data.id');
        $sizeGroup = $this->postJson('/api/size-groups', ['name' => 'Adult sizes', 'code' => 'ADULT'])->assertCreated()->json('data.id');
        $id = $this->postJson('/api/products', ['name' => 'Complete product', 'code' => 'COMPLETE', 'sales_tax_id' => $sales,
            'purchase_tax_id' => $purchase, 'size_group_id' => $sizeGroup, 'hsn' => '6109', 'section' => 'Mens',
            'selling_mode' => 'Piece', 'stock_holding_period' => 0, 'dumping' => true, 'dumping_value' => 0,
            'daily_price' => true, 'daily_price_value' => 0, 'is_core' => true, 'is_core_value' => 0,
            'auto_po' => true, 'auto_po_value' => 0, 'purchase_entry_attributes' => []])->assertCreated()->json('data.id');
        foreach (['products?limit=25', 'products?limit=500', 'products?all=true'] as $path) {
            $row = $this->listed($path, $id);
            $this->assertEquals('Sales GST', data_get($row, 'sales_tax.name'), $path);
            $this->assertEquals('Purchase GST', data_get($row, 'purchase_tax.name'), $path);
            $this->assertEquals('Adult sizes', data_get($row, 'size_group.name'), $path);
            $this->assertEquals('List Audit Store', data_get($row, 'company_ref.name'), $path);
            foreach (['stock_holding_period', 'dumping_value', 'daily_price_value', 'is_core_value', 'auto_po_value'] as $field) {
                $this->assertArrayHasKey($field, $row, $path.'.'.$field);
                $this->assertSame('0', (string) $row[$field], $path.'.'.$field);
            }
        }
        $this->putJson('/api/products/'.$id, ['purchase_tax_id' => null])->assertOk();
        $this->getJson('/api/products/'.$id)->assertOk()->assertJsonPath('data.purchase_tax_id', null);
    }

    public function test_partial_product_edits_do_not_erase_prices_flags_or_explicitly_cleared_relations(): void
    {
        $brand = $this->postJson('/api/brands', ['name' => 'Preserved brand', 'code' => 'PRESERVED'])->assertCreated()->json('data.id');
        $id = $this->postJson('/api/products', ['name' => 'Before', 'code' => 'PARTIAL', 'brand_id' => $brand,
            'cost_price' => 50, 'selling_price' => 90, 'mrp' => 100, 'active' => false, 'dumping' => true])->assertCreated()->json('data.id');
        $this->putJson('/api/products/'.$id, ['name' => 'After'])->assertOk();
        $this->getJson('/api/products/'.$id)->assertOk()->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.dumping', true)->assertJsonPath('data.cost_price', '50.00')
            ->assertJsonPath('data.selling_price', '90.00')->assertJsonPath('data.brand_id', $brand);
        $this->putJson('/api/products/'.$id, ['brand_id' => null])->assertOk();
        $this->getJson('/api/products/'.$id)->assertOk()->assertJsonPath('data.brand_id', null)
            ->assertJsonPath('data.updated_by', 'List Auditor');
    }

    public function test_product_group_attribute_is_not_confused_with_an_unrelated_category_id(): void
    {
        Category::create(['name' => 'Unrelated legacy category', 'code' => 'LEGACY']);
        $group = $this->postJson('/api/attributes/productgroups', ['name' => 'Created product group', 'code' => 'PG-AUDIT'])->assertCreated()->json('data.id');
        $id = $this->postJson('/api/products', ['name' => 'Grouped product', 'code' => 'GROUPED', 'product_group_id' => $group])->assertCreated()->json('data.id');
        $this->getJson('/api/products/'.$id)->assertOk()->assertJsonPath('data.product_group_id', $group)
            ->assertJsonPath('data.category.name', 'Created product group');
        $this->assertSame('Created product group', data_get($this->listed('products', $id), 'category.name'));
    }

    public function test_item_list_and_detail_include_the_selected_size_and_parent_product(): void
    {
        $size = $this->postJson('/api/sizes', ['name' => 'XL', 'code' => 'SIZE-XL'])->assertCreated()->json('data.id');
        $parent = $this->postJson('/api/products', ['name' => 'Parent', 'code' => 'PARENT-LIST'])->assertCreated()->json('data.id');
        $id = $this->postJson('/api/items', ['selling_name' => 'Sized item', 'item_code' => 'SIZED', 'product_id' => $parent,
            'size_id' => $size, 'printing_name' => 'Printed item', 'mrp' => 0, 'active' => false])->assertCreated()->json('data.id');
        $row = $this->listed('items', $id);
        $this->assertSame('XL', data_get($row, 'size.name'));
        $this->assertSame('Parent', data_get($row, 'product.name'));
        $this->assertFalse($row['active']);
        $this->getJson('/api/items/'.$id)->assertOk()->assertJsonPath('data.size.name', 'XL');
    }

    public function test_hr_configuration_form_fields_are_retained_in_lists_and_after_partial_edits(): void
    {
        foreach (['hr-departments', 'hr-sections'] as $path) {
            $id = $this->postJson('/api/'.$path, ['name' => 'Sales '.$path, 'code' => $path, 'isSales' => true])->assertCreated()->json('data.id');
            $this->assertTrue($this->listed($path, $id)['is_sales'] ?? null, $path);
            $this->putJson('/api/'.$path.'/'.$id, ['name' => 'Changed'])->assertOk();
            $this->getJson('/api/'.$path.'/'.$id)->assertOk()->assertJsonPath('data.is_sales', true);
        }
        $id = $this->postJson('/api/hr-working-hours', ['name' => 'Day shift', 'code' => 'DAY-SHIFT',
            'minimumFullDay' => '08:00', 'minimumPresent' => '04:00', 'fromTime' => '09:00',
            'toTime' => '18:00', 'workingHours' => '08:00'])->assertCreated()->json('data.id');
        $row = $this->listed('hr-working-hours', $id);
        foreach (['minimum_full_day' => '08:00', 'minimum_present' => '04:00', 'from_time' => '09:00', 'to_time' => '18:00', 'working_hours' => '08:00'] as $field => $expected) {
            $this->assertSame($expected, $row[$field] ?? null, $field);
        }
    }

    public function test_other_master_lists_keep_entered_columns_zero_values_and_inactive_status(): void
    {
        $cases = [
            'brands' => ['printing_name' => 'Receipt brand', 'min_margin' => 0, 'max_margin' => 20],
            'suppliers' => ['contact_person' => 'Supplier contact', 'contact_no' => '123456', 'gst' => 'GST-AUDIT', 'email_id' => 'supplier@example.test'],
            'transports' => ['contact_person' => 'Transport contact', 'contact_no' => '123456', 'business_mode' => 'Courier', 'allowed_payment_mode' => 'Cash'],
            'agents' => ['contact_person' => 'Agent contact', 'contact_no' => '123456', 'commission_pct' => 0],
            'employees' => ['contact_no' => '123456', 'email_id' => 'employee@example.test', 'surname' => 'Surname'],
            'taxes' => ['tax_percentage' => 0, 'is_sales_tax' => false, 'is_purchase_tax' => true],
        ];
        foreach ($cases as $path => $fields) {
            $id = $this->postJson('/api/'.$path, array_merge(['name' => 'Audit '.$path, 'code' => 'AUDIT-'.$path, 'is_active' => false], $fields))->assertCreated()->json('data.id');
            $row = $this->listed($path, $id);
            foreach ($fields as $field => $expected) {
                $this->assertArrayHasKey($field, $row, $path.'.'.$field);
                $this->assertEquals($expected, $row[$field], $path.'.'.$field);
            }
            $this->assertFalse($row['is_active'], $path);
            $this->assertSame('List Auditor', $row['created_by'], $path);
            $this->assertEquals($this->store->id, $row['company_id'] ?? $row['store_id'], $path);
        }
    }

    public function test_hr_floor_and_designation_lists_keep_selected_location_and_role(): void
    {
        $location = $this->postJson('/api/configurations/location', ['name' => 'First floor location', 'code' => 'LOC-LIST'])->assertCreated()->json('data.id');
        $floor = $this->postJson('/api/hr-floors', ['name' => 'First floor', 'code' => 'FLOOR-LIST', 'locationId' => $location])->assertCreated()->json('data.id');
        $this->assertSame('First floor location', data_get($this->listed('hr-floors?paginate=true', $floor), 'location.name'));
        $role = $this->postJson('/api/hr-roles', ['name' => 'Floor manager', 'code' => 'ROLE-LIST'])->assertCreated()->json('data.id');
        $designation = $this->postJson('/api/hr-designations', ['name' => 'Manager', 'code' => 'DES-LIST', 'roleId' => $role])->assertCreated()->json('data.id');
        $this->assertSame('Floor manager', data_get($this->listed('hr-designations?paginate=true', $designation), 'role.name'));
        $this->putJson('/api/hr-designations/'.$designation, ['roleId' => null, 'roleName' => 'SUPERVISOR'])->assertOk();
        $this->getJson('/api/hr-designations/'.$designation)->assertOk()->assertJsonPath('data.role_name', 'SUPERVISOR')->assertJsonPath('data.role_id', null);
        $this->assertNotContains($floor, array_column($this->getJson('/api/hr-working-hours')->assertOk()->json('data'), 'id'));
    }

    public function test_configuration_and_attribute_list_columns_survive_create_for_all_catalog_types(): void
    {
        $catalog = [
            'configurations' => ['location', 'counter', 'tailoring_unit', 'prf_reason', 'return_reason', 'sale_reason', 'seasons', 'po_type', 'settings', 'bank', 'swipping_machine', 'card_types', 'courier_type', 'sale_area', 'discount_remark', 'area_group_1', 'area_group_2', 'priority', 'city', 'district', 'country', 'agent_type', 'state', 'expenses_type', 'customer_category', 'vendor', 'offline_client', 'auto_number', 'loan_provider', 'delivery_location', 'additional_charges', 'upi_provider', 'job_work_charge', 'tailoring_charge', 'bundle_rack', 'document_import', 'supplier_group', 'voucher_type', 'buyer_group', 'customer_group', 'lead_event', 'lead_status', 'lead_priority', 'asset_types', 'food_counter', 'document_type', 'crm_sources', 'crm_visiting', 'purchase_type', 'address_type', 'tds_group'],
            'attributes' => ['pattern', 'style', 'type', 'colour', 'material', 'sleeve', 'fit', 'marker', 'ageset', 'units', 'productgroups', 'producthierarchy', 'suppliergroup', 'customergroup', 'buyersgroup', 'barcodeid', 'division', 'productdivision', 'itemgroups', 'pricetags', 'sellingnames', 'productcoverage', 'dailypricegroup', 'coreproductgroup', 'dumpinggroup', 'customfields', 'companytype'],
        ];
        foreach ($catalog as $resource => $types) {
            foreach ($types as $type) {
                $path = $resource.'/'.$type;
                $code = 'LIST-'.$type;
                $id = $this->postJson('/api/'.$path, ['name' => 'Saved '.$type, 'code' => $code, 'sort_order' => 0, 'is_active' => false])->assertCreated()->json('data.id');
                $row = $this->listed($path.'?paginate=true', $id);
                $this->assertSame($code, $row['code'], $path);
                $this->assertSame('Saved '.$type, $row['name'], $path);
                $this->assertFalse($row['is_active'], $path);
                $this->assertEquals(0, $row['sort_order'], $path);
                $this->assertSame('List Auditor', $row['created_by'], $path);
                $this->assertEquals($this->store->id, $row['company_id'], $path);
            }
        }
    }

    public function test_transport_entry_form_fields_are_saved_listed_and_reopened(): void
    {
        $supplier = $this->postJson('/api/suppliers', ['name' => 'Warehouse supplier', 'code' => 'WH-SUP'])->assertCreated()->json('data.id');
        $transport = $this->postJson('/api/transports', ['name' => 'Warehouse courier', 'code' => 'WH-TRP'])->assertCreated()->json('data.id');
        $from = $this->postJson('/api/configurations/city', ['name' => 'Chennai', 'code' => 'CHN'])->assertCreated()->json('data.id');
        $to = $this->postJson('/api/configurations/city', ['name' => 'Madurai', 'code' => 'MDU'])->assertCreated()->json('data.id');
        $id = $this->postJson('/api/transport-entries', ['lrNo' => 'ENTERED-LR', 'lrDate' => '2026-10-28', 'lrMode' => 'Courier',
            'supplierId' => $supplier, 'transportId' => $transport, 'fromCityId' => $from, 'receivingCityId' => $to,
            'noOfBundles' => 0, 'noOfPieces' => 12, 'goodsValue' => 100, 'invoiceNo' => 'SUP-REF'])->assertCreated()->json('data.id');
        $row = $this->listed('transport-entries', $id);
        $this->assertSame('ENTERED-LR', $row['lr_no']);
        $this->assertSame('Courier', $row['lr_mode']);
        $this->assertSame('Warehouse supplier', data_get($row, 'supplier.name'));
        $this->assertSame('Warehouse courier', data_get($row, 'transport.name'));
        $this->assertSame('Chennai', data_get($row, 'fromCity.name'));
        $this->assertSame('Madurai', data_get($row, 'receivingCity.name'));
        $this->assertEquals(0, $row['no_of_bundles']);
        $this->putJson('/api/transport-entries/'.$id, ['noOfPieces' => 20])->assertOk();
        $this->getJson('/api/transport-entries/'.$id)->assertOk()->assertJsonPath('data.no_of_pieces', 20)->assertJsonPath('data.lr_no', 'ENTERED-LR');
        $this->postJson('/api/transport-entries', ['lrNo' => 'OPTIONAL-BLANKS', 'noOfBundles' => '', 'actualWgt' => '',
            'freightChargeAmount' => '', 'lrMode' => 'Courier'])->assertCreated()->assertJsonPath('data.no_of_bundles', 0);
    }

    public function test_warehouse_invoice_header_preserves_list_totals_and_charge_lines_without_adding_stock(): void
    {
        $supplier = $this->postJson('/api/suppliers', ['name' => 'Bill supplier', 'code' => 'BILL-SUP'])->assertCreated()->json('data.id');
        $transport = $this->postJson('/api/transport-entries', ['lr_no' => 'BILL-LR'])->assertCreated()->json('data.id');
        $id = $this->postJson('/api/invoices', ['transportEntryId' => $transport, 'supplierId' => $supplier,
            'invoiceNo' => 'COMMERCIAL-1', 'invoiceDate' => '2026-10-28', 'entryDate' => '2026-10-28',
            'bundles' => 3, 'baseAmount' => 100, 'taxCharges' => 18, 'netAmount' => 118,
            'items' => [['type' => 'Base Amount', 'amountOn' => 100, 'taxPerc' => 18, 'netAmount' => 118]]])->assertCreated()->json('data.id');
        $row = $this->listed('invoices', $id);
        $this->assertSame('List Audit Store', data_get($row, 'company.name'));
        $this->assertSame('Bill supplier', data_get($row, 'supplier.name'));
        $this->assertEquals(3, $row['bundles']);
        $this->assertEquals(18, $row['tax_charges']);
        $this->assertEquals(118, $row['net_amount']);
        $this->assertSame('2026-10-28', $row['entry_date']);
        $this->getJson('/api/invoices/'.$id)->assertOk()->assertJsonPath('data.items.0.amount_on', 100);
        $this->assertDatabaseCount('stocks', 0);
        $this->assertDatabaseCount('purchase_invoice_items', 0);
        $this->putJson('/api/invoices/'.$id, ['bundles' => 0])->assertOk();
        $this->getJson('/api/invoices/'.$id)->assertOk()->assertJsonPath('data.bundles', 0)->assertJsonPath('data.items.0.net_amount', 118);
    }

    public function test_supplemental_role_and_transport_references_cannot_point_to_another_store(): void
    {
        $foreign = Store::create(['name' => 'Unassigned store', 'code' => 'FOREIGN-LIST']);
        $role = DB::table('hr_departments')->insertGetId(['name' => 'Foreign role', 'code' => 'FOREIGN-ROLE',
            'store_id' => $foreign->id, 'configuration_type' => 'role']);
        $supplier = DB::table('suppliers')->insertGetId(['name' => 'Foreign supplier', 'code' => 'FOREIGN-SUPPLIER', 'store_id' => $foreign->id]);
        $this->postJson('/api/hr-designations', ['name' => 'Rejected', 'code' => 'REJECTED-DES', 'roleId' => $role])->assertUnprocessable();
        $this->postJson('/api/transport-entries', ['lrNo' => 'REJECTED-LR', 'supplierId' => $supplier])->assertUnprocessable();
        $this->assertDatabaseMissing('hr_designations', ['code' => 'REJECTED-DES']);
        $this->assertDatabaseMissing('transport_entries', ['lr_no' => 'REJECTED-LR']);
    }
}
