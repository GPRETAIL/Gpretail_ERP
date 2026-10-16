<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * getTheme/updateTheme used to be stubs -- getTheme returned a hardcoded color pair ignoring
 * {id}, and updateTheme just echoed the request body back without saving anything, so Branding.jsx
 * looked fully functional (toasts "saved", the live preview updates) while every save was
 * silently discarded. Covers the real persistence now backing it: theme_customization on the
 * Store the frontend calls "company" (see AuthController::me's company_id => store_id mapping).
 */
class SettingsThemeTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create(['name' => 'Test Flagship Store', 'code' => 'STR-001']);
        $this->user = User::create([
            'name' => 'Test Admin', 'username' => 'testadmin', 'email' => 'admin@example.com',
            'password' => bcrypt('secret123'), 'role' => 'admin', 'store_id' => $this->store->id,
        ]);
        Sanctum::actingAs($this->user);
    }

    public function test_new_theme_styles_can_be_saved_and_reloaded(): void
    {
        foreach (['glassmorphism', 'liquid_ai', 'glass', 'classic', 'apple'] as $style) {
            $this->putJson("/api/companies/{$this->store->id}/theme", ['theme_style' => $style])->assertOk();
            $this->getJson("/api/companies/{$this->store->id}/theme")->assertOk()->assertJsonPath('data.theme_style', $style);
        }
        $this->putJson("/api/companies/{$this->store->id}/theme", ['theme_style' => 'untrusted-style'])->assertUnprocessable();
    }

    public function test_get_theme_returns_empty_when_nothing_saved_yet(): void
    {
        $res = $this->getJson("/api/companies/{$this->store->id}/theme");

        $res->assertOk();
        $this->assertSame([], $res->json('data'));
    }

    public function test_theme_preferences_work_without_a_store_token_but_business_writes_stay_blocked(): void
    {
        PlatformActivation::create(['company_code' => 'CMP-THEME', 'activated' => true, 'status' => 'active']);
        $this->putJson("/api/v1/companies/{$this->store->id}/theme", ['primary_color' => '#123456'])->assertOk();
        $this->assertSame('#123456', $this->store->fresh()->theme_customization['primary_color']);
        $preset = $this->postJson("/api/companies/{$this->store->id}/theme-presets", ['name' => 'Theme preference', 'primary_color' => '#654321'])->assertCreated()->json('data.id');
        $this->postJson("/api/companies/{$this->store->id}/theme-presets/{$preset}/apply")->assertOk();
        $this->assertSame('#654321', $this->store->fresh()->theme_customization['primary_color']);
        $this->deleteJson("/api/companies/{$this->store->id}/theme-presets/{$preset}")->assertOk();
        $this->postJson('/api/sizes', ['name' => 'Unlicensed write'])->assertForbidden()->assertJsonPath('code', 'STORE_LICENCE_INVALID');
        $this->assertDatabaseMissing('sizes', ['name' => 'Unlicensed write']);
    }

    public function test_theme_routes_reject_unassigned_stores_and_roles_without_settings_permission(): void
    {
        $other = Store::create(['name' => 'Other', 'code' => 'THEME-OTHER']);
        $this->getJson("/api/companies/{$other->id}/theme")->assertNotFound()->assertJsonPath('code', 'STORE_ACCESS_DENIED');
        $this->putJson("/api/companies/{$other->id}/theme", ['primary_color' => '#123456'])->assertNotFound();
        $this->postJson("/api/companies/{$other->id}/theme-presets", ['name' => 'Forbidden'])->assertNotFound();
        $this->user->update(['role' => 'cashier']);
        $this->putJson("/api/companies/{$this->store->id}/theme", ['primary_color' => '#123456'])->assertForbidden()->assertJsonPath('code', 'PERMISSION_DENIED');
        $this->assertNull($this->store->fresh()->theme_customization);
    }

    public function test_theme_target_must_match_the_explicit_selected_store(): void
    {
        $other = Store::create(['name' => 'Other', 'code' => 'THEME-SELECTION']);
        $this->user->update(['store_id' => null]);
        $this->withHeader('X-Store-Id', (string) $other->id)->putJson("/api/companies/{$this->store->id}/theme", ['primary_color' => '#123456'])
            ->assertUnprocessable()->assertJsonPath('code', 'STORE_CONTEXT_MISMATCH');
    }

    public function test_tenant_admin_without_a_fixed_store_receives_the_selected_stores_saved_theme(): void
    {
        $this->user->update(['store_id' => null]);
        $theme = ['primary_color' => '#123456', 'border_radius' => 13];
        $this->putJson("/api/companies/{$this->store->id}/theme", $theme)->assertOk();

        $this->getJson('/api/auth/me')->assertOk()
            ->assertJsonPath('data.company_id', $this->store->id)
            ->assertJsonPath('data.brand', $theme);

        Store::create(['name' => 'Second store', 'code' => 'THEME-SECOND', 'theme_customization' => ['border_radius' => 24]]);
        $this->getJson('/api/auth/me')->assertOk()
            ->assertJsonPath('data.store_selection_required', true)
            ->assertJsonPath('data.brand', [])
            ->assertJsonPath('data.company_id', null);
    }

    public function test_update_theme_actually_persists_to_the_store(): void
    {
        $res = $this->putJson("/api/companies/{$this->store->id}/theme", [
            'primary_color' => '#e11d48',
            'secondary_color' => '#0ea5e9',
            'border_radius' => 20,
            'theme_style' => 'glass',
        ]);

        $res->assertOk();
        $this->assertSame([
            'primary_color' => '#e11d48',
            'secondary_color' => '#0ea5e9',
            'border_radius' => 20,
            'theme_style' => 'glass',
        ], $this->store->fresh()->theme_customization);
    }

    public function test_a_saved_theme_round_trips_through_get_theme(): void
    {
        $this->putJson("/api/companies/{$this->store->id}/theme", ['primary_color' => '#123456']);

        $res = $this->getJson("/api/companies/{$this->store->id}/theme");

        $res->assertOk();
        $this->assertSame('#123456', $res->json('data.primary_color'));
    }

    public function test_a_saved_theme_round_trips_through_auth_me_as_brand(): void
    {
        $this->putJson("/api/companies/{$this->store->id}/theme", ['primary_color' => '#123456', 'theme_style' => 'apple']);

        $res = $this->getJson('/api/auth/me');

        $res->assertOk();
        $this->assertSame('#123456', $res->json('data.brand.primary_color'));
        $this->assertSame('apple', $res->json('data.brand.theme_style'));
    }

    public function test_an_empty_payload_resets_the_stored_theme_to_null(): void
    {
        $this->putJson("/api/companies/{$this->store->id}/theme", ['primary_color' => '#123456']);
        $this->assertNotNull($this->store->fresh()->theme_customization);

        $res = $this->putJson("/api/companies/{$this->store->id}/theme", []);

        $res->assertOk();
        $this->assertNull($this->store->fresh()->theme_customization);
    }

    public function test_rejects_an_invalid_hex_color(): void
    {
        $res = $this->putJson("/api/companies/{$this->store->id}/theme", ['primary_color' => 'not-a-color']);

        $res->assertStatus(422);
        $this->assertNull($this->store->fresh()->theme_customization);
    }

    public function test_advanced_color_tokens_persist_independently_of_primary_secondary(): void
    {
        $res = $this->putJson("/api/companies/{$this->store->id}/theme", [
            'background_color' => '#111827',
            'success_color' => '#16a34a',
        ]);

        $res->assertOk();
        $this->assertSame([
            'background_color' => '#111827',
            'success_color' => '#16a34a',
        ], $this->store->fresh()->theme_customization);
    }

    public function test_rejects_an_invalid_advanced_color_token(): void
    {
        $res = $this->putJson("/api/companies/{$this->store->id}/theme", ['warning_color' => 'not-a-color']);

        $res->assertStatus(422);
    }

    public function test_rejects_an_unrecognized_theme_style(): void
    {
        $res = $this->putJson("/api/companies/{$this->store->id}/theme", ['theme_style' => 'enterprise']);

        $res->assertStatus(422);
    }

    public function test_get_theme_404s_for_a_store_that_does_not_exist(): void
    {
        $res = $this->getJson('/api/companies/999999/theme');

        $res->assertStatus(404);
    }

    public function test_font_family_persists_and_round_trips_through_auth_me(): void
    {
        $this->putJson("/api/companies/{$this->store->id}/theme", ['font_family' => 'inter']);

        $this->assertSame('inter', $this->store->fresh()->theme_customization['font_family']);

        $res = $this->getJson('/api/auth/me');
        $this->assertSame('inter', $res->json('data.brand.font_family'));
    }

    public function test_rejects_an_unrecognized_font_family(): void
    {
        $res = $this->putJson("/api/companies/{$this->store->id}/theme", ['font_family' => 'comic-sans']);

        $res->assertStatus(422);
        $this->assertNull($this->store->fresh()->theme_customization);
    }
}
