<?php

namespace Tests\Feature\Security;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CostReadPermissionTest extends TestCase
{
    use RefreshDatabase;

    private const COST_READS = ['/api/supplier-payments', '/api/finance/dashboard', '/api/invoices', '/api/stock-pivot?row_by=brand&column_by=store'];

    private function actingAsRole(string $role): void
    {
        $store = Store::firstOrCreate(['code' => 'COST-TEST'], ['name' => 'Cost test store']);
        Sanctum::actingAs(User::factory()->create(['username' => "{$role}-".Str::random(8), 'role' => $role, 'store_id' => $store->id]));
    }

    public function test_counter_roles_cannot_read_cost_or_finance_data_but_keep_their_lookups(): void
    {
        foreach (['cashier', 'supervisor', 'sales'] as $role) {
            $this->actingAsRole($role);
            foreach (self::COST_READS as $url) {
                $this->getJson($url)->assertForbidden()->assertJsonPath('required_permission', 'costs.view');
            }
            $this->getJson('/api/customers')->assertOk();
            $this->getJson('/api/products')->assertOk();
        }
    }

    public function test_back_office_roles_still_read_cost_data(): void
    {
        foreach (['manager', 'accountant', 'warehouse', 'admin'] as $role) {
            $this->actingAsRole($role);
            foreach (self::COST_READS as $url) {
                $this->assertNotSame(403, $this->getJson($url)->status(), "{$role} {$url}");
            }
        }
    }

    public function test_an_explicit_page_grant_still_opens_a_cost_page_for_a_counter_role(): void
    {
        $store = Store::create(['name' => 'Granted store', 'code' => 'COST-GRANT']);
        $all = ['view' => true, 'add' => false, 'edit' => false, 'delete' => false];
        Sanctum::actingAs(User::factory()->create(['username' => 'granted-'.Str::random(8), 'role' => 'cashier', 'store_id' => $store->id,
            'page_permissions' => ['/sales/pos-sales' => $all, '/finance/supplier-payment' => $all]]));

        $this->getJson('/api/supplier-payments')->assertOk();
        $this->getJson('/api/invoices')->assertForbidden();
    }
}
