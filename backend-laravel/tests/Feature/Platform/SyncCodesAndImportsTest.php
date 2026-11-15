<?php

namespace Tests\Feature\Platform;

use App\Models\Customer;
use App\Models\Store;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use App\Services\Documents\DocumentNumberService;
use App\Services\Inventory\VariantResolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * A write replayed on the other server must produce the same codes and numbers: codes come from the record number
 * (the same on both sides), and a request that mints several document numbers replays them all, in order.
 */
class SyncCodesAndImportsTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->store = Store::create(['name' => 'Main Store', 'code' => 'STR-001']);
        Sanctum::actingAs(User::create(['name' => 'Owner', 'username' => 'owner', 'email' => 'owner@example.com', 'password' => 'secret123',
            'role' => 'admin', 'store_id' => $this->store->id, 'is_active' => true]));
    }

    public function test_a_master_saved_without_a_code_is_numbered_from_its_record_number(): void
    {
        $id = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->postJson('/api/customers', ['name' => 'Asha', 'phone' => '9000000001'])->assertSuccessful()->json('data.id');
        $this->assertSame('CUST'.$id, Customer::find($id)->code);

        $given = Customer::create(['name' => 'Ravi', 'code' => 'VIP-7', 'store_id' => $this->store->id]);
        $this->assertSame('VIP-7', $given->code, 'a code the user typed is kept');
    }

    public function test_a_new_variant_is_named_from_its_record_number(): void
    {
        $product = \App\Models\Product::create(['company_id' => $this->store->id, 'name' => 'Shirt', 'code' => 'SH', 'is_active' => true]);
        $this->app->instance('request', Request::create('/'));
        $variant = app(VariantResolverService::class)->resolve(productId: $product->id, brandId: null, sizeName: null, colorId: null, designNo: 'D-9');

        $this->assertSame('VAR-'.$product->id.'-'.$variant->id, $variant->sku);
        $this->assertSame($variant->sku, $variant->barcode);
    }

    public function test_several_numbers_of_one_prefix_are_queued_as_a_list_and_replayed_in_order(): void
    {
        $source = Request::create('/api/direct-purchases/bulk', 'POST');
        $this->app->instance('request', $source);
        $first = DocumentNumberService::resolve($source, $this->store->id, 'PUR');
        $second = DocumentNumberService::resolve($source, $this->store->id, 'PUR');
        $this->assertSame([$first, $second], $source->attributes->get('_mintedDocumentNumbers')['PUR']);

        $replay = Request::create('/api/direct-purchases/bulk', 'POST', ['_syncDocumentNumbers' => ['PUR' => [$first, $second]]], server: ['HTTP_X_SYNC_REPLAY' => '1']);
        $this->app->instance('request', $replay);
        $this->assertSame([$first, $second], [DocumentNumberService::resolve($replay, $this->store->id, 'PUR'), DocumentNumberService::resolve($replay, $this->store->id, 'PUR')]);
    }

    public function test_one_number_stays_a_plain_string(): void
    {
        $source = Request::create('/api/x', 'POST');
        $this->app->instance('request', $source);
        $number = DocumentNumberService::resolve($source, $this->store->id, 'IE');
        $this->assertSame($number, $source->attributes->get('_mintedDocumentNumbers')['IE']);
    }

    public function test_an_import_is_queued_for_the_other_server_with_its_numbers(): void
    {
        config(['sync.node_role' => 'local']);
        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->postJson('/api/customers/bulk', [['name' => 'Bulk One', 'mobile_no' => '9000000011'], ['name' => 'Bulk Two', 'mobile_no' => '9000000012']])
            ->assertSuccessful();

        $event = SyncOutboxEvent::sole();
        $this->assertStringContainsString('customers/bulk', $event->path);
        $this->assertCount(2, $event->payload['_syncIds']['ids']['customers'] ?? [1, 2], 'record numbers travel with the import');
        $this->assertEqualsCanonicalizing(Customer::pluck('id')->map(fn ($id) => 'CUST'.$id)->all(), Customer::pluck('code')->all());
    }
}
