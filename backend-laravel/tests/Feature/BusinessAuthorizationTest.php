<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use App\Services\BusinessPermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, Store $store): User
    {
        return User::factory()->create(['username' => 'security-'.Str::random(10), 'role' => $role, 'store_id' => $store->id, 'is_active' => true]);
    }

    public function test_master_mutations_enforce_roles_on_both_route_versions_and_aliases(): void
    {
        $store = Store::create(['name' => 'Security branch', 'code' => 'SEC-'.Str::random(10)]);
        foreach (['cashier', 'user', 'warehouse', 'unknown'] as $role) {
            Sanctum::actingAs($this->user($role, $store));
            foreach (['/api/taxes', '/api/tax', '/api/v1/taxes', '/api/v1/tax'] as $url) {
                $this->postJson($url, ['code' => 'DENY', 'name' => 'Denied', 'rate' => 5])->assertForbidden()->assertJsonPath('required_permission', 'masters.write');
            }
        }
        foreach (['admin', 'manager'] as $role) {
            Sanctum::actingAs($this->user($role, $store));
            $this->postJson('/api/taxes', ['code' => 'TAX-'.$role, 'name' => 'Allowed', 'rate' => 5])->assertCreated();
        }
    }

    public function test_permission_matrix_distinguishes_posting_approval_administration_and_export(): void
    {
        $permissions = app(BusinessPermissions::class);
        foreach (['admin', 'super_admin', 'manager', 'cashier', 'warehouse', 'user', 'staff', 'unknown', 'sync_system'] as $role) {
            $user = User::factory()->make(['role' => $role, 'is_active' => true]);
            $this->assertSame(in_array($role, ['admin', 'super_admin']), $permissions->allows($user, 'settings.manage'), $role);
            $this->assertSame(in_array($role, ['admin', 'super_admin', 'manager']), $permissions->allows($user, 'transactions.approve'), $role);
            $this->assertSame(in_array($role, ['admin', 'super_admin', 'manager', 'cashier']), $permissions->allows($user, 'sales.post'), $role);
            $this->assertSame(in_array($role, ['admin', 'super_admin', 'manager']), $permissions->allows($user, 'reports.export'), $role);
        }
        $staff = User::factory()->make(['role' => 'staff', 'is_active' => true]);
        $this->assertTrue($permissions->allows($staff, 'personal'));
        $this->assertFalse($permissions->allows($staff, 'masters.write'));
        $sync = User::factory()->make(['role' => 'sync_system', 'is_active' => false]);
        $this->assertTrue($permissions->allows($sync, 'masters.write', true));
        $this->assertFalse($permissions->allows($sync, 'settings.manage', true));
        $this->assertFalse($permissions->allows($sync, 'read', true));
    }

    public function test_store_scope_and_active_account_are_required_in_addition_to_permission(): void
    {
        $one = Store::create(['name' => 'Security branch', 'code' => 'SEC-'.Str::random(10)]);
        $two = Store::create(['name' => 'Security branch', 'code' => 'SEC-'.Str::random(10)]);
        $user = $this->user('manager', $one);
        Sanctum::actingAs($user);
        $this->withHeader('X-Store-Id', (string) $two->id)->postJson('/api/taxes', ['name' => 'Cross-store'])->assertForbidden();
        $user->update(['is_active' => false]);
        $this->withHeader('X-Store-Id', (string) $one->id)->getJson('/api/taxes')->assertForbidden();
    }

    public function test_replay_identity_cannot_modify_administration_but_can_replicate_business_records(): void
    {
        $store = Store::create(['name' => 'Security branch', 'code' => 'SEC-'.Str::random(10)]);
        StoreLocalNode::create(['store_id' => $store->id, 'tenant_key' => 'phase-b-node', 'sync_token' => 'phase-b-secret', 'enabled' => true]);
        $this->withHeaders(['X-Sync-Replay' => '1', 'X-Tenant-Key' => 'phase-b-node', 'X-Sync-Token' => 'phase-b-secret', 'X-Company-Scope-Id' => (string) $store->id]);
        $this->postJson('/api/taxes', ['code' => 'REPLAY', 'name' => 'Replayed tax', 'rate' => 5])->assertCreated();
        $this->postJson('/api/user-access', ['username' => 'attack', 'password' => 'secret123', 'role' => 'admin'])->assertForbidden();
        $this->postJson('/api/backups')->assertForbidden();
    }
}
