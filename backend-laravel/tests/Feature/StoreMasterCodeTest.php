<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class StoreMasterCodeTest extends TestCase
{
    use RefreshDatabase;

    public static function masters(): array
    {
        return [['brands'], ['categories']];
    }

    private function storesAndOwner(): array
    {
        $one = Store::create(['name' => 'One', 'code' => 'CODE-ONE']);
        $two = Store::create(['name' => 'Two', 'code' => 'CODE-TWO']);
        Sanctum::actingAs(User::create(['name' => 'Owner', 'username' => 'code-owner', 'email' => 'code-owner@example.test', 'password' => 'secret', 'role' => 'admin']));

        return [$one, $two];
    }

    #[DataProvider('masters')]
    public function test_codes_can_be_reused_across_stores_but_duplicates_in_selected_store_return_422(string $table): void
    {
        [$one, $two] = $this->storesAndOwner();
        $first = $this->withHeader('X-Store-Id', (string) $one->id)->postJson('/api/'.$table, ['name' => 'First', 'code' => 'SHARED'])->assertCreated()->json('data.id');
        $second = $this->withHeader('X-Store-Id', (string) $two->id)->postJson('/api/'.$table, ['name' => 'Second', 'code' => 'SHARED'])->assertCreated()->json('data.id');
        $this->assertDatabaseHas($table, ['id' => $first, 'store_id' => $one->id, 'code' => 'SHARED']);
        $this->assertDatabaseHas($table, ['id' => $second, 'store_id' => $two->id, 'code' => 'SHARED']);
        $this->postJson('/api/'.$table, ['name' => 'Duplicate', 'code' => 'SHARED'])->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->putJson('/api/'.$table.'/'.$second, ['name' => 'Edited', 'code' => 'SHARED'])->assertOk();
        $third = $this->postJson('/api/'.$table, ['name' => 'Third', 'code' => 'OTHER'])->assertCreated()->json('data.id');
        $this->putJson('/api/'.$table.'/'.$third, ['code' => 'SHARED'])->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->putJson('/api/'.$table.'/'.$first, ['name' => 'Cross store'])->assertNotFound();
        $this->assertDatabaseHas($table, ['id' => $first, 'name' => 'First']);
        $this->assertDatabaseHas($table, ['id' => $third, 'code' => 'OTHER']);
        $this->getJson('/api/'.$table.'?all=true')->assertOk()->assertJsonCount(2, 'data');
    }

    #[DataProvider('masters')]
    public function test_database_rejects_duplicate_codes_in_one_store_even_without_http_validation(string $table): void
    {
        [$one] = $this->storesAndOwner();
        DB::table($table)->insert(['name' => 'First', 'code' => 'SAME', 'store_id' => $one->id]);
        $this->expectException(QueryException::class);
        DB::table($table)->insert(['name' => 'Second', 'code' => 'SAME', 'store_id' => $one->id]);
    }

    public static function invalidOwnership(): array
    {
        return ['unassigned' => [null], 'missing store' => [99999]];
    }

    #[DataProvider('invalidOwnership')]
    public function test_legacy_ownership_must_be_reconciled_before_either_index_is_changed(?int $storeId): void
    {
        $migration = require database_path('migrations/2026_10_15_081958_scope_brand_and_category_codes_to_stores.php');
        $migration->down();
        DB::table('categories')->insert(['name' => 'Legacy', 'code' => 'LEGACY', 'store_id' => $storeId]);
        try {
            $migration->up();
            $this->fail('Unassigned legacy records must block migration.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Reconcile categories store ownership', $exception->getMessage());
        }
        $this->assertTrue(Schema::hasIndex('brands', 'brands_code_unique'));
        $this->assertTrue(Schema::hasIndex('categories', 'categories_code_unique'));
        $this->assertDatabaseHas('categories', ['code' => 'LEGACY', 'store_id' => $storeId]);
    }

    public function test_rollback_refuses_cross_store_duplicates_without_modifying_either_index(): void
    {
        [$one, $two] = $this->storesAndOwner();
        foreach ([$one, $two] as $store) {
            DB::table('categories')->insert(['name' => 'Shared', 'code' => 'SAME', 'store_id' => $store->id]);
        }
        $migration = require database_path('migrations/2026_10_15_081958_scope_brand_and_category_codes_to_stores.php');
        $migration->up();
        try {
            $migration->down();
            $this->fail('Rollback must preserve legitimate store-local codes.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Cannot restore global categories', $exception->getMessage());
        }
        $this->assertFalse(Schema::hasIndex('brands', 'brands_code_unique'));
        $this->assertTrue(Schema::hasIndex('categories', 'categories_store_id_code_unique'));
        $this->assertDatabaseCount('categories', 2);
    }
}
