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
