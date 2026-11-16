<?php

namespace Tests\Feature\Sales;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Employee stickers: a salesperson is the store's employee, found by sticker (EMP-<id>) or code, credited by id. */
class SalespersonTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($this->fixture['user']);
    }

    private function employee(array $values = []): int
    {
        return DB::table('employees')->insertGetId([...['store_id' => $this->fixture['store']->id, 'name' => 'Ravi', 'code' => 'E1', 'salary' => 0,
            'is_active' => true, 'master_details' => json_encode(['incentive_pct' => 2]), 'created_at' => now(), 'updated_at' => now()], ...$values]);
    }

    private function sell(mixed $salesManId): int
    {
        $item = $this->fixture['items'][0];

        return $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100,
            'items' => [[...$item, 'salesManId' => $salesManId, 'salesManName' => 'Ravi']]])->assertCreated()->json('data.id');
    }

    public function test_a_salesperson_is_found_by_sticker_or_code_and_only_in_this_store(): void
    {
        $section = DB::table('hr_departments')->insertGetId(['name' => 'Sarees', 'code' => 'SAR', 'store_id' => $this->fixture['store']->id, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $ravi = $this->employee(['department_id' => $section]);
        $this->employee(['name' => 'Left', 'code' => 'E2', 'is_active' => false]);
        $other = Store::create(['name' => 'TEMP Other', 'code' => 'TEMP-OTHER', 'is_active' => true]);
        $elsewhere = $this->employee(['store_id' => $other->id, 'name' => 'Elsewhere', 'code' => 'E9']);

        $this->getJson("/api/pos-sales/salesman-lookup?employeeCode=EMP-$ravi")->assertOk()
            ->assertJsonPath('data.id', $ravi)->assertJsonPath('data.name', 'Ravi')->assertJsonPath('data.section', 'Sarees')->assertJsonPath('data.sticker', "EMP-$ravi");
        $this->getJson('/api/pos-sales/salesman-lookup?employeeCode=E1')->assertOk()->assertJsonPath('data.id', $ravi);
        $this->getJson("/api/pos-sales/salesman-lookup?employeeCode=EMP-$elsewhere")->assertNotFound();
        $this->getJson('/api/pos-sales/salesman-lookup?employeeCode=E2')->assertNotFound(); // no longer active

        $this->assertSame(['Ravi'], array_column($this->getJson('/api/pos-sales/salespeople')->assertOk()->json('data'), 'name'));
    }

    public function test_the_sale_credits_the_employee_and_a_bad_value_never_fails_the_sale(): void
    {
        $ravi = $this->employee();
        $saleId = $this->sell($ravi);
        $this->assertSame($ravi, (int) DB::table('pos_sale_items')->where('pos_sale_id', $saleId)->value('sales_man_id'));

        // What the old Salesman box sent (a code), and another store's employee: kept as a name only.
        $other = Store::create(['name' => 'TEMP Other', 'code' => 'TEMP-OTHER', 'is_active' => true]);
        foreach (['E1', $this->employee(['store_id' => $other->id, 'code' => 'E9'])] as $bad) {
            $id = $this->sell($bad);
            $this->assertNull(DB::table('pos_sale_items')->where('pos_sale_id', $id)->value('sales_man_id'));
            $this->assertSame('Ravi', DB::table('pos_sale_items')->where('pos_sale_id', $id)->value('sales_man_name'));
        }

        // The Incentive report counts the credited line: 2% of ₹100.
        $rows = $this->getJson('/api/sales-reports/store/incentives')->assertOk()->json('data');
        $this->assertEquals(2, collect($rows)->firstWhere('employee_name', 'Ravi')['incentive_amount']);
    }

    public function test_a_cashier_can_look_up_salespeople(): void
    {
        $this->employee();
        Sanctum::actingAs(User::create(['name' => 'TEMP Cashier', 'username' => 'temp-sp-cashier', 'email' => 'sp-cashier@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $this->fixture['store']->id, 'is_active' => true]));
        $this->getJson('/api/pos-sales/salespeople')->assertOk()->assertJsonPath('data.0.code', 'E1');
    }
}
