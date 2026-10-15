<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\LegacyTenantOwnerLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LegacyTenantOwnerLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_linking_keeps_password_and_legacy_store_unchanged(): void
    {
        config()->set('platform.company_code', 'CMP-LEGACY');
        PlatformActivation::create(['company_code' => 'CMP-LEGACY', 'activated' => true]);
        $store = Store::create(['name' => 'Separate local store', 'code' => 'LOCAL-SEPARATE']);
        $user = User::create(['name' => 'Owner', 'username' => 'legacy-owner', 'email' => 'owner@example.test', 'password' => 'keep-password', 'role' => 'admin']);
        $hash = $user->getRawOriginal('password');
        app(LegacyTenantOwnerLink::class)->link($user->email, ['company_code' => 'CMP-LEGACY', 'status' => 'active', 'tenant_admin_email' => $user->email, 'tenant_password_version' => 1]);
        $this->assertSame('CMP-LEGACY', $user->fresh()->platform_company_code);
        $this->assertSame($hash, $user->fresh()->getRawOriginal('password'));
        $this->assertTrue(Hash::check('keep-password', $user->fresh()->password));
        $this->assertNull($store->fresh()->platform_company_code);
        $this->assertSame('LOCAL-SEPARATE', $store->fresh()->code);
    }

    public function test_different_company_cannot_take_over_existing_account(): void
    {
        config()->set('platform.company_code', 'CMP-LEGACY');
        PlatformActivation::create(['company_code' => 'CMP-LEGACY', 'activated' => true]);
        $user = User::create(['name' => 'Owner', 'username' => 'conflict-owner', 'email' => 'owner@example.test', 'password' => 'keep-password', 'role' => 'admin', 'platform_company_code' => 'OTHER']);
        $this->expectException(\RuntimeException::class);
        app(LegacyTenantOwnerLink::class)->link($user->email, ['company_code' => 'CMP-LEGACY', 'status' => 'active', 'tenant_admin_email' => $user->email]);
    }
}
