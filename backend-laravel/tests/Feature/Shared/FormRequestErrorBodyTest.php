<?php

namespace Tests\Feature\Shared;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Validation moved from controllers into Form Requests. The screens read these 422 bodies, so each
 * endpoint must keep the exact shape it returned before the move.
 */
class FormRequestErrorBodyTest extends TestCase
{
    use RefreshDatabase;

    private function signIn(): Store
    {
        $store = Store::create(['name' => 'Main', 'code' => 'MAIN']);
        Sanctum::actingAs(User::create(['name' => 'Owner', 'username' => 'shape-owner', 'email' => 'shape-owner@example.test', 'password' => 'secret', 'role' => 'admin']));

        return $store;
    }

    public function test_login_keeps_its_success_message_errors_body(): void
    {
        $response = $this->postJson('/api/auth/login', ['username' => 'someone'])->assertUnprocessable();

        $this->assertSame(['success', 'message', 'errors'], array_keys($response->json()));
        $response->assertJson(['success' => false, 'message' => 'Validation error'])->assertJsonValidationErrors('password');
    }

    public function test_category_create_keeps_its_success_errors_body(): void
    {
        $store = $this->signIn();
        $response = $this->withHeader('X-Store-Id', (string) $store->id)->postJson('/api/categories', [])->assertUnprocessable();

        $this->assertSame(['success', 'errors'], array_keys($response->json()));
        $response->assertJson(['success' => false])->assertJsonValidationErrors(['name', 'code']);
    }

    public function test_pos_return_keeps_its_success_message_errors_body(): void
    {
        $store = $this->signIn();
        $response = $this->withHeader('X-Store-Id', (string) $store->id)->postJson('/api/pos-returns', [])->assertUnprocessable();

        $this->assertSame(['success', 'message', 'errors'], array_keys($response->json()));
        $response->assertJson(['success' => false, 'message' => 'Validation error']);
    }

    public function test_endpoints_that_used_request_validate_keep_laravels_standard_body(): void
    {
        $store = $this->signIn();
        $response = $this->withHeader('X-Store-Id', (string) $store->id)->putJson('/api/notification-preferences', [])->assertUnprocessable();

        $this->assertSame(['message', 'errors'], array_keys($response->json()));
        $response->assertJsonValidationErrors(['marketing', 'quiet_start', 'quiet_end']);
    }

    public function test_valid_input_still_reaches_the_action(): void
    {
        $store = $this->signIn();
        $this->withHeader('X-Store-Id', (string) $store->id)
            ->postJson('/api/categories', ['name' => 'Shirts', 'code' => 'SH'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Shirts');
    }
}
