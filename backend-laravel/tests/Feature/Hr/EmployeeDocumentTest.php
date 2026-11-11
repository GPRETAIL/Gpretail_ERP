<?php

namespace Tests\Feature\Hr;

use App\Models\Employee;
use App\Models\Store;
use App\Models\User;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployeeDocumentTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        // The real private disk in a scratch folder: Storage::fake() would replace the signed links with a stub.
        config(['filesystems.disks.local.root' => $root = storage_path('framework/testing/disks/employee-documents')]);
        (new Filesystem)->cleanDirectory($root);
        Storage::forgetDisk('local');
        Storage::fake('public');
        $this->store = Store::create(['name' => 'HR store', 'code' => 'HR-'.Str::random(6)]);
    }

    private function actingAsRole(string $role): void
    {
        Sanctum::actingAs(User::factory()->create(['username' => "{$role}-".Str::random(8), 'role' => $role, 'store_id' => $this->store->id]));
    }

    private function employee(): Employee
    {
        $this->actingAsRole('manager');

        return Employee::find($this->postJson('/api/employees', ['name' => 'Asha', 'contact_no' => '9876500004', 'salary' => 25000, 'aadhar_number' => '1234 5678 9012', 'bank_account_no' => '99887766'])
            ->assertCreated()->json('data.id'));
    }

    public function test_documents_are_private_saved_on_the_employee_and_opened_by_signed_link(): void
    {
        $employee = $this->employee();
        $path = $this->postJson("/api/employees/{$employee->id}/upload", ['upload_aadhar' => UploadedFile::fake()->create('aadhar.pdf', 20, 'application/pdf')])
            ->assertOk()->json('data.upload_aadhar');

        $this->assertStringStartsWith("employees/{$employee->id}/documents/", $path);
        Storage::disk('local')->assertExists($path);
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->getJson("/api/employees/{$employee->id}")->assertOk()->assertJsonPath('data.upload_aadhar', $path);
        // A later form save (which doesn't send the upload fields) keeps the reference.
        $this->putJson("/api/employees/{$employee->id}", ['name' => 'Asha R'])->assertOk();
        $this->getJson("/api/employees/{$employee->id}")->assertOk()->assertJsonPath('data.upload_aadhar', $path)->assertJsonPath('data.name', 'Asha R');

        $url = $this->getJson("/api/employees/{$employee->id}/document-url?path=".urlencode($path))->assertOk()->json('data.url');
        $this->assertStringContainsString('signature=', $url);
        $this->assertSame(Storage::disk('local')->get($path), $this->get(parse_url($url, PHP_URL_PATH).'?'.parse_url($url, PHP_URL_QUERY))->assertOk()->streamedContent());
        $this->get(parse_url($url, PHP_URL_PATH))->assertForbidden();
    }

    public function test_links_are_only_signed_for_that_employees_own_files(): void
    {
        $employee = $this->employee();
        $other = Employee::create(['name' => 'Other', 'code' => 'OTH1']);
        Storage::disk('local')->put("employees/{$other->id}/documents/pan.pdf", 'x');
        Storage::disk('local')->put("employees/{$employee->id}/documents/id.pdf", 'x');

        foreach (["employees/{$other->id}/documents/pan.pdf", "employees/{$employee->id}/../{$other->id}/documents/pan.pdf", 'backups/latest.sql', ''] as $path) {
            $this->getJson("/api/employees/{$employee->id}/document-url?path=".urlencode($path))->assertNotFound();
        }
        $legacy = "https://erp.example.test/storage/employees/{$employee->id}/documents/id.pdf";
        $this->getJson("/api/employees/{$employee->id}/document-url?path=".urlencode($legacy))->assertOk();
        $this->postJson("/api/employees/{$employee->id}/upload", ['avatar' => UploadedFile::fake()->image('a.png')])->assertUnprocessable();
    }

    public function test_counter_roles_get_an_employee_directory_without_personal_records(): void
    {
        $employee = $this->employee();
        Storage::disk('local')->put("employees/{$employee->id}/documents/id.pdf", 'x');

        $this->actingAsRole('cashier');
        $row = $this->getJson('/api/employees?all=true')->assertOk()->json('data.0');
        $this->assertSame('Asha', $row['name']);
        foreach (['salary', 'aadhar_number', 'bank_account_no', 'phone'] as $field) {
            $this->assertArrayNotHasKey($field, array_filter($row, fn ($value) => $value !== null), $field);
        }
        $this->getJson("/api/employees/{$employee->id}")->assertForbidden();
        $this->getJson("/api/employees/{$employee->id}/document-url?path=employees/{$employee->id}/documents/id.pdf")->assertForbidden();

        $this->actingAsRole('manager');
        $this->getJson('/api/employees?all=true')->assertOk()->assertJsonPath('data.0.aadhar_number', '1234 5678 9012');
    }

    public function test_migration_moves_existing_public_uploads_to_the_private_disk(): void
    {
        Storage::disk('public')->put('employees/7/documents/old.pdf', 'scan');
        Storage::disk('public')->put('brands/logo.png', 'logo');

        (require database_path('migrations/2026_11_01_100000_move_employee_documents_to_private_disk.php'))->up();

        Storage::disk('local')->assertExists('employees/7/documents/old.pdf');
        Storage::disk('public')->assertMissing('employees/7/documents/old.pdf');
        Storage::disk('public')->assertExists('brands/logo.png');
    }
}
