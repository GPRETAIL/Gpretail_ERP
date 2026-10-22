<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\StoreContext;
use App\Services\TenantThemes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ThemeGovernanceTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Store $one;

    private Store $two;

    protected function setUp(): void
    {
        parent::setUp();
        $this->one = Store::create(['name' => 'One', 'code' => 'THEME-ONE', 'platform_company_code' => 'CMP-THEME', 'theme_customization' => ['primary_color' => '#123456']]);
        $this->two = Store::create(['name' => 'Two', 'code' => 'THEME-TWO', 'platform_company_code' => 'CMP-THEME']);
        $this->owner = User::create(['name' => 'Owner', 'username' => 'theme-owner', 'email' => 'owner@example.test', 'password' => 'test-password', 'role' => 'admin', 'platform_company_code' => 'CMP-THEME']);
        PlatformActivation::create(['company_code' => 'CMP-THEME', 'tenant_admin_email' => $this->owner->email, 'activated' => true, 'status' => 'active']);
        Sanctum::actingAs($this->owner);
    }

    public function test_company_defaults_work_without_a_store_selection_and_preserve_existing_overrides(): void
    {
        $this->getJson('/api/tenant/theme')->assertOk()->assertJsonPath('meta.revision', 0)->assertJsonPath('meta.allowed_store_ids', [$this->one->id]);
        $this->putJson('/api/tenant/theme', ['primary_color' => '#345678', 'expected_revision' => 0])->assertOk()->assertJsonPath('meta.revision', 2);
        $themes = app(TenantThemes::class);
        $this->assertSame('#123456', $themes->effective($this->one, 'CMP-THEME')['primary_color']);
        $this->assertSame('#345678', $themes->effective($this->two, 'CMP-THEME')['primary_color']);
        $auth = app(StoreContext::class)->authFields($this->owner);
        $this->assertSame('#345678', $auth['brand']['primary_color']);
        $this->assertSame('company', $auth['theme_source']);
        $this->assertDatabaseCount('theme_revisions', 2);
    }

    public function test_company_theme_can_be_set_before_any_stores_exist(): void
    {
        $this->one->delete();
        $this->two->delete();
        $this->putJson('/api/tenant/theme', ['primary_color' => '#345678', 'expected_revision' => 0])->assertOk();
        $this->assertSame('#345678', app(StoreContext::class)->authFields($this->owner)['brand']['primary_color']);
    }

    public function test_override_policy_is_enforced_and_clearing_an_override_inherits_company_theme(): void
    {
        $this->putJson('/api/tenant/theme', ['primary_color' => '#345678', 'allowed_store_ids' => [$this->one->id], 'expected_revision' => 0])->assertOk();
        $storeAdmin = User::create(['name' => 'Store admin', 'username' => 'store-admin', 'email' => 'store@example.test', 'password' => 'test-password', 'role' => 'admin', 'store_id' => $this->two->id, 'platform_company_code' => 'CMP-THEME']);
        Sanctum::actingAs($storeAdmin);
        $this->putJson('/api/companies/'.$this->two->id.'/theme', ['theme_style' => 'glass'])->assertForbidden();
        $this->putJson('/api/tenant/theme', ['theme_style' => 'glass'])->assertForbidden();
        $this->getJson('/api/companies/'.$this->one->id.'/theme')->assertNotFound();
        Sanctum::actingAs($this->owner);
        $this->putJson('/api/companies/'.$this->one->id.'/theme', ['expected_revision' => 0])->assertOk()->assertJsonPath('meta.source', 'company');
        $this->assertSame('#345678', app(TenantThemes::class)->effective($this->one->fresh(), 'CMP-THEME')['primary_color']);
    }

    public function test_stale_saves_are_rejected_and_restore_appends_a_revision_with_the_original_policy(): void
    {
        $this->putJson('/api/tenant/theme', ['primary_color' => '#345678', 'allowed_store_ids' => [$this->one->id], 'expected_revision' => 0])->assertOk();
        $original = DB::table('theme_revisions')->where('scope_key', 'tenant:CMP-THEME')->where('revision', 2)->value('id');
        $this->putJson('/api/tenant/theme', ['primary_color' => '#654321', 'allowed_store_ids' => [], 'expected_revision' => 0])->assertConflict();
        $this->putJson('/api/tenant/theme', ['primary_color' => '#654321', 'allowed_store_ids' => [], 'expected_revision' => 2])->assertOk();
        $this->assertSame('#654321', app(TenantThemes::class)->effective($this->one->fresh(), 'CMP-THEME')['primary_color']);
        $this->postJson('/api/tenant/theme-history/'.$original.'/restore', ['expected_revision' => 3])->assertOk()->assertJsonPath('meta.revision', 4)->assertJsonPath('data.primary_color', '#345678')->assertJsonPath('meta.allowed_store_ids', [$this->one->id]);
        $this->getJson('/api/tenant/theme-history')->assertOk()->assertJsonPath('data.0.operation', 'restore')->assertJsonPath('data.0.author', 'Owner');
    }

    public function test_company_presets_and_history_are_tenant_scoped_and_validate_contrast_on_apply(): void
    {
        $preset = $this->postJson('/api/tenant/theme-presets', ['name' => 'Corporate', 'primary_color' => '#345678'])->assertCreated()->json('data.id');
        $this->getJson('/api/tenant/theme-presets')->assertOk()->assertJsonPath('data.0.name', 'Corporate');
        $this->postJson('/api/tenant/theme-presets/'.$preset.'/apply', ['expected_revision' => 0])->assertOk()->assertJsonPath('data.primary_color', '#345678');
        DB::table('tenant_theme_presets')->where('id', $preset)->update(['config' => json_encode(['text_color' => '#ffffff', 'background_color' => '#ffffff'])]);
        $this->postJson('/api/tenant/theme-presets/'.$preset.'/apply', ['expected_revision' => 2])->assertUnprocessable();
        $foreign = Store::create(['name' => 'Foreign', 'code' => 'FOREIGN', 'platform_company_code' => 'CMP-OTHER']);
        $this->putJson('/api/tenant/theme', ['allowed_store_ids' => [$foreign->id], 'expected_revision' => 2])->assertUnprocessable();
        $this->getJson('/api/companies/'.$foreign->id.'/theme-history')->assertNotFound();
        $this->deleteJson('/api/tenant/theme-presets/'.$preset)->assertOk();
    }

    public function test_mode_specific_colors_are_validated_and_theme_authority_is_not_granted_to_managers(): void
    {
        $this->putJson('/api/tenant/theme', ['light_colors' => ['text_color' => '#ffffff']])->assertUnprocessable();
        $this->putJson('/api/tenant/theme', ['light_colors' => ['text_color' => '#111111'], 'dark_colors' => ['text_color' => '#ffffff'], 'expected_revision' => 0])->assertOk();
        $this->owner->update(['role' => 'manager']);
        Sanctum::actingAs($this->owner->fresh());
        $this->putJson('/api/tenant/theme', ['theme_style' => 'glass'])->assertForbidden();
        $this->getJson('/api/tenant/theme-history')->assertForbidden();
        $this->assertDatabaseCount('theme_revisions', 2);
    }

    public function test_company_publish_requires_a_revision_and_checks_retained_store_contrast(): void
    {
        $this->putJson('/api/tenant/theme', ['primary_color' => '#345678'])->assertUnprocessable();
        $this->one->update(['theme_customization' => ['light_colors' => ['text_color' => '#ffffff', 'background_color' => '#111111', 'surface_color' => '#111111']]]);
        $this->putJson('/api/tenant/theme', ['light_colors' => ['text_color' => '#111111'], 'expected_revision' => 0])->assertOk();
        $this->one->update(['theme_customization' => ['light_colors' => ['text_color' => '#ffffff']]]);
        $this->putJson('/api/tenant/theme', ['light_colors' => ['text_color' => '#111111'], 'expected_revision' => 2])->assertUnprocessable()->assertJsonValidationErrors('allowed_store_ids');
        $this->assertDatabaseCount('theme_revisions', 2);
    }

    public function test_store_restore_keeps_history_and_cannot_restore_another_scope(): void
    {
        $url = '/api/companies/'.$this->one->id;
        $this->putJson($url.'/theme', ['primary_color' => '#345678', 'expected_revision' => 0])->assertOk();
        $baseline = DB::table('theme_revisions')->where('scope_key', 'store:'.$this->one->id)->where('revision', 1)->value('id');
        $this->postJson($url.'/theme-history/'.$baseline.'/restore', ['expected_revision' => 2])->assertOk()->assertJsonPath('data.primary_color', '#123456')->assertJsonPath('meta.revision', 3);
        $this->postJson('/api/companies/'.$this->two->id.'/theme-history/'.$baseline.'/restore', ['expected_revision' => 0])->assertNotFound();
    }

    public function test_history_pagination_keeps_earlier_revisions_accessible(): void
    {
        for ($i = 1; $i <= 53; $i++) {
            app(TenantThemes::class)->record('tenant:CMP-THEME', [], [], $this->owner, 'apply');
        }
        $this->getJson('/api/tenant/theme-history')->assertOk()->assertJsonCount(50, 'data')->assertJsonPath('data.0.revision', 53)->assertJsonPath('meta.next_before', 4);
        $this->getJson('/api/tenant/theme-history?before_revision=4')->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('data.2.revision', 1)->assertJsonPath('meta.next_before', null);
    }

    public function test_general_store_update_cannot_bypass_theme_governance(): void
    {
        $this->withoutMiddleware();
        $this->putJson('/api/companies/'.$this->one->id, ['theme_customization' => ['primary_color' => '#ffffff']])->assertUnprocessable();
        $this->assertSame('#123456', $this->one->fresh()->theme_customization['primary_color']);
    }
}
