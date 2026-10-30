<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TablePreferenceLayoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_right_pins_and_widths_persist_and_survive_saves_that_omit_them(): void
    {
        Sanctum::actingAs(User::create(['name' => 'Layout', 'username' => 'layout-user', 'email' => 'layout@example.test',
            'password' => 'secret-pass', 'role' => 'admin', 'is_active' => true]));

        $this->putJson('/api/user-table-preferences/products', [
            'visibleColumns' => ['code', 'name', 'price'], 'pinnedColumnKeys' => ['code'],
            'pinnedRightColumnKeys' => ['price', 'code'], 'columnWidths' => ['name' => 240],
        ])->assertOk();
        // An older caller that only knows visible/order/left pins must not wipe the newer settings.
        $this->putJson('/api/user-table-preferences/products', ['visibleColumns' => ['code', 'name', 'price'], 'pinnedColumnKeys' => ['code']])->assertOk();

        $this->getJson('/api/user-table-preferences/products')->assertOk()
            ->assertJsonPath('data.pinned_column_keys', ['code'])
            ->assertJsonPath('data.pinned_right_column_keys', ['price'])
            ->assertJsonPath('data.column_widths.name', 240);

        $this->putJson('/api/user-table-preferences/products', ['visibleColumns' => ['code'], 'columnWidths' => ['name' => 5]])
            ->assertUnprocessable();
    }
}
