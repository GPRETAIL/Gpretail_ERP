<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivation;
use App\Models\Store;
use App\Services\StoreContext;
use App\Services\StoreLicenceVerifier;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StoreController extends Controller
{
    /**
     * Format a store record for consistent frontend consumption.
     */
    protected function formatStore(Store $store): array
    {
        $data = $store->toArray();

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
        $data = $request->all();

        // Handle uploaded logo file
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('companies', 'public');
            $data['logo'] = Storage::url($path);
        }

        if (isset($data['printerConfigurations']) && is_string($data['printerConfigurations'])) {
            $data['printer_configurations'] = json_decode($data['printerConfigurations'], true) ?: [];
        }

        if (isset($data['active'])) {
            $data['is_active'] = filter_var($data['active'], FILTER_VALIDATE_BOOLEAN);
        }

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

        $data = $request->all();

        // Handle uploaded logo file
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('companies', 'public');
            $data['logo'] = Storage::url($path);
        }

        if (isset($data['printerConfigurations']) && is_string($data['printerConfigurations'])) {
            $data['printer_configurations'] = json_decode($data['printerConfigurations'], true) ?: [];
        }

        if (isset($data['regName'])) {
            $data['reg_name'] = $data['regName'];
        }
        if (isset($data['contactPerson'])) {
            $data['contact_person'] = $data['contactPerson'];
        }
        if (isset($data['contactNo'])) {
            $data['phone'] = $data['contactNo'];
        }
        if (isset($data['emailId'])) {
            $data['email'] = $data['emailId'];
        }
        if (isset($data['pinCode'])) {
            $data['pincode'] = $data['pinCode'];
        }
        if (isset($data['gstNo'])) {
            $data['gstin'] = $data['gstNo'];
        }
        if (isset($data['tanPan'])) {
            $data['tan_pan'] = $data['tanPan'];
        }
        if (isset($data['active'])) {
            $data['is_active'] = filter_var($data['active'], FILTER_VALIDATE_BOOLEAN);
        }

        foreach (['platform_store_id', 'platform_company_code', 'activation_required', 'activated_at', 'platform_active_till', 'platform_licence_token', 'platform_subscription'] as $field) {
            unset($data[$field]);
        }
        if ($store->platform_store_id) {
            foreach (['code', 'is_active', 'name'] as $field) {
                unset($data[$field]);
            }
        }
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

        abort_if($store->platform_store_id, 403, 'Delete managed stores in GP Admin.');
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
            $end = isset($verified['claims']['activeTill']) ? Carbon::createFromTimestamp($verified['claims']['activeTill']) : ($store->platform_active_till ?? $activation?->active_till);
            $days = $end ? (int) ceil(now()->diffInSeconds($end, false) / 86400) : null;

            return ['store_id' => $store->id, 'name' => $store->name, 'code' => $store->code,
                'status' => ! $store->platform_store_id ? 'UNMANAGED' : (! $store->activated_at ? 'PENDING_ACTIVATION' : ($verified['ok'] ? 'ACTIVE' : 'ACCESS_BLOCKED')),
                'licence_valid' => $verified['ok'] || ($activation && $activation->activated), 'plan' => $store->platform_subscription['plan_name'] ?? ($activation?->licence_state ?? 'TRIAL'),
                'term_months' => $store->platform_subscription['term_months'] ?? null,
                'expiry_date' => $end?->toIso8601String(), 'days_left' => $days,
                'entitlements' => $verified['claims']['entitlements'] ?? [],
                'onTrial' => ($store->activated_at && (bool) ($store->platform_subscription['is_trial'] ?? false)) || ($activation && ($activation->licence_state === 'TRIAL' || ($days !== null && $days <= 14)))];
        });
        $soonest = $stores->pluck('days_left')->filter(fn ($value) => $value !== null)->min();

        return response()->json(['success' => true, 'data' => [
            'status' => $stores->isEmpty() ? 'NO_STORES' : ($stores->every(fn ($store) => $store['licence_valid']) ? 'ACTIVE' : 'ATTENTION_REQUIRED'),
            'stores' => $stores, 'onTrial' => $stores->contains(fn ($store) => $store['onTrial']),
            'dueSoon' => $soonest !== null && $soonest <= 7, 'soonestDaysLeft' => $soonest,
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
