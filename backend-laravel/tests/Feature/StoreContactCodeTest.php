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

class StoreContactCodeTest extends TestCase
{
    use RefreshDatabase;

    public static function masters(): array
    {
        return [
            ['suppliers', 'suppliers'], ['transports', 'transports'], ['agents', 'agents'],
            ['employees', 'employees'], ['hr_departments', 'hr-departments'], ['hr_designations', 'hr-designations'],
        ];
    }

    private function storesAndOwner(): array
    {
        $one = Store::create(['name' => 'One', 'code' => 'CONTACT-ONE']);
        $two = Store::create(['name' => 'Two', 'code' => 'CONTACT-TWO']);
        Sanctum::actingAs(User::create(['name' => 'Owner', 'username' => 'contact-owner', 'email' => 'contact@example.test', 'password' => 'secret', 'role' => 'admin']));

        return [$one, $two];
    }

    private function row(string $table, Store $store, string $code): array
    {
        $row = ['name' => 'Contact '.$code, 'code' => $code];
        if ($table === 'hr_designations') {
            $row['department_id'] = DB::table('hr_departments')->insertGetId(['name' => 'Department', 'code' => 'DEPT-'.$code, 'store_id' => $store->id]);
        }

        return $row;
    }

    #[DataProvider('masters')]
    public function test_store_local_codes_work_for_create_update_and_reads_while_duplicates_return_422(string $table, string $route): void
    {
        [$one, $two] = $this->storesAndOwner();
        $payload = $this->row($table, $one, 'SHARED');
        $first = $this->withHeader('X-Store-Id', (string) $one->id)->postJson('/api/'.$route, $payload)->assertCreated()->json('data.id');
        $payload = $this->row($table, $two, 'SHARED');
        $second = $this->withHeader('X-Store-Id', (string) $two->id)->postJson('/api/'.$route, $payload)->assertCreated()->json('data.id');
        $this->assertDatabaseHas($table, ['id' => $first, 'store_id' => $one->id, 'code' => 'SHARED']);
        $this->assertDatabaseHas($table, ['id' => $second, 'store_id' => $two->id, 'code' => 'SHARED']);
        $this->postJson('/api/'.$route, $payload)->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->putJson('/api/'.$route.'/'.$second, ['code' => 'SHARED', 'name' => 'Edited'])->assertOk();
        $third = $this->postJson('/api/'.$route, $this->row($table, $two, 'OTHER'))->assertCreated()->json('data.id');
        $this->putJson('/api/'.$route.'/'.$third, ['code' => 'SHARED'])->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->putJson('/api/'.$route.'/'.$first, ['name' => 'Cross store'])->assertNotFound();
        $this->assertDatabaseHas($table, ['id' => $first, 'name' => 'Contact SHARED']);
        $this->assertDatabaseHas($table, ['id' => $third, 'code' => 'OTHER']);
        $this->getJson('/api/'.$route.'?all=true')->assertOk()->assertJsonCount(2, 'data');
    }

    #[DataProvider('masters')]
    public function test_database_rejects_same_store_duplicates_without_http_validation(string $table, string $route): void
    {
        [$one] = $this->storesAndOwner();
        $row = $this->row($table, $one, 'SAME') + ['store_id' => $one->id];
        DB::table($table)->insert($row);
        $this->expectException(QueryException::class);
        DB::table($table)->insert($row);
    }

    public function test_designations_create_independent_default_departments_in_each_store(): void
    {
        [$one, $two] = $this->storesAndOwner();
        foreach ([$one, $two] as $store) {
            $this->withHeader('X-Store-Id', (string) $store->id)->postJson('/api/hr-designations', ['name' => 'Cashier', 'code' => 'CASHIER'])->assertCreated();
            $this->assertDatabaseHas('hr_departments', ['code' => 'GENERAL_DEPT', 'store_id' => $store->id]);
        }
        $this->assertDatabaseCount('hr_departments', 2);
    }

