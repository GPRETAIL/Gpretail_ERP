<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\AttributeValue;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\InventoryEntry;
use App\Models\PlatformActivation;
use App\Models\Product;
use App\Models\PurchaseInvoice;
use App\Models\Size;
use App\Models\SizeGroup;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\Tax;
use App\Models\Transport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class Phase8CodeQualityAndSecurityTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create([
            'name' => 'Phase 8 Store',
            'code' => 'STR-P8',
            'is_active' => true,
        ]);

        $this->admin = User::create([
            'name' => 'Phase 8 Admin',
            'username' => 'p8admin',
            'email' => 'p8admin@example.test',
            'password' => 'secret123',
            'role' => 'admin',
            'store_id' => $this->store->id,
            'is_active' => true,
        ]);
    }

    public function test_item_controller_rejects_svg_or_html_upload_on_image_field(): void
    {
        Storage::fake('public');

        $svgFile = UploadedFile::fake()->createWithContent(
            'malicious.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        );

        $this->actingAs($this->admin)
            ->withHeader('X-Store-Id', (string) $this->store->id)
            ->postJson('/api/v1/items', [
                'name' => 'Test Kurta',
                'code' => 'KRT-001',
                'image' => $svgFile,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    public function test_models_define_explicit_fillable_allowlists(): void
    {
        foreach ([Product::class, Agent::class, AttributeValue::class, Size::class, SizeGroup::class] as $modelClass) {
            $instance = new $modelClass;
            $this->assertNotEmpty($instance->getFillable(), "{$modelClass} must define an explicit \$fillable list.");
        }
    }

    public function test_store_controller_create_strips_platform_fields(): void
    {
        $res = $this->actingAs($this->admin)
            ->postJson('/api/v1/companies', [
                'name' => 'Branch Store',
                'code' => 'STR-BRANCH',
                'platform_store_id' => 99999,
                'platform_licence_token' => 'forged-token',
                'unexpected_column' => 'ignored',
            ])
            ->assertCreated();

        $createdId = $res->json('data.id');
        $created = Store::findOrFail($createdId);
        $this->assertNull($created->platform_store_id);
        $this->assertNull($created->platform_licence_token);
    }

    public function test_inventory_entry_search_does_not_bypass_status_filter(): void
    {
        InventoryEntry::create([
            'store_id' => $this->store->id,
            'entry_no' => 'IE-URGENT-DRAFT-1',
            'entry_date' => now()->toDateString(),
            'type' => 'ADJUSTMENT',
            'status' => 'DRAFT',
            'notes' => 'urgent batch',
            'created_by' => $this->admin->id,
        ]);

        InventoryEntry::create([
            'store_id' => $this->store->id,
            'entry_no' => 'IE-COMP-1',
            'entry_date' => now()->toDateString(),
            'type' => 'ADJUSTMENT',
            'status' => 'COMPLETED',
            'notes' => 'regular batch',
            'created_by' => $this->admin->id,
        ]);

        $res = $this->actingAs($this->admin)
            ->withHeader('X-Store-Id', (string) $this->store->id)
            ->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/v1/inventory-entries?status=COMPLETED&search=urgent')
            ->assertOk();

        $this->assertCount(0, $res->json('data'));
    }

    public function test_supplier_payment_dashboard_summary_calculates_real_overdue_payables(): void
    {
        $supplier = Supplier::create([
            'store_id' => $this->store->id,
            'name' => 'Silk Mills',
            'code' => 'SUP-SILK',
            'is_active' => true,
        ]);

        // Recent unpaid invoice (not overdue)
        PurchaseInvoice::create([
            'store_id' => $this->store->id,
            'supplier_id' => $supplier->id,
            'invoice_no' => 'PI-RECENT',
            'invoice_date' => now()->subDays(5)->toDateString(),
            'grand_total' => 1000,
            'paid_amount' => 0,
            'payment_status' => 'UNPAID',
            'status' => 'APPROVED',
        ]);

        // Overdue unpaid invoice (45 days old)
        PurchaseInvoice::create([
            'store_id' => $this->store->id,
            'supplier_id' => $supplier->id,
            'invoice_no' => 'PI-OVERDUE',
            'invoice_date' => now()->subDays(45)->toDateString(),
            'grand_total' => 600,
            'paid_amount' => 100,
            'payment_status' => 'PARTIAL',
            'status' => 'APPROVED',
        ]);

        $res = $this->actingAs($this->admin)
            ->withHeader('X-Store-Id', (string) $this->store->id)
            ->getJson('/api/v1/supplier-payments/dashboard-summary')
            ->assertOk();

        $this->assertEquals(1500.0, (float) $res->json('data.totalPayables'));
        $this->assertEquals(500.0, (float) $res->json('data.overduePayables'));
    }

    public function test_item_image_validation_accepts_raster_and_rejects_disguised_or_oversized_files_without_saving(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin);
        // A valid 1px PNG keeps this security test independent of the GD extension.
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', true);
        $id = $this->postJson('/api/items', ['name' => 'Raster item', 'code' => 'RASTER',
            'image' => UploadedFile::fake()->createWithContent('photo.png', $png)])->assertCreated()->json('data.id');
        $image = Product::findOrFail($id)->image;
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $image));

        $html = UploadedFile::fake()->createWithContent('disguised.jpg', '<html><script>alert(1)</script></html>');
        // A real UploadedFile sniffs bytes; FileFake otherwise infers MIME from its .jpg name.
        foreach ([new UploadedFile($html->getPathname(), 'disguised.jpg', 'image/jpeg', null, true),
            UploadedFile::fake()->createWithContent('large.png', $png)->size(2049)] as $file) {
            $response = $this->putJson('/api/items/'.$id, ['image' => $file]);
            $this->assertSame(422, $response->status(), $file->getClientOriginalName().' '.$response->getContent());
            $response->assertJsonValidationErrors('image');
            $this->assertSame($image, Product::findOrFail($id)->image);
            $this->assertCount(1, Storage::disk('public')->allFiles('products'));
        }
    }

    public function test_model_allowlists_discard_unknown_attributes_and_protect_primary_keys_and_timestamps(): void
    {
        foreach ([Product::class, Agent::class, AttributeValue::class, Size::class, SizeGroup::class] as $modelClass) {
            $model = new $modelClass;
            $model->fill(['name' => 'Allowed', 'id' => 999, 'created_at' => '2000-01-01', 'updated_at' => '2000-01-01', 'unexpected_column' => 'ignored']);
            $this->assertSame('Allowed', $model->name);
            foreach (['id', 'created_at', 'updated_at', 'unexpected_column'] as $field) {
                $this->assertArrayNotHasKey($field, $model->getAttributes(), $modelClass.'.'.$field);
            }
        }
    }

    public function test_store_update_cannot_inject_licence_fields_or_bypass_theme_permissions(): void
    {
        $this->actingAs($this->admin)->putJson('/api/companies/'.$this->store->id, [
            'contactPerson' => 'Updated contact', 'unexpected_column' => 'ignored',
            'platform_store_id' => 999, 'platform_company_code' => 'OTHER', 'platform_licence_token' => 'forged',
            'platform_active_till' => now()->addYears(10)->toIso8601String(), 'platform_subscription' => ['plan_name' => 'Forged'],
            'activation_required' => false, 'activated_at' => now()->toIso8601String(),
        ])->assertOk()->assertJsonPath('data.contact_person', 'Updated contact');
        $this->store->refresh();
        foreach (['platform_store_id', 'platform_company_code', 'platform_licence_token', 'platform_active_till', 'platform_subscription', 'activated_at'] as $field) {
            $this->assertNull($this->store->$field, $field);
        }
        $this->putJson('/api/companies/'.$this->store->id, ['theme_customization' => ['primary' => '#ffffff']])->assertUnprocessable();
        $this->postJson('/api/companies', ['name' => 'Theme bypass', 'code' => 'THEME-BYPASS', 'theme_customization' => []])->assertUnprocessable();
    }

    public function test_blank_master_filters_cannot_override_other_filters(): void
    {
        $this->actingAs($this->admin);
        $cases = [
            ['agents', Agent::class, 'email'], ['brands', Brand::class, 'name'],
            ['categories', Category::class, 'description'], ['customers', Customer::class, 'email'],
            ['employees', Employee::class, 'email'], ['products', Product::class, 'name'],
            ['suppliers', Supplier::class, 'email'], ['taxes', Tax::class, 'name'],
            ['transports', Transport::class, 'phone'],
        ];
        foreach ($cases as [$path, $modelClass, $field]) {
            // Both records are blank; only the active one should match the combined filters.
            $attributes = ['name' => 'Blank test', 'code' => 'BLANK-INACTIVE', 'is_active' => false, $field => ''];
            $attributes[$modelClass === Product::class ? 'company_id' : 'store_id'] = $this->store->id;
            (new $modelClass)->forceFill($attributes)->save();
            $active = (new $modelClass)->forceFill(array_replace($attributes, ['code' => 'BLANK-ACTIVE', 'is_active' => true]));
            $active->save();
            $filters = json_encode([['field' => 'is_active', 'operator' => 'equals', 'value' => 1], ['field' => $field, 'operator' => 'blank']]);
            $rows = $this->getJson('/api/'.$path.'?'.http_build_query(['column_filters' => $filters]))->assertOk()->json('data');
            $this->assertEquals([$active->id], array_column($rows, 'id'), $path.' must retain the active filter');
        }
    }

    public function test_product_pack_size_survives_partial_edits_and_can_be_explicitly_cleared(): void
    {
        $this->actingAs($this->admin);
        $id = $this->postJson('/api/products', ['name' => 'Pack product', 'code' => 'PACK', 'packSize' => 12])->assertCreated()->json('data.id');
        $this->putJson('/api/products/'.$id, ['name' => 'Renamed pack'])->assertOk();
        $this->getJson('/api/products/'.$id)->assertOk()->assertJsonPath('data.pack_size', 12);
        $this->putJson('/api/products/'.$id, ['pack_size' => 0])->assertOk();
        $this->getJson('/api/products/'.$id)->assertOk()->assertJsonPath('data.pack_size', 0);
        $this->putJson('/api/products/'.$id, ['pack_size' => null])->assertOk();
        $this->getJson('/api/products/'.$id)->assertOk()->assertJsonPath('data.pack_size', null);
        $this->putJson('/api/products/'.$id, ['packSize' => -1])->assertUnprocessable()->assertJsonValidationErrors('packSize');
    }

    public function test_cross_store_codes_and_barcode_aliases_do_not_resolve_foreign_records(): void
    {
        $other = Store::create(['name' => 'Other', 'code' => 'OTHER-P8']);
        Product::create(['company_id' => $other->id, 'name' => 'Other product', 'code' => 'FOREIGN-CODE', 'barcode' => 'FOREIGN-BARCODE']);
        $this->actingAs($this->admin)->withHeader('X-Company-Scope-Id', (string) $this->store->id);
        foreach (['products/FOREIGN-CODE', 'items/FOREIGN-CODE', 'products/barcode/FOREIGN-CODE', 'products/barcode/FOREIGN-BARCODE'] as $path) {
            $this->getJson('/api/'.$path)->assertNotFound();
        }
        $this->putJson('/api/products/FOREIGN-CODE', ['name' => 'Hijacked'])->assertNotFound();
        $this->deleteJson('/api/items/FOREIGN-CODE')->assertNotFound();
        $this->assertDatabaseHas('products', ['company_id' => $other->id, 'name' => 'Other product']);
    }

    public function test_subscription_status_does_not_treat_company_activation_as_a_valid_store_licence_or_paid_renewal_as_trial(): void
    {
        $this->admin->update(['platform_company_code' => 'CMP-P8']);
        PlatformActivation::create(['company_code' => 'CMP-P8', 'activated' => true, 'status' => 'active',
            'deployment_id' => 'phase8-deployment', 'licence_state' => 'ACTIVE', 'active_till' => now()->addDays(7)]);
        $this->store->update(['platform_company_code' => 'CMP-P8', 'platform_store_id' => 80, 'activated_at' => now(),
            'platform_active_till' => now()->addDays(7), 'platform_licence_token' => 'invalid-token',
            'platform_subscription' => ['plan_name' => 'Standard', 'is_trial' => false]]);
        $this->actingAs($this->admin)->getJson('/api/companies/subscription/status')->assertOk()
            ->assertJsonPath('data.stores.0.status', 'ACCESS_BLOCKED')->assertJsonPath('data.stores.0.licence_valid', false)
            ->assertJsonPath('data.stores.0.plan', 'Standard')->assertJsonPath('data.stores.0.onTrial', false);
        $this->store->update(['platform_subscription' => ['plan_name' => 'Trial', 'is_trial' => true]]);
        $this->getJson('/api/companies/subscription/status')->assertOk()->assertJsonPath('data.stores.0.onTrial', true);
    }

    public function test_payables_exclude_overpayments_respect_age_boundary_and_include_only_authorized_stores(): void
    {
        $this->travelTo(now()->startOfDay());
        $second = Store::create(['name' => 'Assigned store', 'code' => 'SECOND-P8']);
        $foreign = Store::create(['name' => 'Unassigned store', 'code' => 'FOREIGN-P8']);
        $this->admin->assignedStores()->attach($second->id);
        foreach ([[$this->store, 30, 100, 0], [$this->store, 31, 200, 0], [$this->store, 45, 100, 150], [$second, 45, 300, 0], [$foreign, 45, 999, 0]] as $i => [$store, $age, $total, $paid]) {
            $supplier = Supplier::create(['store_id' => $store->id, 'name' => 'Supplier '.$i, 'code' => 'P8-SUP-'.$i]);
            PurchaseInvoice::create(['store_id' => $store->id, 'supplier_id' => $supplier->id, 'invoice_no' => 'P8-PI-'.$i,
                'invoice_date' => now()->subDays($age)->toDateString(), 'grand_total' => $total,
                'paid_amount' => $paid, 'payment_status' => 'PARTIAL', 'status' => 'APPROVED']);
        }
        $this->actingAs($this->admin)->getJson('/api/supplier-payments/dashboard-summary')->assertOk()
            ->assertJsonPath('data.totalPayables', 600)->assertJsonPath('data.overduePayables', 500)->assertJsonPath('data.pendingPayments', 3);
        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->getJson('/api/supplier-payments/dashboard-summary')->assertOk()
            ->assertJsonPath('data.totalPayables', 300)->assertJsonPath('data.overduePayables', 200)->assertJsonPath('data.pendingPayments', 2);
    }

    public function test_monthly_payment_totals_do_not_include_the_same_month_of_previous_years(): void
    {
        $this->travelTo(now()->startOfDay());
        $supplier = Supplier::create(['name' => 'Monthly supplier', 'code' => 'MONTHLY-SUP']);
        foreach ([[now(), 50], [now()->subYear(), 900], [now()->subMonthNoOverflow(), 700]] as $i => [$date, $amount]) {
            SupplierPayment::create(['store_id' => $this->store->id, 'supplier_id' => $supplier->id,
                'payment_no' => 'P8-PAY-'.$i, 'payment_date' => $date->toDateString(), 'amount' => $amount]);
        }
        $this->actingAs($this->admin)->getJson('/api/supplier-payments/dashboard-summary')->assertOk()
            ->assertJsonPath('data.totalPaymentsThisMonth', 1)->assertJsonPath('data.totalAmountPaidThisMonth', 50)
            ->assertJsonPath('data.paidThisMonth', 50);
    }

    public function test_hr_code_search_cannot_escape_the_configuration_type_filter(): void
    {
        $this->actingAs($this->admin);
        $this->postJson('/api/hr-roles', ['name' => 'Role', 'code' => 'P8-ROLE-MATCH'])->assertCreated();
        $this->postJson('/api/hr-departments', ['name' => 'Department', 'code' => 'P8-DEPT'])->assertCreated();
        $this->getJson('/api/hr-departments?search=MATCH')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/hr-roles?search=MATCH')->assertOk()->assertJsonCount(1, 'data');
    }
}
