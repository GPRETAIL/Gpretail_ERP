<?php

namespace Tests\Feature\Warehouse;

use App\Models\Store;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** AI Purchase Invoice > Upload from phone: a one-time link the phone sends the invoice to, picked up by the page. */
class PhoneUploadTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->store = Store::create(['name' => 'Main Store', 'code' => 'STR-001']);
        $this->owner = User::create(['name' => 'Owner', 'username' => 'owner', 'email' => 'owner@example.com', 'password' => 'secret123',
            'role' => 'admin', 'store_id' => $this->store->id, 'is_active' => true]);
    }

    private function start(): string
    {
        Sanctum::actingAs($this->owner);

        return $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->postJson('/api/v1/invoice-ai/phone-upload')->assertOk()->json('data.token');
    }

    public function test_the_phone_sends_the_invoice_and_the_page_takes_it_once(): void
    {
        $token = $this->start();
        $this->getJson("/api/v1/invoice-ai/phone-upload/$token")->assertJsonPath('data.status', 'waiting');

        $this->app['auth']->forgetGuards();
        $this->getJson("/api/phone-upload/$token")->assertOk()->assertJsonPath('data.user', 'Owner')->assertJsonPath('data.store', 'Main Store');
        $this->post("/api/phone-upload/$token", ['file' => UploadedFile::fake()->image('bill.jpg', 1200, 1600)], ['Accept' => 'application/json'])
            ->assertOk();

        Sanctum::actingAs($this->owner);
        $this->getJson("/api/v1/invoice-ai/phone-upload/$token")->assertJsonPath('data.status', 'received')->assertJsonPath('data.file_name', 'bill.jpg');
        $this->get("/api/v1/invoice-ai/phone-upload/$token/file")->assertOk();
        $this->getJson("/api/v1/invoice-ai/phone-upload/$token")->assertJsonPath('data.status', 'used');
        $this->getJson("/api/phone-upload/$token")->assertStatus(410); // The link is spent.
    }

    public function test_an_expired_or_unknown_link_takes_nothing(): void
    {
        $token = $this->start();
        $this->travel(11)->minutes();
        $this->app['auth']->forgetGuards();

        $this->post("/api/phone-upload/$token", ['file' => UploadedFile::fake()->image('bill.jpg')], ['Accept' => 'application/json'])->assertStatus(410);
        $this->getJson('/api/phone-upload/'.str_repeat('x', 40))->assertStatus(410);
    }

    public function test_only_invoices_are_accepted_and_only_the_owner_can_take_the_file(): void
    {
        $token = $this->start();
        $this->app['auth']->forgetGuards();
        $this->post("/api/phone-upload/$token", ['file' => UploadedFile::fake()->create('virus.exe', 10)], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('errors.file.0', 'Send a photo (JPG, PNG, WEBP) or a PDF.');

        Sanctum::actingAs(User::create(['name' => 'Other', 'username' => 'other', 'email' => 'other@example.com', 'password' => 'secret123',
            'role' => 'admin', 'store_id' => $this->store->id, 'is_active' => true]));
        $this->getJson("/api/v1/invoice-ai/phone-upload/$token")->assertNotFound();
    }

    public function test_phone_uploads_are_never_synced(): void
    {
        config(['sync.node_role' => 'local']);
        $token = $this->start();
        $this->app['auth']->forgetGuards();
        $this->post("/api/phone-upload/$token", ['file' => UploadedFile::fake()->image('bill.jpg')], ['Accept' => 'application/json'])->assertOk();

        $this->assertSame(0, SyncOutboxEvent::count());
    }
}
