<?php

namespace Tests\Feature\Security;

use App\Models\Store;
use App\Models\SystemConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConfigurationLookupPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_counter_and_manager_roles_read_dropdown_lookups_but_not_other_configuration(): void
    {
        $store = Store::create(['name' => 'Lookup store', 'code' => 'LOOKUP-1']);
        SystemConfiguration::create(['store_id' => $store->id, 'key' => 'rustdesk_server_key', 'value' => 'secret-key', 'is_active' => true]);

        foreach (['cashier', 'supervisor', 'manager'] as $role) {
            Sanctum::actingAs(User::factory()->create(['username' => "{$role}-".Str::random(8), 'role' => $role, 'store_id' => $store->id]));
            foreach (['card_types', 'upi_provider', 'return_reason', 'customer_category', 'sale_area', 'city', 'state', 'bank', 'location'] as $key) {
                $this->getJson("/api/configurations/{$key}")->assertOk();
            }
            $this->getJson('/api/configurations/card_types')->assertJsonPath('data.0.name', 'Visa');
            $this->getJson('/api/configurations/rustdesk_server_key')->assertForbidden();
            $this->getJson('/api/configurations')->assertForbidden();
            $this->postJson('/api/configurations/card_types', ['name' => 'Amex'])->assertForbidden();
        }
    }

    public function test_an_explicit_page_list_without_settings_still_loads_the_lookups(): void
    {
        $store = Store::create(['name' => 'Lookup store', 'code' => 'LOOKUP-2']);
        Sanctum::actingAs(User::factory()->create(['username' => 'paged-'.Str::random(8), 'role' => 'cashier', 'store_id' => $store->id,
            'page_permissions' => ['/sales/pos-sales' => ['view' => true, 'add' => true, 'edit' => false, 'delete' => false]]]));

        $this->getJson('/api/configurations/upi_provider')->assertOk();
        $this->getJson('/api/configurations/rustdesk_server_key')->assertForbidden();
    }
}
