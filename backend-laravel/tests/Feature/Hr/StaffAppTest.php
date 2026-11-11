<?php

namespace Tests\Feature\Hr;

use App\Models\Employee;
use App\Models\HrRequest;
use App\Models\Notification;
use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\StaffAppAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/** The staff app (/hr): mobile number + PIN sign-in, what its token may reach, the home/inbox data and HR setup. */
class StaffAppTest extends TestCase
{
    use RefreshDatabase;

    private string $privateKeyPem = '';

    private PlatformActivation $activation;

    private Store $store;

    private User $hr;

    private Employee $lead;

    private User $leadLogin;

    private Employee $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_ED25519, 'config' => base_path('tests/Fixtures/openssl.cnf')]);
        openssl_pkey_export($key, $this->privateKeyPem, null, ['config' => base_path('tests/Fixtures/openssl.cnf')]);
        config(['platform.licence_public_keys' => ['dev' => openssl_pkey_get_details($key)['key']]]);
        $this->activation = PlatformActivation::create(['company_code' => 'CMP-STAFF', 'activated' => true, 'status' => 'active',
            'tenant_admin_email' => 'tenant@example.test', 'deployment_id' => (string) Str::uuid()]);
        $this->store = $this->licensedStore('Main branch', 51);
        $this->hr = $this->login('manager', $this->store);
        $this->leadLogin = $this->login('manager', $this->store);
        $this->lead = $this->employee('Lead Lakshmi', '98400 11111', $this->store, $this->leadLogin);
        $this->staff = $this->employee('Staff Senthil', '+91 98765 43210', $this->store, null, $this->lead);
    }

    private function licensedStore(string $name, int $platformId, bool $mobile = true): Store
    {
        $store = Store::create(['name' => $name, 'code' => 'STR-'.Str::random(6), 'platform_company_code' => $this->activation->company_code,
            'platform_store_id' => $platformId, 'activated_at' => now(), 'is_active' => true]);
        $claims = ['iss' => 'vx-admin', 'aud' => 'next-erp', 'kid' => 'dev', 'sub' => $store->code, 'company_code' => $this->activation->company_code,
            'store_id' => $platformId, 'deployment_id' => $this->activation->deployment_id, 'status' => 'active', 'subscription_status' => 'active',
            'iat' => now()->subHour()->timestamp, 'exp' => now()->addDay()->timestamp, 'activeTill' => now()->addMonth()->timestamp,
            'offline_until' => now()->addDays(2)->timestamp, 'entitlements' => ['channels' => ['mobile' => $mobile], 'sections' => ['hrms' => 'all']]];
        $encode = fn ($value) => rtrim(strtr(base64_encode(json_encode($value)), '+/', '-_'), '=');
        $input = $encode(['alg' => 'EdDSA', 'typ' => 'JWT', 'kid' => 'dev']).'.'.$encode($claims);
        openssl_sign($input, $signature, $this->privateKeyPem, null);
        $store->update(['platform_licence_token' => $input.'.'.rtrim(strtr(base64_encode($signature), '+/', '-_'), '=')]);

        return $store;
    }

    private function login(string $role, Store $store): User
    {
        return User::factory()->create(['username' => "{$role}-".Str::random(8), 'role' => $role, 'store_id' => $store->id,
            'platform_company_code' => $this->activation->company_code, 'web_access' => true]);
    }

    private function employee(string $name, string $phone, Store $store, ?User $login = null, ?Employee $reportsTo = null): Employee
    {
        return Employee::create(['name' => $name, 'code' => strtoupper(Str::random(6)), 'store_id' => $store->id, 'is_active' => true, 'phone' => $phone,
            'joining_date' => '2025-01-01', 'user_id' => $login?->id, 'reports_to_id' => $reportsTo?->id]);
    }

    private function as(?string $token): void
    {
        $this->app['auth']->forgetGuards();
        $this->withToken((string) $token);
    }

    private function hrSetsPin(Employee $employee, string $pin = '482619', ?User $hr = null): void
    {
        $this->as(($hr ?? $this->hr)->createToken('web-token', ['client:web'])->plainTextToken);
        $this->postJson("/api/staff-app-setup/{$employee->id}/pin", ['pin' => $pin])->assertOk();
    }

    private function staffLogin(string $phone, string $pin, ?int $store = null): \Illuminate\Testing\TestResponse
    {
        $this->app['auth']->forgetGuards();
        $this->withoutToken();

        return $this->postJson('/api/auth/staff-login', array_filter(['phone' => $phone, 'pin' => $pin, 'store_id' => $store]));
    }

    public function test_hr_sets_a_pin_and_the_employee_signs_in_with_mobile_number_then_chooses_their_own_pin(): void
    {
        $this->hrSetsPin($this->staff);
        $list = collect($this->getJson('/api/staff-app-setup')->assertOk()->json('data'))->keyBy('id');
        $this->assertTrue($list[$this->staff->id]['app_access']);
        $this->assertFalse($list[$this->lead->id]['app_access']);

        // Any way of writing the number: the last 10 digits match.
        $login = $this->staffLogin('09876543210', '482619')->assertOk()->assertJsonPath('data.must_change_pin', true)
            ->assertJsonPath('data.employee.id', $this->staff->id)->assertJsonPath('data.user.auth_client', 'staff');
        $user = User::findOrFail($login->json('data.user.id'));
        $this->assertSame('staff', $user->role);
        $this->assertFalse((bool) $user->web_access);
        $this->assertStringEndsWith(StaffAppAccess::HIDDEN_EMAIL_DOMAIN, $user->email);
        $this->assertSame($user->id, $this->staff->fresh()->user_id);

        $this->as($login->json('data.token'));
        $this->postJson('/api/auth/staff-pin', ['current_pin' => '482619', 'new_pin' => '123456'])->assertUnprocessable()->assertJsonValidationErrors('new_pin');
        $this->postJson('/api/auth/staff-pin', ['current_pin' => '482619', 'new_pin' => '777777'])->assertUnprocessable();
        $this->postJson('/api/auth/staff-pin', ['current_pin' => '111111', 'new_pin' => '592718'])->assertUnprocessable()->assertJsonValidationErrors('current_pin');
        $this->postJson('/api/auth/staff-pin', ['current_pin' => '482619', 'new_pin' => '592718'])->assertOk();

        $this->staffLogin('9876543210', '482619')->assertUnauthorized();
        $this->staffLogin('+91 98765 43210', '592718')->assertOk()->assertJsonPath('data.must_change_pin', false)->assertJsonPath('data.user.id', $user->id);
        $this->assertSame(1, User::where('email', 'like', '%'.StaffAppAccess::HIDDEN_EMAIL_DOMAIN)->count(), 'The hidden login is made once.');

        // The hidden login is not listed in User Access.
        $this->as(User::factory()->create(['username' => 'admin-'.Str::random(8), 'role' => 'admin', 'store_id' => $this->store->id, 'platform_company_code' => $this->activation->company_code, 'web_access' => true])
            ->createToken('web-token', ['client:web'])->plainTextToken);
        $this->assertNotContains($user->id, collect($this->getJson('/api/user-access')->assertOk()->json('data'))->pluck('id')->all());
    }

    public function test_new_pins_are_six_digits_but_an_older_four_digit_pin_still_signs_in(): void
    {
        $this->as($this->hr->createToken('web-token', ['client:web'])->plainTextToken);
        $this->postJson("/api/staff-app-setup/{$this->staff->id}/pin", ['pin' => '4826'])->assertUnprocessable()->assertJsonFragment(['The starting PIN must be 6 digits.']);
        $this->hrSetsPin($this->staff);
        $this->as($this->staffLogin('9876543210', '482619')->json('data.token'));
        $this->postJson('/api/auth/staff-pin', ['current_pin' => '482619', 'new_pin' => '5927'])->assertUnprocessable()->assertJsonFragment(['Choose a 6-digit PIN.']);

        Employee::withoutGlobalScopes()->whereKey($this->staff->id)->update(['app_pin' => \Illuminate\Support\Facades\Hash::make('4826'), 'app_pin_must_change' => false]);
        $this->staffLogin('9876543210', '4826')->assertOk();
    }

    public function test_wrong_pins_lock_the_number_and_unknown_numbers_get_the_same_answer(): void
    {
        $this->hrSetsPin($this->staff);
        $this->staffLogin('9000000000', '482619')->assertUnauthorized()->assertJsonPath('message', 'Phone number or PIN is wrong.');
        for ($i = 0; $i < 5; $i++) {
            $this->staffLogin('9876543210', '135790')->assertUnauthorized()->assertJsonPath('message', 'Phone number or PIN is wrong.');
        }
        $this->staffLogin('9876543210', '482619')->assertStatus(429);
    }

    public function test_access_off_no_mobile_licence_and_weak_or_clashing_pins_are_refused(): void
    {
        $this->staffLogin('9876543210', '482619')->assertUnauthorized(); // Never switched on.
        $this->as($this->hr->createToken('web-token', ['client:web'])->plainTextToken);
        $this->postJson("/api/staff-app-setup/{$this->staff->id}/pin", ['pin' => '234567'])->assertUnprocessable();
        $this->postJson("/api/staff-app-setup/{$this->staff->id}/pin", ['pin' => '000000'])->assertUnprocessable();
        $noPhone = $this->employee('No Phone', '', $this->store);
        $this->postJson("/api/staff-app-setup/{$noPhone->id}/pin", ['pin' => '482619'])->assertUnprocessable()->assertJsonFragment(['Add a 10-digit mobile number (Contact No) to this employee first.']);
        $this->postJson("/api/staff-app-setup/{$this->staff->id}/pin", ['pin' => '482619'])->assertOk();
        $twin = $this->employee('Same Number', '9876543210', $this->store);
        $this->postJson("/api/staff-app-setup/{$twin->id}/pin", ['pin' => '482619'])->assertUnprocessable();

        $this->postJson("/api/staff-app-setup/{$this->staff->id}/disable")->assertOk();
        $this->staffLogin('9876543210', '482619')->assertUnauthorized();

        $basic = $this->licensedStore('No mobile branch', 52, mobile: false);
        $hr = $this->login('manager', $basic);
        $worker = $this->employee('Basic Worker', '9123456789', $basic);
        $this->hrSetsPin($worker, '482619', $hr);
        $this->staffLogin('9123456789', '482619')->assertForbidden()->assertJsonPath('error_code', 'MOBILE_SUBSCRIPTION_REQUIRED');
    }

    public function test_the_same_number_in_two_stores_asks_which_store(): void
    {
        $branch = $this->licensedStore('Second branch', 53);
        $branchHr = $this->login('manager', $branch);
        $twin = $this->employee('Staff Senthil', '9876543210', $branch);
        $this->hrSetsPin($this->staff);
        $this->hrSetsPin($twin, '482619', $branchHr);

        $stores = $this->staffLogin('9876543210', '482619')->assertStatus(409)->assertJsonPath('error_code', 'CHOOSE_STORE')->json('data.stores');
        $this->assertEqualsCanonicalizing([$this->store->id, $branch->id], array_column($stores, 'store_id'));
        $this->staffLogin('9876543210', '482619', $branch->id)->assertOk()->assertJsonPath('data.store.id', $branch->id)->assertJsonPath('data.employee.id', $twin->id);
    }

    public function test_a_staff_token_reaches_own_hr_and_approvals_only_even_for_a_manager(): void
    {
        $this->hrSetsPin($this->staff);
        $this->hrSetsPin($this->lead, '593817');
        $staffToken = $this->staffLogin('9876543210', '482619')->json('data.token');
        $leadToken = $this->staffLogin('9840011111', '593817')->assertOk()->assertJsonPath('data.user.id', $this->leadLogin->id)->json('data.token');

        // The employee: own check-in, requests and home; nothing else, not even a list of products.
        $this->as($staffToken);
        $this->getJson('/api/attendance/me')->assertOk();
        $id = $this->postJson('/api/staff-requests', ['type' => 'ATTENDANCE', 'from_date' => now()->subDay()->toDateString(), 'check_in' => '09:00', 'check_out' => '18:00', 'reason' => 'Forgot'])
            ->assertCreated()->json('data.id');
        $this->postJson('/api/staff-loans', ['type' => 'ADVANCE', 'amount' => 2000])->assertCreated();
        $this->getJson('/api/staff-app/home')->assertOk()->assertJsonPath('data.my_pending.requests', 1)->assertJsonPath('data.my_pending.loans', 1)
            ->assertJsonPath('data.can_approve', false);
        $this->getJson('/api/staff-app/inbox')->assertForbidden();
        $this->getJson('/api/products')->assertForbidden()->assertJsonPath('code', 'STAFF_APP_SCOPE');
        $this->getJson('/api/employees')->assertForbidden()->assertJsonPath('code', 'STAFF_APP_SCOPE');
        $this->postJson("/api/staff-requests/{$id}/approve")->assertForbidden();

        // The manager signs in to the staff app as their own login: approvals yes, sales and settings no.
        $this->as($leadToken);
        $home = $this->getJson('/api/staff-app/home')->assertOk()->assertJsonPath('data.can_approve', true)->assertJsonPath('data.team.size', 1);
        $this->assertSame(1, $home->json('data.approvals.attendance'));
        $this->assertSame(1, $home->json('data.approvals.loan'));
        $inbox = collect($this->getJson('/api/staff-app/inbox')->assertOk()->json('data'));
        $this->assertEqualsCanonicalizing(['attendance', 'loan'], $inbox->pluck('type')->all());
        $this->assertSame('Staff Senthil', $inbox->firstWhere('type', 'attendance')['employee_name']);
        $this->getJson('/api/staff-app/team')->assertOk()->assertJsonPath('data.members.0.name', 'Staff Senthil')->assertJsonPath('data.members.0.status', 'NOT_IN');
        $this->postJson("/api/staff-requests/{$id}/approve", ['note' => 'OK'])->assertOk();
        $this->assertSame('APPROVED', HrRequest::find($id)->status);
        $this->getJson('/api/pos-sales')->assertForbidden()->assertJsonPath('code', 'STAFF_APP_SCOPE');
        $this->getJson('/api/staff-app-setup')->assertForbidden()->assertJsonPath('code', 'STAFF_APP_SCOPE');

        // Signing in to the ERP does not sign the manager out of the staff app.
        $this->app['auth']->forgetGuards();
        $this->withoutToken();
        $this->leadLogin->forceFill(['password' => bcrypt('Erp-pass-123')])->saveQuietly();
        $this->postJson('/api/auth/login', ['username' => $this->leadLogin->username, 'password' => 'Erp-pass-123'])->assertOk();
        $this->as($leadToken);
        $this->getJson('/api/staff-app/home')->assertOk();
    }

    public function test_the_staff_app_lists_only_the_employees_own_hr_notifications(): void
    {
        $this->hrSetsPin($this->staff);
        $token = $this->staffLogin('9876543210', '482619')->json('data.token');
        $userId = $this->staff->fresh()->user_id;
        Notification::withoutGlobalScopes()->create(['type' => 'LEAVE_DECIDED', 'title' => 'Leave approved', 'message' => 'Your leave is approved.', 'link' => '/hrms/leave',
            'reference_type' => 'LEAVE_APPLICATION', 'reference_id' => 1, 'store_id' => $this->store->id, 'user_id' => $userId]);
        Notification::withoutGlobalScopes()->create(['type' => 'TAX_PROOF', 'title' => 'Tax proof to verify', 'message' => 'Someone uploaded a proof.', 'link' => '/hrms/income-tax',
            'reference_type' => 'HR_MONEY', 'reference_id' => 2, 'store_id' => $this->store->id, 'user_id' => null]);
        Notification::withoutGlobalScopes()->create(['type' => 'LOW_STOCK', 'title' => 'Low stock', 'message' => 'Shirts are running out.', 'link' => '/warehouse/dashboard',
            'store_id' => $this->store->id, 'user_id' => $userId]);

        $this->as($token);
        $this->assertSame(['Leave approved'], collect($this->getJson('/api/notifications')->assertOk()->json('data'))->pluck('title')->all());
        $this->getJson('/api/notifications/unread-count')->assertOk()->assertJsonPath('data.count', 1);
    }

    public function test_profile_hides_sensitive_fields_and_switching_off_signs_the_employee_out(): void
    {
        $this->staff->forceFill(['master_details' => ['bank_account_no' => '123456789012', 'pan_number' => 'ABCDE1234F', 'aadhar_no' => '999988887777', 'blood_group' => 'O+']])->save();
        $this->hrSetsPin($this->staff);
        $token = $this->staffLogin('9876543210', '482619')->json('data.token');
        $this->as($token);
        $profile = $this->getJson('/api/staff-app/profile')->assertOk()->assertJsonPath('data.bank_account', '••••9012')
            ->assertJsonPath('data.pan', '••••234F')->assertJsonPath('data.reports_to', 'Lead Lakshmi')->assertJsonPath('data.blood_group', 'O+');
        $this->assertStringNotContainsString('999988887777', $profile->getContent());
        $this->assertStringNotContainsString('salary', $profile->getContent());

        $this->as($this->hr->createToken('web-token', ['client:web'])->plainTextToken);
        $this->postJson("/api/staff-app-setup/{$this->staff->id}/disable")->assertOk();
        $this->as($token);
        $this->getJson('/api/staff-app/home')->assertUnauthorized();
    }
}
