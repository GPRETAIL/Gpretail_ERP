<?php

namespace Tests\Feature\Hr;

use App\Models\Employee;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Contact No: required 10-digit mobile, stored as 10 digits, unique among a store's active employees. */
class EmployeeContactNoTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->store = Store::create(['name' => 'Phones', 'code' => 'PH-'.Str::random(5), 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['username' => 'hr-'.Str::random(6), 'role' => 'manager', 'store_id' => $this->store->id]));
        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id);
    }

    public function test_new_employees_need_a_valid_unique_mobile(): void
    {
        $this->postJson('/api/employees', ['name' => 'No Phone'])->assertUnprocessable()->assertJsonValidationErrors('contact_no');
        foreach (['12345', '98765 4321', '5876543210', '99887766554433'] as $bad) {
            $this->postJson('/api/employees', ['name' => 'Bad', 'contact_no' => $bad])->assertUnprocessable()->assertJsonValidationErrors('contact_no');
        }
        $id = $this->postJson('/api/employees', ['name' => 'Asha', 'contact_no' => '+91 98765-43210'])->assertCreated()->json('data.id');
        $this->assertSame('9876543210', Employee::find($id)->phone);
        $this->postJson('/api/employees', ['name' => 'Twin', 'contact_no' => '09876543210'])->assertUnprocessable()
            ->assertJsonFragment(['Asha already has the mobile number 9876543210 in this store.']);

        // Another store, or a relieved employee, does not block the number.
        Employee::whereKey($id)->update(['is_active' => false]);
        $this->postJson('/api/employees', ['name' => 'Rehired', 'contact_no' => '9876543210'])->assertCreated();
    }

    public function test_saving_an_old_employee_from_the_form_asks_for_the_number_but_partial_updates_do_not(): void
    {
        $old = Employee::create(['name' => 'Old Timer', 'code' => 'OLD1', 'store_id' => $this->store->id, 'is_active' => true]);
        $this->putJson("/api/employees/{$old->id}", ['is_active' => true])->assertOk(); // no Contact No sent: left alone
        $this->putJson("/api/employees/{$old->id}", ['name' => 'Old Timer', 'contact_no' => ''])->assertUnprocessable()->assertJsonValidationErrors('contact_no');
        $this->putJson("/api/employees/{$old->id}", ['name' => 'Old Timer', 'contact_no' => '91234 56789'])->assertOk();
        $this->assertSame('9123456789', $old->fresh()->phone);
        $this->putJson("/api/employees/{$old->id}", ['name' => 'Old Timer', 'contact_no' => '9123456789'])->assertOk(); // its own number is not a clash
    }

    public function test_the_excel_import_follows_the_same_rule(): void
    {
        $this->postJson('/api/employees/bulk', [['name' => 'Row One', 'contact_no' => '9000000001'], ['name' => 'Row Two', 'contact_no' => '123']])
            ->assertUnprocessable()->assertJsonFragment(['Excel row 3: Enter a valid 10-digit mobile number in Contact No (for example 98765 43210).']);
    }
}
