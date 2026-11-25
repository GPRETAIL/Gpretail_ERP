<?php

namespace App\Http\Controllers\Api\V1\Settings;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivation;
use App\Models\Store;
use App\Services\Platform\StoreLicenceVerifier;
use App\Services\Tenancy\StoreContext;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StoreController extends Controller
{
    /** Details Vynerix Admin owns for a store it provisioned. They come in with the sync and are never edited here. */
    public const PLATFORM_LOCKED = ['code', 'name', 'is_active', 'reg_name', 'gstin', 'address', 'location', 'phone', 'city', 'state', 'country', 'pincode'];

    /** Screen field name => column, for the fields the Company page sends in camelCase. */
    private const CAMEL_COLUMNS = [
        'regName' => 'reg_name', 'contactPerson' => 'contact_person', 'contactNo' => 'phone', 'emailId' => 'email',
        'pinCode' => 'pincode', 'gstNo' => 'gstin', 'tanPan' => 'tan_pan', 'gstUsername' => 'gst_username',
        'einvoiceUsername' => 'einvoice_username', 'einvoicePassword' => 'einvoice_password', 'gstAccessKey' => 'gst_access_key',
        'pfEsiNo' => 'pf_esi_no', 'bankAccountName' => 'bank_account_name', 'accountNo' => 'account_no',
        'internalVendorMargin' => 'internal_vendor_margin', 'asSupplier' => 'as_supplier', 'asCustomer' => 'as_customer',
    ];

    /** Secrets are kept when the screen sends them blank (a role that is not shown them cannot send them back). */
    private const KEEP_WHEN_BLANK = ['einvoice_password', 'gst_access_key'];

    /**
     * Format a store record for consistent frontend consumption.
     */
    protected function formatStore(Store $store): array
    {
        $data = $store->toArray();
        if (! in_array(request()->user()?->role, ['admin', 'super_admin'], true)) {
            unset($data['einvoice_password'], $data['gst_access_key']);
        }

        // Provide camelCase aliases alongside snake_case for UI components
        $data['regName'] = $store->reg_name;
        $data['contactPerson'] = $store->contact_person;
        $data['contactNo'] = $store->phone;
        $data['adminName'] = $store->admin_name;
        $data['adminEmail'] = $store->admin_email ?: $store->email;
        $data['emailId'] = $store->email;
        $data['pinCode'] = $store->pincode;
        $data['gstNo'] = $store->gstin;
        $data['tanPan'] = $store->tan_pan;
        $data['active'] = (bool) $store->is_active;
        $data['asSupplier'] = (bool) $store->as_supplier;
        $data['asCustomer'] = (bool) $store->as_customer;
        $data['printerConfigurations'] = $store->printer_configurations ?: [];
        $data['vx_admin_managed'] = (bool) $store->platform_store_id;
        $data['locked_fields'] = $store->platform_store_id ? self::PLATFORM_LOCKED : [];
        $data['receiptCustomization'] = $store->receipt_customization ?: [];
        $data['barcodeCustomization'] = $store->barcode_customization ?: [];

        return $data;
    }

    public function index(Request $request)
    {
        $query = app(StoreContext::class)->available($request->user());

        if (! $request->boolean('includeInactive', false)) {
            $query->where('is_active', true);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('reg_name', 'like', "%{$search}%");
            });
        }

        $limit = $request->integer('limit', 500);
        $stores = $query->orderBy('id')->limit($limit)->get();

        $formatted = $stores->map(fn ($store) => $this->formatStore($store));

        return response()->json([
            'success' => true,
            'data' => $formatted,
            'total' => $stores->count(),
        ]);
    }

    public function show(Request $request, $id)
    {
        if ($id === 'default' || empty($id)) {
            $store = app(StoreContext::class)->selected($request->user());
        } else {
            $store = app(StoreContext::class)->available($request->user())
                ->where(fn ($query) => $query->where('id', $id)->orWhere('code', $id))->first();
        }

        if (! $store) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatStore($store),
        ]);
    }

    public function store(Request $request)
    {
        abort_if(PlatformActivation::current()?->activated, 403, 'Create stores in GP Admin, then activate them here.');
        abort_if($request->has('theme_customization'), 422, 'Manage branding through the dedicated theme endpoint so permissions, contrast and history are enforced.');
        $data = $request->all();

        // Validate and handle uploaded logo file
        if ($request->hasFile('logo')) {
            $request->validate([
                'logo' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            ]);
            $path = $request->file('logo')->store('companies', 'public');
            $data['logo'] = Storage::url($path);
        }

        if (isset($data['printerConfigurations']) && is_string($data['printerConfigurations'])) {
            $data['printer_configurations'] = json_decode($data['printerConfigurations'], true) ?: [];
        }

        if (isset($data['active'])) {
            $data['is_active'] = filter_var($data['active'], FILTER_VALIDATE_BOOLEAN);
        }

        foreach (['platform_store_id', 'platform_company_code', 'activation_required', 'activated_at', 'platform_active_till', 'platform_licence_token', 'platform_subscription'] as $field) {
            unset($data[$field]);
        }
        $data = array_intersect_key($data, array_flip((new Store)->getFillable()));
        $store = Store::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Company created successfully',
            'data' => $this->formatStore($store),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $store = app(StoreContext::class)->available($request->user())->find($id);
        if (! $store) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        abort_if($request->has('theme_customization'), 422, 'Manage branding through the dedicated theme endpoint so permissions, contrast and history are enforced.');
        $data = $request->all();

        // Validate and handle uploaded logo file
        if ($request->hasFile('logo')) {
            $request->validate([
                'logo' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            ]);
            $path = $request->file('logo')->store('companies', 'public');
            $data['logo'] = Storage::url($path);
        }

        if (isset($data['printerConfigurations']) && is_string($data['printerConfigurations'])) {
            $data['printer_configurations'] = json_decode($data['printerConfigurations'], true) ?: [];
        }

        foreach (self::CAMEL_COLUMNS as $field => $column) {
            if (! array_key_exists($field, $data)) {
                continue;
            }
            $value = $data[$field];
            if (in_array($column, self::KEEP_WHEN_BLANK, true) && trim((string) $value) === '') {
                continue;
            }
            if (in_array($column, ['as_supplier', 'as_customer'], true)) {
                $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
            } elseif ($column === 'internal_vendor_margin') {
                $value = trim((string) $value) === '' ? null : $value;
            }
            $data[$column] = $value;
        }
        if (isset($data['emailId'])) {
            $data['email'] = $data['emailId'];
        }
        if (isset($data['active'])) {
            $data['is_active'] = filter_var($data['active'], FILTER_VALIDATE_BOOLEAN);
        }

        foreach (['platform_store_id', 'platform_company_code', 'activation_required', 'activated_at', 'platform_active_till', 'platform_licence_token', 'platform_subscription'] as $field) {
            unset($data[$field]);
        }
        if ($store->platform_store_id) {
            // Vynerix Admin owns these; the store keeps whatever the last sync brought in. Its admin login is managed there too.
            foreach ([...self::PLATFORM_LOCKED, 'admin_name', 'admin_email', 'admin_password'] as $field) {
                unset($data[$field]);
            }
        }
        $data = array_intersect_key($data, array_flip($store->getFillable()));
        $store->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Company updated successfully',
            'data' => $this->formatStore($store->fresh()),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $store = app(StoreContext::class)->available($request->user())->find($id);
        if (! $store) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        abort_if(! empty($store->platform_store_id), 403, 'Delete managed stores in GP Admin.');
        $store->delete();

        return response()->json([
            'success' => true,
            'message' => 'Company deleted successfully',
        ]);
    }

    public function subscriptionStatus(Request $request)
    {
        $activation = PlatformActivation::current();
        $stores = app(StoreContext::class)->available($request->user())->get()->map(function (Store $store) use ($activation): array {
            $verified = $store->platform_store_id ? app(StoreLicenceVerifier::class)->verify($store, $activation) : ['ok' => false, 'claims' => []];
            $end = isset($verified['claims']['activeTill']) ? Carbon::createFromTimestamp($verified['claims']['activeTill']) : $store->platform_active_till;
            // Round away from today: a store that lapsed a few hours ago is -1 (expired), not
            // ceil(-0.4) = 0, which the UI used to show as "Expires today" / "DUE · 0d".
            $seconds = $end ? now()->diffInSeconds($end, false) : null;
            $days = $seconds === null ? null : (int) ($seconds > 0 ? ceil($seconds / 86400) : floor($seconds / 86400));

            return ['store_id' => $store->id, 'name' => $store->name, 'code' => $store->code,
                'status' => ! $store->platform_store_id ? 'UNMANAGED' : (! $store->activated_at ? 'PENDING_ACTIVATION' : ($verified['ok'] ? 'ACTIVE' : 'ACCESS_BLOCKED')),
                'licence_valid' => $verified['ok'], 'plan' => $store->platform_subscription['plan_name'] ?? null,
                'term_months' => $store->platform_subscription['term_months'] ?? null,
                'expiry_date' => $end?->toIso8601String(), 'days_left' => $days,
                'expired' => $store->platform_store_id && $store->activated_at && ($days !== null ? $days < 0 : ! $verified['ok']),
                'entitlements' => $verified['claims']['entitlements'] ?? [],
                'onTrial' => $store->activated_at && (bool) ($store->platform_subscription['is_trial'] ?? false)];
        });
        $soonest = $stores->pluck('days_left')->filter(fn ($value) => $value !== null)->min();

        return response()->json(['success' => true, 'data' => [
            'status' => $stores->isEmpty() ? 'NO_STORES' : ($stores->every(fn ($store) => $store['licence_valid']) ? 'ACTIVE' : 'ATTENTION_REQUIRED'),
            'stores' => $stores, 'onTrial' => $stores->contains(fn ($store) => $store['onTrial']),
            'dueSoon' => $soonest !== null && $soonest <= 7, 'soonestDaysLeft' => $soonest,
            'expiredStores' => $stores->where('expired', true)->count(),
            'allExpired' => $stores->isNotEmpty() && $stores->every(fn ($store) => $store['expired']),
            'subscription_portal_url' => config('platform.portal_url'), 'last_synced_at' => $activation?->last_synced_at?->toIso8601String(),
        ]]);
    }

    public function backupsOverview(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'last_backup' => now()->subHours(2)->toIso8601String(),
                'status' => 'HEALTHY',
                'backup_size_mb' => 42.8,
                'total_backups' => 14,
                'auto_backup' => true,
            ],
        ]);
    }
}
