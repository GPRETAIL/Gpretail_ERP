<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\DirectPurchase;
use App\Models\PlatformActivation;
use App\Models\Product;
use App\Models\PurchaseInvoice;
use App\Models\Size;
use App\Models\SizeGroup;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\User;
use App\Services\StoreContext;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreContextTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_order_form_fields_survive_creation_and_detail_loading(): void
    {
        $store = $this->store('ORDER-FORM');
        $owner = $this->owner();
        $customer = Customer::create(['store_id' => $store->id, 'name' => 'Order customer', 'code' => 'ORDER-CUSTOMER']);
        $product = Product::create(['company_id' => $store->id, 'name' => 'Order product', 'code' => 'ORDER-PRODUCT']);
        $foreign = $this->store('FOREIGN-ORDER-FORM');
        $foreignSupplier = Supplier::create(['store_id' => $foreign->id, 'code' => 'FOREIGN-ORDER-SUPPLIER', 'name' => 'Foreign supplier']);
        Sanctum::actingAs($owner);
        $response = $this->withHeader('X-Company-Scope-Id', (string) $store->id)
            ->postJson('/api/customer-orders', ['customerId' => $customer->id, 'discountAmount' => 10, 'advancePaid' => 20,
                'items' => [['productId' => $product->id, 'productName' => 'Order product', 'brandName' => 'Test brand', 'designNo' => 'DESIGN-1', 'qty' => 1, 'price' => 100]]])
            ->assertCreated();
        $this->assertDatabaseHas('customer_orders', ['id' => $response->json('data.id'), 'discount_amount' => 10, 'net_amount' => 90, 'balance_due' => 70]);
        $this->getJson('/api/customer-orders/'.$response->json('data.id'))->assertOk()
            ->assertJsonPath('data.items.0.product_name', 'Order product')
            ->assertJsonPath('data.items.0.brand_name', 'Test brand');
        $this->postJson('/api/customer-orders', ['customerId' => $customer->id, 'supplierId' => $foreignSupplier->id,
            'items' => [['productId' => $product->id, 'qty' => 1, 'price' => 100]]])->assertUnprocessable();
    }

    public function test_supplier_pending_bills_aggregate_only_authorized_stores_and_respect_selection(): void
    {
        $owner = $this->owner();
        $owner->update(['platform_company_code' => 'CMP-PENDING']);
        $foreign = $this->store('PENDING-FOREIGN');
        $one = $this->store('PENDING-ONE');
        $two = $this->store('PENDING-TWO');
        foreach ([$one, $two] as $store) {
            $store->update(['platform_company_code' => 'CMP-PENDING']);
        }
        foreach ([$foreign, $one, $two] as $store) {
            $supplier = Supplier::create(['store_id' => $store->id, 'code' => 'SUP-'.$store->id, 'name' => 'Supplier '.$store->id]);
            PurchaseInvoice::create(['store_id' => $store->id, 'supplier_id' => $supplier->id,
                'invoice_no' => 'PENDING-'.$store->id, 'invoice_date' => now(),
                'grand_total' => 100, 'paid_amount' => 20, 'payment_status' => 'PARTIAL']);
            DirectPurchase::create(['store_id' => $store->id, 'supplier_id' => $supplier->id,
                'purchase_no' => 'DIRECT-'.$store->id, 'purchase_date' => now(),
                'total_amount' => 200, 'paid_amount' => 30, 'payment_status' => 'PARTIAL']);
        }

        Sanctum::actingAs($owner);
        $this->getJson('/api/supplier-payments/pending')->assertOk()
            ->assertJsonCount(4, 'data')->assertJsonPath('totalPayable', 500);
        $this->getJson('/api/supplier-payments/pending?company_id='.$two->id)->assertOk()
            ->assertJsonCount(2, 'data')->assertJsonPath('totalPayable', 250);
        $this->getJson('/api/supplier-payments/pending?company_id='.$foreign->id)->assertForbidden();
    }

    public function test_activated_deployment_does_not_expose_legacy_stores_to_unlinked_admins(): void
    {
        $owner = $this->owner();
        $this->store('LEGACY');
        PlatformActivation::create(['company_code' => 'CMP-OWNER', 'activated' => true, 'status' => 'active']);
        $this->assertCount(0, app(StoreContext::class)->stores($owner));
        $owner->update(['role' => 'super_admin']);
        $this->assertCount(0, app(StoreContext::class)->stores($owner));
    }

    public function test_demo_seeding_cannot_recreate_a_legacy_store_after_activation(): void
    {
        PlatformActivation::create(['company_code' => 'CMP-OWNER', 'activated' => true, 'status' => 'active']);
        $this->seed(DatabaseSeeder::class);
        $this->assertDatabaseMissing('stores', ['code' => 'SBT_01']);
    }

    private function owner(): User
    {
        return User::create(['name' => 'Tenant owner', 'username' => 'tenant-owner', 'email' => 'owner@example.test',
            'password' => 'password', 'role' => 'admin', 'store_id' => null, 'is_active' => true]);
    }

    private function store(string $code): Store
    {
        return Store::create(['name' => $code, 'code' => $code, 'is_active' => true]);
    }

    public function test_registered_tenant_identity_is_independent_of_selected_store(): void
    {
        $owner = $this->owner();
        $owner->update(['platform_company_code' => 'CMP-OWNER']);
        PlatformActivation::create(['company_code' => 'CMP-OWNER', 'activated' => true,
            'status' => 'active', 'tenant_admin_email' => $owner->email]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.is_tenant_admin', true)
            ->assertJsonPath('data.role', 'admin')->assertJsonCount(0, 'data.store_ids');
        $one = $this->store('TENANT-ONE');
        $one->update(['platform_company_code' => 'CMP-OWNER']);
        $this->getJson('/api/auth/me')->assertJsonPath('data.is_tenant_admin', true)
            ->assertJsonPath('data.can_switch_stores', true)
            ->assertJsonPath('data.store_id', $one->id);
        $two = $this->store('TENANT-TWO');
        $two->update(['platform_company_code' => 'CMP-OWNER']);
        $this->withHeader('X-Company-Scope-Id', (string) $two->id)->getJson('/api/auth/me')
            ->assertOk()->assertJsonPath('data.is_tenant_admin', true)->assertJsonPath('data.company_id', $two->id);
        $owner->update(['store_id' => $two->id]);
        $this->getJson('/api/auth/me')->assertJsonPath('data.is_tenant_admin', false)
            ->assertJsonPath('data.can_switch_stores', false);
    }

    public function test_another_email_or_company_cannot_claim_tenant_admin_identity(): void
    {
        $owner = $this->owner();
        $owner->update(['platform_company_code' => 'CMP-OWNER']);
        $activation = PlatformActivation::create(['company_code' => 'CMP-OWNER', 'activated' => true,
            'status' => 'active', 'tenant_admin_email' => 'different@example.test']);
        Sanctum::actingAs($owner);
        $this->getJson('/api/auth/me')->assertJsonPath('data.is_tenant_admin', false);
        $activation->update(['company_code' => 'CMP-OTHER', 'tenant_admin_email' => $owner->email]);
        $this->getJson('/api/auth/me')->assertJsonPath('data.is_tenant_admin', false);
    }

    public function test_tenant_theme_administration_cannot_cross_company_boundaries(): void
    {
        $owner = $this->owner();
        $owner->update(['platform_company_code' => 'CMP-OWNER']);
        PlatformActivation::create(['company_code' => 'CMP-OWNER', 'activated' => true,
            'status' => 'active', 'tenant_admin_email' => $owner->email]);
        $own = $this->store('OWN-THEME');
        $own->update(['platform_company_code' => 'CMP-OWNER']);
        $other = $this->store('OTHER-THEME');
        $other->update(['platform_company_code' => 'CMP-OTHER']);
        Sanctum::actingAs($owner);
        $this->putJson('/api/companies/'.$own->id.'/theme', ['primary_color' => '#112233'])->assertOk();
        $this->putJson('/api/companies/'.$other->id.'/theme', ['primary_color' => '#445566'])->assertNotFound();
        $this->getJson('/api/companies')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $own->id);
        $this->assertNull($other->fresh()->theme_customization);
    }

    public function test_owner_without_stores_cannot_create_data(): void
    {
        Store::query()->delete();
        Sanctum::actingAs($this->owner());
        $this->postJson('/api/sizes', ['name' => 'Small'])->assertStatus(422)->assertJsonPath('code', 'NO_STORES_ASSIGNED');
        $this->assertDatabaseMissing('sizes', ['name' => 'Small']);
    }

    public function test_one_store_is_selected_and_persisted_without_defaulting_to_one(): void
    {
        Store::query()->delete();
        $store = $this->store('ONLY');
        Sanctum::actingAs($this->owner());
        $this->postJson('/api/sizes', ['name' => 'Small'])->assertCreated();
        $this->assertDatabaseHas('sizes', ['name' => 'Small', 'company_id' => $store->id]);
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.store_id', $store->id);
    }

    public function test_multiple_stores_require_selection_and_do_not_write(): void
    {
        $this->store('ONE');
        $this->store('TWO');
        Sanctum::actingAs($this->owner());
        $this->postJson('/api/sizes', ['name' => 'Small'])->assertStatus(422)->assertJsonPath('code', 'STORE_SELECTION_REQUIRED');
        $this->assertDatabaseMissing('sizes', ['name' => 'Small']);
        $this->getJson('/api/auth/me')->assertJsonPath('data.store_id', null)->assertJsonPath('data.store_selection_required', true);
    }

    public function test_selected_store_owns_the_record_and_conflicting_payload_is_rejected(): void
    {
        $one = $this->store('ONE');
        $two = $this->store('TWO');
        Sanctum::actingAs($this->owner());
        $this->withHeader('X-Company-Scope-Id', (string) $two->id)->postJson('/api/sizes', ['name' => 'Medium'])->assertCreated();
        $this->assertDatabaseHas('sizes', ['name' => 'Medium', 'company_id' => $two->id]);
        $this->postJson('/api/sizes', ['name' => 'Wrong', 'company_id' => $one->id])->assertStatus(422)->assertJsonPath('code', 'STORE_CONTEXT_MISMATCH');
    }

    public function test_store_bound_user_cannot_select_or_list_another_store(): void
    {
        $one = $this->store('ONE');
        $two = $this->store('TWO');
        $user = $this->owner();
        $user->update(['store_id' => $one->id]);
        Sanctum::actingAs($user);
        $this->getJson('/api/companies')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $one->id);
        $this->withHeader('X-Company-Scope-Id', (string) $two->id)->postJson('/api/sizes', ['name' => 'Wrong'])->assertForbidden();
    }

    public function test_scoped_reads_and_updates_cannot_access_another_stores_record(): void
    {
        $one = $this->store('ONE');
        $two = $this->store('TWO');
        $group = SizeGroup::create(['name' => 'Private group', 'code' => 'PRIVATE_GROUP', 'company_id' => $one->id]);
        $size = Size::create(['name' => 'Private', 'code' => 'PRIVATE', 'size_group_id' => $group->id, 'company_id' => $one->id]);
        Sanctum::actingAs($this->owner());
        $this->withHeader('X-Company-Scope-Id', (string) $two->id)->getJson('/api/sizes/'.$size->id)->assertNotFound();
        $this->putJson('/api/sizes/'.$size->id, ['name' => 'Changed'])->assertNotFound();
        $this->assertDatabaseHas('sizes', ['id' => $size->id, 'name' => 'Private', 'company_id' => $one->id]);
    }

    public function test_inactive_store_cannot_accept_writes(): void
    {
        $store = $this->store('CLOSED');
        $store->update(['is_active' => false]);
        Sanctum::actingAs($this->owner());
        $this->withHeader('X-Company-Scope-Id', (string) $store->id)->postJson('/api/v1/sizes', ['name' => 'Wrong'])
            ->assertForbidden()->assertJsonPath('code', 'STORE_INACTIVE');
    }

    public function test_each_store_can_create_its_own_default_size_group(): void
    {
        $one = $this->store('ONE');
        $two = $this->store('TWO');
        Sanctum::actingAs($this->owner());
        $this->withHeader('X-Company-Scope-Id', (string) $one->id)->postJson('/api/sizes', ['name' => 'Small'])->assertCreated();
        $this->withHeader('X-Company-Scope-Id', (string) $two->id)->postJson('/api/sizes', ['name' => 'Small'])->assertCreated();
        $this->assertDatabaseHas('sizes', ['name' => 'Small', 'company_id' => $one->id]);
        $this->assertDatabaseHas('sizes', ['name' => 'Small', 'company_id' => $two->id]);
    }

    public function test_new_business_master_is_assigned_to_the_selected_store(): void
    {
        $store = $this->store('ONE');
        Sanctum::actingAs($this->owner());
        $this->withHeader('X-Company-Scope-Id', (string) $store->id)->postJson('/api/brands', ['name' => 'Local brand', 'code' => 'LOCAL'])->assertCreated();
        $this->assertDatabaseHas('brands', ['code' => 'LOCAL', 'store_id' => $store->id]);
    }

    public function test_a_size_cannot_reference_another_stores_group(): void
    {
        $one = $this->store('ONE');
        $two = $this->store('TWO');
        $group = SizeGroup::create(['name' => 'Private group', 'code' => 'PRIVATE_GROUP', 'company_id' => $one->id]);
        Sanctum::actingAs($this->owner());
        $this->withHeader('X-Company-Scope-Id', (string) $two->id)
            ->postJson('/api/sizes', ['name' => 'Wrong', 'size_group_id' => $group->id])->assertStatus(422);
        $this->assertDatabaseMissing('sizes', ['name' => 'Wrong']);
    }
}