    public function test_agent_code_lookup_requires_selection_and_never_returns_a_different_stores_match(): void
    {
        [$one, $two] = $this->storesAndOwner();
        $first = DB::table('agents')->insertGetId(['name' => 'First', 'code' => 'SHARED', 'store_id' => $one->id]);
        $second = DB::table('agents')->insertGetId(['name' => 'Second', 'code' => 'SHARED', 'store_id' => $two->id]);
        $this->getJson('/api/agents/SHARED')->assertUnprocessable()->assertJsonPath('code', 'STORE_SELECTION_REQUIRED');
        $this->withHeader('X-Store-Id', (string) $two->id)->getJson('/api/agents/SHARED')->assertOk()->assertJsonPath('data.id', $second);
        $this->withHeader('X-Store-Id', (string) $one->id)->getJson('/api/agents/SHARED')->assertOk()->assertJsonPath('data.id', $first);
        $this->putJson('/api/agents/SHARED', ['name' => 'First edited'])->assertOk();
        $this->assertDatabaseHas('agents', ['id' => $second, 'name' => 'Second']);
        $this->deleteJson('/api/agents/SHARED')->assertOk();
        $this->assertDatabaseMissing('agents', ['id' => $first]);
        $this->assertDatabaseHas('agents', ['id' => $second, 'name' => 'Second']);
        $this->getJson('/api/agents/SHARED')->assertNotFound();
    }

    public function test_numeric_agent_ids_take_precedence_over_a_different_records_numeric_code(): void
    {
        [$one] = $this->storesAndOwner();
        $first = DB::table('agents')->insertGetId(['name' => 'Numeric code', 'code' => '2', 'store_id' => $one->id]);
        $second = DB::table('agents')->insertGetId(['name' => 'ID match', 'code' => 'SECOND', 'store_id' => $one->id]);
        $this->assertSame(2, $second);
        $this->withHeader('X-Store-Id', (string) $one->id)->getJson('/api/agents/'.$second)->assertOk()->assertJsonPath('data.id', $second);
        $this->putJson('/api/agents/'.$second, ['name' => 'ID edited'])->assertOk();
        $this->assertDatabaseHas('agents', ['id' => $first, 'name' => 'Numeric code']);
        $this->assertDatabaseHas('agents', ['id' => $second, 'name' => 'ID edited']);
    }

    public function test_migration_preflights_all_tables_and_does_not_assign_legacy_records(): void
    {
        $migration = require database_path('migrations/2026_10_15_083816_scope_business_contact_and_hr_codes_to_stores.php');
        $migration->down();
        DB::table('hr_departments')->insert(['name' => 'Legacy', 'code' => 'LEGACY']);
        try {
            $migration->up();
            $this->fail('Legacy ownership must be reconciled.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Reconcile hr_departments', $exception->getMessage());
        }
        $this->assertTrue(Schema::hasIndex('suppliers', 'suppliers_code_unique'));
        $this->assertDatabaseHas('hr_departments', ['code' => 'LEGACY', 'store_id' => null]);
    }

    public function test_migration_retry_and_rollback_preserve_valid_cross_store_codes(): void
    {
        [$one, $two] = $this->storesAndOwner();
        foreach ([$one, $two] as $store) {
            DB::table('employees')->insert(['name' => 'Employee', 'code' => 'SAME', 'store_id' => $store->id]);
        }
        $migration = require database_path('migrations/2026_10_15_083816_scope_business_contact_and_hr_codes_to_stores.php');
        $migration->up();
        try {
            $migration->down();
            $this->fail('Rollback must refuse valid cross-store duplicates.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Cannot restore global employees', $exception->getMessage());
        }
        $this->assertFalse(Schema::hasIndex('suppliers', 'suppliers_code_unique'));
        $this->assertTrue(Schema::hasIndex('employees', 'employees_store_id_code_unique'));
        $this->assertDatabaseCount('employees', 2);
    }

    public static function legacyEmployeeStoreCounts(): array
    {
        return ['one store' => [1], 'multiple stores' => [2]];
    }

    #[DataProvider('legacyEmployeeStoreCounts')]
    public function test_legacy_employees_are_assigned_only_when_the_store_is_unambiguous(int $storeCount): void
    {
        $store = Store::create(['name' => 'Existing store', 'code' => 'LEGACY-ONE']);
        if ($storeCount === 2) {
            Store::create(['name' => 'Second store', 'code' => 'LEGACY-TWO']);
        }
        $legacyId = DB::table('employees')->insertGetId(['name' => 'Legacy employee', 'code' => 'LEGACY-EMPLOYEE']);
        $ownedId = DB::table('employees')->insertGetId(['name' => 'Assigned employee', 'code' => 'ASSIGNED-EMPLOYEE', 'store_id' => $store->id]);
        $migration = require database_path('migrations/2026_10_15_083815_assign_single_store_legacy_employees.php');
        $migration->up();
        $migration->up();
        $this->assertDatabaseHas('employees', ['id' => $legacyId, 'store_id' => $storeCount === 1 ? $store->id : null]);
        $this->assertDatabaseHas('employees', ['id' => $ownedId, 'store_id' => $store->id]);
    }
}
