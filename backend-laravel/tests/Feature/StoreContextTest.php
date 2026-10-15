<?php

namespace Tests\Feature;

use App\Models\Size;
use App\Models\SizeGroup;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreContextTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): User
    {
        return User::create(['name' => 'Tenant owner', 'username' => 'tenant-owner', 'email' => 'owner@example.test',
            'password' => 'password', 'role' => 'admin', 'store_id' => null, 'is_active' => true]);
    }

    private function store(string $code): Store
    {
        return Store::create(['name' => $code, 'code' => $code, 'is_active' => true]);
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
