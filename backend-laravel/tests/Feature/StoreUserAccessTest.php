<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreUserAccessTest extends TestCase
{
    use RefreshDatabase;

    private function storeUser(Store $store, string $role): User
    {
        return User::create(['name' => $role, 'username' => $role.$store->id, 'email' => $role.$store->id.'@example.test',
            'password' => 'secret', 'role' => $role, 'store_id' => $store->id]);
    }

    public function test_created_user_inherits_selected_store_without_store_one_fallback(): void
    {
        $store = Store::create(['name' => 'Branch', 'code' => 'USER-BRANCH']);
        Sanctum::actingAs($this->storeUser($store, 'admin'));
        $this->postJson('/api/user-access', ['name' => 'Staff', 'username' => 'new-staff', 'password' => 'secret123', 'role' => 'staff'])
            ->assertCreated()->assertJsonPath('data.store_id', $store->id);
    }

    public function test_company_administrator_can_create_in_selected_owned_store_but_not_another_company(): void
    {
        $one = Store::create(['name' => 'One', 'code' => 'ASSIGN-ONE', 'platform_company_code' => 'CMP-OWN']);
        $two = Store::create(['name' => 'Two', 'code' => 'ASSIGN-TWO', 'platform_company_code' => 'CMP-OWN']);
        $other = Store::create(['name' => 'Other', 'code' => 'ASSIGN-OTHER', 'platform_company_code' => 'CMP-OTHER']);
        $owner = User::create(['name' => 'Company owner', 'username' => 'assign-owner', 'email' => 'assign-owner@example.test',
            'password' => 'secret123', 'role' => 'admin', 'store_id' => null, 'platform_company_code' => 'CMP-OWN']);
        Sanctum::actingAs($owner);
        $payload = ['name' => 'Staff', 'username' => 'staff@example.test', 'email' => 'staff@example.test',
            'password' => 'secret123', 'role' => 'user', 'store_id' => $two->id, 'is_active' => false];
        $this->withHeaders(['X-Company-Scope-Id' => (string) $two->id, 'X-Company-Id' => (string) $two->id, 'X-Store-Id' => (string) $two->id])
            ->postJson('/api/user-access', $payload)->assertCreated()->assertJsonPath('data.store_id', $two->id)
            ->assertJsonPath('data.platform_company_code', 'CMP-OWN')->assertJsonPath('data.is_active', false);
        $payload['store_id'] = $other->id;
        $this->withHeaders(['X-Company-Scope-Id' => (string) $other->id, 'X-Company-Id' => (string) $other->id, 'X-Store-Id' => (string) $other->id])
            ->postJson('/api/user-access', $payload)->assertForbidden()->assertJsonPath('code', 'STORE_ACCESS_DENIED');
        $this->assertDatabaseMissing('users', ['store_id' => $one->id]);
        $this->assertDatabaseMissing('users', ['store_id' => $other->id]);
    }

    public function test_staff_cannot_grant_administrator_access_and_admin_cannot_read_other_store_user(): void
    {
        $one = Store::create(['name' => 'One', 'code' => 'USER-ONE']);
        $two = Store::create(['name' => 'Two', 'code' => 'USER-TWO']);
        Sanctum::actingAs($this->storeUser($one, 'staff'));
        $this->postJson('/api/user-access', ['name' => 'Admin', 'username' => 'escalation', 'password' => 'secret123', 'role' => 'admin'])->assertForbidden();
        $other = $this->storeUser($two, 'staff');
        Sanctum::actingAs($this->storeUser($one, 'admin'));
        $this->getJson('/api/user-access/'.$other->id)->assertNotFound();
        $this->putJson('/api/user-access/'.$other->id, ['name' => 'Changed'])->assertNotFound();
    }
}
