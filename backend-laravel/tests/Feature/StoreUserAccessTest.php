<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\SystemConfiguration;
use App\Models\User;
use App\Services\PagePermissions;
use App\Services\StoreContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreUserAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_pos_staff_can_load_active_counters_without_settings_access_but_cannot_cross_stores(): void
    {
        $one = Store::create(['name' => 'Counter One', 'code' => 'COUNTER-ONE']);
        $two = Store::create(['name' => 'Counter Two', 'code' => 'COUNTER-TWO']);
        $counter = SystemConfiguration::create(['store_id' => $one->id, 'key' => 'counter', 'value' => 'Till 1', 'is_active' => true]);
        SystemConfiguration::create(['store_id' => $one->id, 'key' => 'counter', 'value' => 'Inactive till', 'is_active' => false]);
        SystemConfiguration::create(['store_id' => $two->id, 'key' => 'counter', 'value' => 'Other till', 'is_active' => true]);
        Sanctum::actingAs($this->storeUser($one, 'cashier'));
        $this->getJson('/api/configurations/counter')->assertForbidden();
        $this->getJson('/api/auth/counter')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $counter->id)->assertJsonPath('data.0.name', 'Till 1');
        $this->withHeader('X-Company-Scope-Id', (string) $two->id)->getJson('/api/auth/counter')
            ->assertForbidden()->assertJsonPath('code', 'STORE_ACCESS_DENIED');
    }

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

    public function test_multiple_store_assignments_and_page_permissions_round_trip_and_revoke(): void
    {
        $one = Store::create(['name' => 'One', 'code' => 'MULTI-ONE']);
        $two = Store::create(['name' => 'Two', 'code' => 'MULTI-TWO']);
        $other = Store::create(['name' => 'Other', 'code' => 'MULTI-OTHER']);
        $owner = User::create(['name' => 'Owner', 'username' => 'multi-owner', 'email' => 'multi-owner@example.test',
            'password' => 'secret123', 'role' => 'super_admin']);
        Sanctum::actingAs($owner);
        $pages = ['/masters/product' => ['view' => true, 'add' => false, 'edit' => false, 'delete' => false]];
        $response = $this->withHeader('X-Store-Id', (string) $one->id)->postJson('/api/user-access', [
            'name' => 'Manager', 'username' => 'multi-manager', 'password' => 'secret123', 'role' => 'manager',
            'companyIds' => [$one->id, $two->id], 'pagePermissions' => $pages,
        ])->assertCreated()->assertJsonPath('data.company_ids', [$one->id, $two->id])
            ->assertJsonPath('data.page_permissions', $pages);
        $id = $response->json('data.id');
        $this->getJson('/api/user-access?limit=500')->assertOk()
            ->assertJsonFragment(['effective_page_permissions' => $pages]);
        $this->getJson('/api/user-access/'.$id)->assertOk()->assertJsonPath('data.company_ids', [$one->id, $two->id]);
        $manager = User::findOrFail($id);
        $manager->createToken('old-session');
        $fields = app(StoreContext::class)->authFields($manager);
        $this->assertSame([$one->id, $two->id], $fields['store_ids']);
        $this->assertTrue($fields['can_switch_stores']);
        Sanctum::actingAs($manager);
        $this->withHeader('X-Store-Id', (string) $two->id)->getJson('/api/products')->assertOk();
        $this->postJson('/api/products', ['name' => 'Denied'])->assertForbidden()->assertJsonPath('code', 'PAGE_ACCESS_DENIED');
        $this->getJson('/api/brands')->assertForbidden()->assertJsonPath('code', 'PAGE_ACCESS_DENIED');
        $this->withHeader('X-Store-Id', (string) $other->id)->getJson('/api/products')->assertForbidden();
        Sanctum::actingAs($owner);
        $this->withHeader('X-Store-Id', (string) $one->id)->putJson('/api/user-access/'.$id, [
            'companyIds' => [$one->id], 'pagePermissions' => [],
        ])->assertOk()->assertJsonPath('data.company_ids', [$one->id]);
        $this->assertSame(0, $manager->tokens()->count());
        $this->assertDatabaseMissing('user_store_access', ['user_id' => $id, 'store_id' => $two->id]);
    }

    public function test_legacy_manager_receives_preset_but_explicit_empty_permissions_stay_empty(): void
    {
        $store = Store::create(['name' => 'Branch', 'code' => 'PRESET']);
        $manager = $this->storeUser($store, 'manager');
        $service = app(PagePermissions::class);
        $this->assertTrue($service->effective($manager)['/masters/product']['view']);
        $manager->update(['page_permissions' => []]);
        $this->assertSame([], $service->effective($manager->fresh()));
        $this->assertFalse($service->allows($manager->fresh(), '/masters/product', 'view'));
    }

    public function test_user_list_reuses_one_permission_resolver_without_mixing_roles_or_explicit_grants(): void
    {
        $store = Store::create(['name' => 'Preset list', 'code' => 'PRESET-LIST']);
        $admin = $this->storeUser($store, 'admin');
        $manager = $this->storeUser($store, 'manager');
        $cashier = $this->storeUser($store, 'cashier');
        $custom = $this->storeUser($store, 'staff');
        $customGrants = ['/dashboard' => ['view' => true, 'add' => false, 'edit' => false, 'delete' => false]];
        $custom->update(['page_permissions' => $customGrants]);
        $calls = [];
        $instances = [];
        $this->app->bind(PagePermissions::class, function () use (&$calls, &$instances) {
            $resolver = new class($calls) extends PagePermissions
            {
                private array $calls;

                public function __construct(array &$calls)
                {
                    $this->calls = &$calls;
                }

                public function effective(User $user): ?array
                {
                    $this->calls[$user->id] = spl_object_id($this);

                    return parent::effective($user);
                }
            };
            $instances[] = $resolver;

            return $resolver;
        });
        Sanctum::actingAs($admin);
        $response = $this->getJson('/api/user-access?limit=500')->assertOk()->assertJsonCount(4, 'data');
        $rows = collect($response->json('data'))->keyBy('id');
        $presets = json_decode(file_get_contents(config_path('role_page_presets.json')), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame($presets['manager'], $rows[$manager->id]['effective_page_permissions']);
        $this->assertSame($presets['cashier'], $rows[$cashier->id]['effective_page_permissions']);
        $this->assertSame($customGrants, $rows[$custom->id]['effective_page_permissions']);
        $this->assertCount(1, array_unique(array_intersect_key($calls, array_fill_keys([$manager->id, $cashier->id, $custom->id], true))));
    }

    public function test_preset_document_is_reused_only_for_one_resolver_instance(): void
    {
        $originalPath = $this->app->configPath();
        $directory = sys_get_temp_dir().'/vynerix-role-presets-'.bin2hex(random_bytes(8));
        mkdir($directory, 0700);
        $path = $directory.'/role_page_presets.json';
        $managerGrants = ['/dashboard' => ['view' => true]];
        $cashierGrants = ['/sales/pos-sales' => ['view' => true]];
        try {
            file_put_contents($path, json_encode(['manager' => $managerGrants, 'cashier' => $cashierGrants], JSON_THROW_ON_ERROR));
            $this->app->useConfigPath($directory);
            $user = new User;
            $user->setRawAttributes(['role' => 'manager', 'page_permissions' => null]);
            $service = new PagePermissions;
            $this->assertSame($managerGrants, $service->effective($user));
            $user->setRawAttributes(['role' => 'cashier', 'page_permissions' => null]);
            $this->assertSame($cashierGrants, $service->effective($user));
            file_put_contents($path, json_encode(['manager' => []], JSON_THROW_ON_ERROR));
            $user->setRawAttributes(['role' => 'manager', 'page_permissions' => null]);
            $this->assertSame($managerGrants, $service->effective($user));
            $this->assertSame([], (new PagePermissions)->effective($user));
            $user->setRawAttributes(['role' => 'manager', 'page_permissions' => '{}']);
            $this->assertSame([], $service->effective($user));
            $user->setRawAttributes(['role' => 'manager', 'page_permissions' => null]);
            file_put_contents($path, '[]');
            $emptyService = new PagePermissions;
            $this->assertNull($emptyService->effective($user));
            file_put_contents($path, json_encode(['manager' => $managerGrants], JSON_THROW_ON_ERROR));
            $this->assertNull($emptyService->effective($user));
            $this->assertSame($managerGrants, (new PagePermissions)->effective($user));
            file_put_contents($path, '{');
            $this->expectException(\JsonException::class);
            (new PagePermissions)->effective($user);
        } finally {
            $this->app->useConfigPath($originalPath);
            unlink($path);
            rmdir($directory);
        }
    }
}
