<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Presets are a separate, named library layered on top of the one active theme_customization
 * SettingsThemeTest covers -- saving/listing/deleting a preset never touches the active theme;
 * only "apply" does, and it does so through updateTheme's own persistence, not a duplicate of it.
 */
class SettingsThemePresetsTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create(['name' => 'Test Flagship Store', 'code' => 'STR-001']);
        $user = User::create([
            'name' => 'Test Admin', 'username' => 'testadmin', 'email' => 'admin@example.com',
            'password' => bcrypt('secret123'), 'role' => 'admin', 'store_id' => $this->store->id,
        ]);
        Sanctum::actingAs($user);
    }

    public function test_lists_no_presets_for_a_store_with_none_saved(): void
    {
        $res = $this->getJson("/api/companies/{$this->store->id}/theme-presets");

        $res->assertOk();
        $this->assertSame([], $res->json('data'));
    }

    public function test_saves_a_named_preset_with_the_submitted_config(): void
    {
        $res = $this->postJson("/api/companies/{$this->store->id}/theme-presets", [
            'name' => 'Diwali Sale',
            'primary_color' => '#f97316',
            'theme_style' => 'glass',
        ]);

        $res->assertCreated();
        $this->assertDatabaseHas('theme_presets', ['store_id' => $this->store->id, 'name' => 'Diwali Sale']);
        $this->assertSame(
            ['primary_color' => '#f97316', 'theme_style' => 'glass'],
            $this->store->themePresets()->where('name', 'Diwali Sale')->first()->config
        );
    }

    public function test_requires_a_name(): void
    {
        $res = $this->postJson("/api/companies/{$this->store->id}/theme-presets", ['primary_color' => '#f97316']);

        $res->assertStatus(422);
    }

    public function test_rejects_an_invalid_color_in_a_preset_the_same_way_updatetheme_does(): void
    {
        $res = $this->postJson("/api/companies/{$this->store->id}/theme-presets", [
            'name' => 'Bad',
            'primary_color' => 'not-a-color',
        ]);

        $res->assertStatus(422);
    }

    public function test_saving_with_an_existing_name_overwrites_that_preset_instead_of_duplicating_it(): void
    {
        $this->postJson("/api/companies/{$this->store->id}/theme-presets", ['name' => 'Default', 'primary_color' => '#111111']);
        $this->postJson("/api/companies/{$this->store->id}/theme-presets", ['name' => 'Default', 'primary_color' => '#222222']);

        $this->assertSame(1, $this->store->themePresets()->where('name', 'Default')->count());
        $this->assertSame('#222222', $this->store->themePresets()->where('name', 'Default')->first()->config['primary_color']);
    }

    public function test_apply_copies_the_presets_config_into_the_active_theme(): void
    {
        $this->putJson("/api/companies/{$this->store->id}/theme", ['primary_color' => '#000000']);
        $preset = $this->store->themePresets()->create(['name' => 'Ocean', 'config' => ['primary_color' => '#0284c7', 'theme_style' => 'apple']]);

        $res = $this->postJson("/api/companies/{$this->store->id}/theme-presets/{$preset->id}/apply");

        $res->assertOk();
        $this->assertSame(
            ['primary_color' => '#0284c7', 'theme_style' => 'apple'],
            $this->store->fresh()->theme_customization
        );
    }

    public function test_apply_404s_for_a_preset_that_does_not_exist(): void
    {
        $res = $this->postJson("/api/companies/{$this->store->id}/theme-presets/999999/apply");

        $res->assertStatus(404);
    }

    public function test_apply_404s_for_a_preset_belonging_to_a_different_store(): void
    {
        $otherStore = Store::create(['name' => 'Other Store', 'code' => 'STR-002']);
        $otherPreset = $otherStore->themePresets()->create(['name' => 'Not Yours', 'config' => ['primary_color' => '#ff0000']]);

        $res = $this->postJson("/api/companies/{$this->store->id}/theme-presets/{$otherPreset->id}/apply");

        $res->assertStatus(404);
        $this->assertNull($this->store->fresh()->theme_customization);
    }

    public function test_delete_removes_a_preset(): void
    {
        $preset = $this->store->themePresets()->create(['name' => 'Temp', 'config' => ['primary_color' => '#111111']]);

        $res = $this->deleteJson("/api/companies/{$this->store->id}/theme-presets/{$preset->id}");

        $res->assertOk();
        $this->assertDatabaseMissing('theme_presets', ['id' => $preset->id]);
    }

    public function test_delete_404s_for_a_preset_belonging_to_a_different_store(): void
    {
        $otherStore = Store::create(['name' => 'Other Store', 'code' => 'STR-002']);
        $otherPreset = $otherStore->themePresets()->create(['name' => 'Not Yours', 'config' => ['primary_color' => '#ff0000']]);

        $res = $this->deleteJson("/api/companies/{$this->store->id}/theme-presets/{$otherPreset->id}");

        $res->assertStatus(404);
        $this->assertDatabaseHas('theme_presets', ['id' => $otherPreset->id]);
    }
}
