<?php

namespace Tests\Feature\Hr;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrCheckin;
use App\Models\HrDepartment;
use App\Models\HrDocument;
use App\Models\HrHoliday;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveType;
use App\Models\HrRequest;
use App\Models\HrTicket;
use App\Models\Notification;
use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\Hr\AttendanceService;
use App\Services\Hr\StaffAppAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
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

    private function licensedStore(string $name, int $platformId, bool $mobile = true, ?bool $hrms = null): Store
    {
        $store = Store::create(['name' => $name, 'code' => 'STR-'.Str::random(6), 'platform_company_code' => $this->activation->company_code,
            'platform_store_id' => $platformId, 'activated_at' => now(), 'is_active' => true]);
        $claims = ['iss' => 'vx-admin', 'aud' => 'next-erp', 'kid' => 'dev', 'sub' => $store->code, 'company_code' => $this->activation->company_code,
            'store_id' => $platformId, 'deployment_id' => $this->activation->deployment_id, 'status' => 'active', 'subscription_status' => 'active',
            'iat' => now()->subHour()->timestamp, 'exp' => now()->addDay()->timestamp, 'activeTill' => now()->addMonth()->timestamp,
            'offline_until' => now()->addDays(2)->timestamp, 'entitlements' => ['channels' => ['mobile' => $mobile] + ($hrms === null ? [] : ['hrms' => $hrms]), 'sections' => ['hrms' => 'all']]];
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

    private function staffLogin(string $phone, string $pin, ?int $store = null): TestResponse
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

        Employee::withoutGlobalScopes()->whereKey($this->staff->id)->update(['app_pin' => Hash::make('4826'), 'app_pin_must_change' => false]);
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

    public function test_the_hrms_app_follows_its_own_switch_not_the_business_app(): void
    {
        // HRMS app on, business mobile app off: staff can sign in.
        $hrOnly = $this->licensedStore('HRMS only branch', 61, mobile: false, hrms: true);
        $worker = $this->employee('Hrms Worker', '9000011111', $hrOnly);
        $this->hrSetsPin($worker, '482619', $this->login('manager', $hrOnly));
        $this->staffLogin('9000011111', '482619')->assertOk();

        // Business app on, HRMS app off: staff are refused with the subscription message.
        $bizOnly = $this->licensedStore('Business only branch', 62, mobile: true, hrms: false);
        $other = $this->employee('Biz Worker', '9000022222', $bizOnly);
        $this->hrSetsPin($other, '482619', $this->login('manager', $bizOnly));
        $this->staffLogin('9000022222', '482619')->assertForbidden()->assertJsonPath('error_code', 'MOBILE_SUBSCRIPTION_REQUIRED')
            ->assertJsonPath('message', fn ($message) => str_contains($message, 'HRMS app'));
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

    private function staffToken(Employee $employee, string $phone): string
    {
        $this->hrSetsPin($employee);

        return $this->staffLogin($phone, '482619')->assertOk()->json('data.token');
    }

    public function test_my_month_shows_each_day_with_its_status_and_only_my_own_days(): void
    {
        $other = $this->employee('Other Omar', '98400 22222', $this->store, null, $this->lead);
        $day = fn (Employee $e, string $date, string $status, array $more = []) => Attendance::create(['employee_id' => $e->id, 'store_id' => $this->store->id,
            'date' => $date, 'status' => $status, 'source' => 'SELF'] + $more);
        $day($this->staff, '2026-10-01', 'PRESENT', ['check_in' => '09:31:00', 'check_out' => '18:30:00', 'worked_minutes' => 539, 'late_minutes' => 1]);
        $day($this->staff, '2026-10-05', 'HALF_DAY', ['check_in' => '09:30:00', 'check_out' => '13:30:00', 'worked_minutes' => 240]);
        $day($other, '2026-10-01', 'ABSENT');
        HrHoliday::create(['store_id' => $this->store->id, 'date' => '2026-10-02', 'name' => 'Gandhi Jayanti']);

        $this->as($this->staffToken($this->staff, '+91 98765 43210'));
        $month = $this->getJson('/api/staff-app/attendance-month?month=2026-10')->assertOk()->json('data');
        $days = collect($month['days'])->keyBy('date');

        $this->assertCount(31, $month['days']);
        $this->assertSame(['PRESENT', '09:31:00', 539, 1], [$days['2026-10-01']['status'], $days['2026-10-01']['check_in'], $days['2026-10-01']['worked_minutes'], $days['2026-10-01']['late_minutes']]);
        $this->assertSame(['HOLIDAY', 'Gandhi Jayanti'], [$days['2026-10-02']['status'], $days['2026-10-02']['holiday']]);
        $this->assertSame('ABSENT', $days['2026-10-03']['status'], 'a past day with no punch');
        $this->assertSame('HALF_DAY', $days['2026-10-05']['status']);
        $this->assertSame(1.5, $month['totals']['present']);
        $this->assertSame(1, $month['totals']['late']);
        $this->assertSame(779, $month['totals']['worked_minutes']);

        $future = $this->getJson('/api/staff-app/attendance-month?month=2027-03')->assertOk()->json('data.days.0');
        $this->assertNull($future['status'], 'a day that has not come yet has no status');
        $this->getJson('/api/staff-app/attendance-month?month=October')->assertUnprocessable();
    }

    public function test_my_day_lists_the_punches_in_local_time_with_distance(): void
    {
        $at = Carbon::parse('2026-10-01 09:31:00', AttendanceService::timezone())->utc();
        HrCheckin::create(['store_id' => $this->store->id, 'employee_id' => $this->staff->id, 'punched_at' => $at, 'type' => 'IN', 'source' => 'SELF', 'distance_m' => 42]);
        HrCheckin::create(['store_id' => $this->store->id, 'employee_id' => $this->lead->id, 'punched_at' => $at, 'type' => 'IN', 'source' => 'SELF']);

        $this->as($this->staffToken($this->staff, '+91 98765 43210'));
        $day = $this->getJson('/api/staff-app/attendance-day?date=2026-10-01')->assertOk()->json('data');

        $this->assertCount(1, $day['punches'], 'only my punch, not the lead punch');
        $this->assertSame(['IN', '09:31:00', 'SELF', 42], [$day['punches'][0]['type'], $day['punches'][0]['at'], $day['punches'][0]['source'], $day['punches'][0]['distance_m']]);
        $this->getJson('/api/staff-app/attendance-day')->assertUnprocessable();
    }

    public function test_team_on_leave_lists_my_manager_s_team_by_name_and_dates_only(): void
    {
        $peer = $this->employee('Peer Priya', '98400 33333', $this->store, null, $this->lead);
        $stranger = $this->employee('Stranger Sam', '98400 44444', $this->store);
        $type = HrLeaveType::create(['store_id' => $this->store->id, 'code' => 'CL', 'name' => 'Casual leave', 'is_paid' => true]);
        $leave = fn (Employee $e, string $from, string $to, string $status = 'APPROVED') => HrLeaveApplication::create(['store_id' => $this->store->id,
            'employee_id' => $e->id, 'leave_type_id' => $type->id, 'from_date' => $from, 'to_date' => $to, 'days' => 2, 'reason' => 'Fever, doctor visit', 'status' => $status]);
        $leave($peer, '2026-12-01', '2026-12-02');
        $leave($stranger, '2026-12-01', '2026-12-02');
        $leave($peer, '2026-12-08', '2026-12-09', 'PENDING');
        $leave($peer, '2027-02-01', '2027-02-02');

        $this->as($this->staffToken($this->staff, '+91 98765 43210'));
        $response = $this->getJson('/api/staff-app/team-on-leave?from=2026-12-01&to=2026-12-31')->assertOk();
        $people = $response->json('data.people');

        $this->assertCount(1, $people, 'a peer, approved, in the range');
        $this->assertSame(['Peer Priya', '2026-12-01', '2026-12-02'], [$people[0]['name'], $people[0]['from'], $people[0]['to']]);
        $this->assertStringNotContainsString('Fever', $response->getContent());
        $this->assertStringNotContainsString('Casual', $response->getContent());
        $this->getJson('/api/staff-app/team-on-leave?from=2026-12-10&to=2026-12-01')->assertUnprocessable();
    }

    public function test_a_store_that_asks_for_a_selfie_refuses_a_punch_without_one_and_keeps_the_photo_private(): void
    {
        Storage::fake('local');
        $this->as($this->staffToken($this->staff, '+91 98765 43210'));

        // Off: a photo is optional and nothing is asked for.
        $this->postJson('/api/attendance/self-punch', ['type' => 'IN'])->assertOk();
        HrCheckin::query()->delete();
        Attendance::query()->delete();

        $this->store->update(['attendance_settings' => ['selfie_required' => true]]);
        $this->postJson('/api/attendance/self-punch', ['type' => 'IN'])->assertUnprocessable()
            ->assertJsonValidationErrors(['photo' => 'Take a photo of yourself to check in or out. Your store asks for one every time.']);
        $this->assertSame(0, HrCheckin::count());

        $big = UploadedFile::fake()->create('me.jpg', 400, 'image/jpeg');
        $this->post('/api/attendance/self-punch', ['type' => 'IN', 'photo' => $big], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors(['photo']);
        $pdf = UploadedFile::fake()->create('me.pdf', 20, 'application/pdf');
        $this->post('/api/attendance/self-punch', ['type' => 'IN', 'photo' => $pdf], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors(['photo']);

        $photo = UploadedFile::fake()->image('me.jpg', 300, 300)->size(120);
        $this->post('/api/attendance/self-punch', ['type' => 'IN', 'photo' => $photo], ['Accept' => 'application/json'])->assertOk();
        $punch = HrCheckin::firstOrFail();
        $this->assertStringStartsWith('hr-checkins/'.$this->store->id.'/', $punch->photo_path);
        Storage::disk('local')->assertExists($punch->photo_path);

        // HR may see the photo; the employee's own staff token may not fetch it, and there is no public link.
        $this->getJson("/api/attendance/punches/{$punch->id}/photo")->assertForbidden();
        $this->as($this->hr->createToken('web-token', ['client:web'])->plainTextToken);
        $this->get("/api/attendance/punches/{$punch->id}/photo")->assertOk()->assertHeader('Content-Type', 'image/jpeg');
        $row = collect($this->getJson('/api/attendance/punches?from='.now()->toDateString().'&to='.now()->addDay()->toDateString())->assertOk()->json('data'))->firstWhere('id', $punch->id);
        $this->assertTrue($row['has_photo']);
    }

    private function hrToken(): string
    {
        return $this->hr->createToken('web-token', ['client:web'])->plainTextToken;
    }

    public function test_hr_publishes_announcements_and_policies_and_each_employee_sees_only_theirs(): void
    {
        $dept = HrDepartment::create(['store_id' => $this->store->id, 'configuration_type' => 'department', 'name' => 'Sales']);
        $this->staff->update(['department_id' => $dept->id]);
        $today = Carbon::parse(app(AttendanceService::class)->today());

        $this->as($this->hrToken());
        $mk = fn (array $more) => $this->postJson('/api/company-announcements', $more + ['category' => 'ANNOUNCEMENT', 'body' => 'Please read.'])->assertCreated()->json('data');
        $all = $mk(['title' => 'Diwali timings', 'is_pinned' => true]);
        $policy = $mk(['title' => 'Dress code', 'category' => 'POLICY']);
        $mk(['title' => 'Sales only', 'department_id' => $dept->id]);
        $mk(['title' => 'Other department', 'department_id' => $dept->id + 999]);
        $mk(['title' => 'Next month', 'publish_on' => $today->copy()->addMonth()->toDateString()]);
        $mk(['title' => 'Old news', 'publish_on' => $today->copy()->subMonths(2)->toDateString(), 'expires_on' => $today->copy()->subMonth()->toDateString()]);
        $this->postJson('/api/company-announcements', ['category' => 'POLICY', 'title' => 'x', 'body' => 'y', 'publish_on' => '2026-12-10', 'expires_on' => '2026-12-01'])
            ->assertUnprocessable()->assertJsonValidationErrors(['expires_on' => 'The end date cannot be before the start date.']);

        $this->as($this->staffToken($this->staff, '+91 98765 43210'));
        $list = $this->getJson('/api/staff-company/announcements')->assertOk()->json('data');
        $this->assertSame(['Diwali timings', 'Dress code', 'Sales only'], collect($list['items'])->pluck('title')->sort()->values()->all());
        $this->assertSame('Diwali timings', $list['items'][0]['title'], 'pinned first');
        $this->assertSame([3, 1], [$list['unread'], $list['to_acknowledge']]);

        $this->postJson("/api/staff-company/announcements/{$all['id']}/read")->assertOk();
        $this->postJson("/api/staff-company/announcements/{$all['id']}/acknowledge")->assertUnprocessable()->assertJsonValidationErrors('announcement');
        $this->postJson("/api/staff-company/announcements/{$policy['id']}/acknowledge")->assertOk()->assertJsonPath('message', 'Thank you. Your agreement is recorded.');
        $after = $this->getJson('/api/staff-company/announcements')->assertOk()->json('data');
        $this->assertSame([1, 0], [$after['unread'], $after['to_acknowledge']]);

        $this->as($this->hrToken());
        $row = collect($this->getJson('/api/company-announcements')->assertOk()->json('data'))->keyBy('id');
        $this->assertSame([1, 0], [$row[$all['id']]['read_count'], $row[$all['id']]['agreed_count']]);
        $this->assertSame([1, 1], [$row[$policy['id']]['read_count'], $row[$policy['id']]['agreed_count']]);
    }

    public function test_only_hr_writes_announcements_and_a_staff_token_cannot_reach_hr_screens(): void
    {
        $cashier = $this->login('cashier', $this->store);
        $this->as($cashier->createToken('web-token', ['client:web'])->plainTextToken);
        $this->postJson('/api/company-announcements', ['category' => 'ANNOUNCEMENT', 'title' => 'Hello', 'body' => 'x'])->assertForbidden();
        $this->getJson('/api/helpdesk-tickets')->assertForbidden();
        $this->getJson('/api/employee-documents')->assertForbidden();

        $this->as($this->staffToken($this->staff, '+91 98765 43210'));
        $this->getJson('/api/company-announcements')->assertForbidden()->assertJsonPath('code', 'STAFF_APP_SCOPE');
        $this->getJson('/api/helpdesk-tickets')->assertForbidden();
    }

    public function test_helpdesk_an_employee_raises_a_ticket_hr_replies_and_the_employee_is_told(): void
    {
        $other = $this->employee('Other Omar', '98400 22222', $this->store);
        $token = $this->staffToken($this->staff, '+91 98765 43210');
        $this->as($token);
        $this->postJson('/api/staff-company/tickets', ['category' => 'PAYROLL', 'subject' => '', 'message' => ''])->assertUnprocessable()
            ->assertJsonValidationErrors(['subject' => 'Write a short title for your question.', 'message' => 'Write your question or problem.']);
        $ticket = $this->postJson('/api/staff-company/tickets', ['category' => 'PAYROLL', 'subject' => 'Missing travel allowance', 'message' => 'Not in October.'])->assertCreated()->json('data');
        $this->assertSame('OPEN', $ticket['status']);
        $theirs = HrTicket::create(['store_id' => $this->store->id, 'employee_id' => $other->id, 'category' => 'OTHER', 'subject' => 'Private', 'message' => 'Not yours', 'status' => 'OPEN']);

        $this->getJson("/api/staff-company/tickets/{$theirs->id}")->assertNotFound();
        $this->postJson("/api/staff-company/tickets/{$theirs->id}/reply", ['body' => 'hi'])->assertNotFound();
        $this->assertSame(['Missing travel allowance'], collect($this->getJson('/api/staff-company/tickets')->assertOk()->json('data'))->pluck('subject')->all());

        $this->as($this->hrToken());
        $inbox = $this->getJson('/api/helpdesk-tickets')->assertOk();
        $this->assertSame(2, $inbox->json('open'));
        $this->postJson("/api/helpdesk-tickets/{$ticket['id']}/reply", ['body' => ''])->assertUnprocessable()->assertJsonValidationErrors(['body' => 'Write your reply.']);
        $this->postJson("/api/helpdesk-tickets/{$ticket['id']}/reply", ['body' => 'We will add it in November.'])->assertOk()->assertJsonPath('data.status', 'IN_PROGRESS');
        $note = Notification::withoutGlobalScopes()->where('reference_type', 'HR_TICKET')->firstOrFail();
        $this->assertSame([$this->staff->fresh()->user_id, 'HR replied'], [$note->user_id, $note->title]);

        $this->as($token);
        $seen = $this->getJson("/api/staff-company/tickets/{$ticket['id']}")->assertOk()->json('data');
        $this->assertSame(['HR', 'We will add it in November.'], [$seen['replies'][0]['from'], $seen['replies'][0]['body']]);
        $this->postJson("/api/staff-company/tickets/{$ticket['id']}/reply", ['body' => 'Thank you.'])->assertOk();

        $this->as($this->hrToken());
        $this->putJson("/api/helpdesk-tickets/{$ticket['id']}/status", ['status' => 'CLOSED'])->assertOk()->assertJsonPath('data.status', 'CLOSED');
        $this->assertSame(2, Notification::withoutGlobalScopes()->where('reference_type', 'HR_TICKET')->count(), 'closing tells the employee too');
        $this->as($token);
        $this->postJson("/api/staff-company/tickets/{$ticket['id']}/reply", ['body' => 'Still missing.'])->assertOk()->assertJsonPath('data.status', 'OPEN');
    }

    public function test_the_directory_shows_colleagues_without_pay_and_celebrations_show_day_and_month_only(): void
    {
        $today = Carbon::parse(app(AttendanceService::class)->today());
        $this->staff->forceFill(['salary' => 45000, 'master_details' => ['date_of_birth' => $today->copy()->subYears(30)->addDays(3)->toDateString(), 'bank_account_no' => '123456789012']])->save();
        $this->lead->forceFill(['joining_date' => $today->copy()->subYears(4)->addDays(1)->toDateString()])->save();
        $far = $this->employee('Far Farid', '98400 55555', $this->store);
        $far->forceFill(['master_details' => ['date_of_birth' => $today->copy()->subYears(25)->addDays(40)->toDateString()]])->save();

        $this->as($this->staffToken($this->lead->fresh() ? $this->staff : $this->staff, '+91 98765 43210'));
        $directory = $this->getJson('/api/staff-company/directory')->assertOk();
        $this->assertContains('Lead Lakshmi', collect($directory->json('data'))->pluck('name')->all());
        $this->assertStringNotContainsString('45000', $directory->getContent());
        $this->assertStringNotContainsString('123456789012', $directory->getContent());
        $this->assertSame(['Lead Lakshmi'], collect($this->getJson('/api/staff-company/directory?q=Lakshmi')->json('data'))->pluck('name')->all());

        $items = collect($this->getJson('/api/staff-company/celebrations')->assertOk()->json('data.items'));
        $birthday = $items->firstWhere('type', 'BIRTHDAY');
        $this->assertSame('Staff Senthil', $birthday['name']);
        $this->assertSame($today->copy()->addDays(3)->toDateString(), $birthday['date'], 'the next one, this year: not the birth year');
        $this->assertNull($birthday['years']);
        $anniversary = $items->firstWhere('type', 'ANNIVERSARY');
        $this->assertSame(['Lead Lakshmi', 4], [$anniversary['name'], $anniversary['years']]);
        $this->assertNotContains('Far Farid', $items->pluck('name')->all(), 'more than two weeks away');
    }

    public function test_an_employee_downloads_only_their_own_documents_and_hr_manages_them(): void
    {
        Storage::fake('local');
        $this->as($this->hrToken());
        $file = UploadedFile::fake()->create('offer.pdf', 100, 'application/pdf');
        $doc = $this->post('/api/employee-documents', ['employee_id' => $this->staff->id, 'type' => 'OFFER_LETTER', 'title' => 'Offer letter', 'file' => $file], ['Accept' => 'application/json'])
            ->assertCreated()->json('data');
        $this->post('/api/employee-documents', ['employee_id' => $this->lead->id, 'type' => 'FORM_16', 'title' => 'Form 16 2025', 'file' => UploadedFile::fake()->create('f16.pdf', 50, 'application/pdf')], ['Accept' => 'application/json'])->assertCreated();
        $this->post('/api/employee-documents', ['employee_id' => $this->staff->id, 'type' => 'OTHER', 'title' => 'Script', 'file' => UploadedFile::fake()->create('x.exe', 5, 'application/octet-stream')], ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonValidationErrors(['file' => 'The file must be a PDF, JPG or PNG.']);
        $this->post('/api/employee-documents', ['employee_id' => $this->staff->id, 'type' => 'OTHER', 'title' => 'Big', 'file' => UploadedFile::fake()->create('big.pdf', 6000, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonValidationErrors(['file' => 'The file is too big. Keep it under 5 MB.']);
        $this->assertCount(2, $this->getJson('/api/employee-documents')->assertOk()->json('data'));
        $this->assertStringStartsWith('hr-documents/'.$this->store->id.'/', HrDocument::find($doc['id'])->file_path);

        $this->as($this->staffToken($this->staff, '+91 98765 43210'));
        $mine = $this->getJson('/api/staff-company/documents')->assertOk()->json('data');
        $this->assertSame(['Offer letter'], collect($mine)->pluck('title')->all());
        $this->assertArrayNotHasKey('file_path', $mine[0]);
        $this->get("/api/staff-company/documents/{$doc['id']}/download")->assertOk()->assertDownload('Offer letter.pdf');
        $leadDoc = HrDocument::where('title', 'Form 16 2025')->firstOrFail();
        $this->getJson("/api/staff-company/documents/{$leadDoc->id}/download")->assertNotFound();

        $this->as($this->hrToken());
        $path = HrDocument::find($doc['id'])->file_path;
        $this->deleteJson("/api/employee-documents/{$doc['id']}")->assertOk();
        Storage::disk('local')->assertMissing($path);
    }

    public function test_a_refused_punch_leaves_no_photo_behind(): void
    {
        Storage::fake('local');
        $this->as($this->staffToken($this->staff, '+91 98765 43210'));
        $photo = UploadedFile::fake()->image('me.jpg', 300, 300)->size(100);

        // Checking out with no check in is refused.
        $this->post('/api/attendance/self-punch', ['type' => 'OUT', 'photo' => $photo], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->assertSame([], Storage::disk('local')->allFiles());
    }
}
