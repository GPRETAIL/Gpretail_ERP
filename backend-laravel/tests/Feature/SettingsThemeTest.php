<?php

namespace Tests\Feature;

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

    public function test_get_theme_returns_empty_when_nothing_saved_yet(): void
    {
        $res = $this->getJson("/api/companies/{$this->store->id}/theme");

        $res->assertOk();
        $this->assertSame([], $res->json('data'));
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
