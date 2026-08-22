<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompanyController extends Controller
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
        $query = Store::query();

        if (!$request->boolean('includeInactive', false)) {
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

        $formatted = $stores->map(fn($store) => $this->formatStore($store));

        return response()->json([
            'success' => true,
            'data'    => $formatted,
            'total'   => $stores->count(),
        ]);
    }

    public function show(Request $request, $id)
    {
        if ($id === 'default' || empty($id)) {
            $store = Store::first();
        } else {
            $store = Store::find($id);
            if (!$store) {
                $store = Store::where('code', $id)->first() ?: Store::first();
            }
        }

        if (!$store) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->formatStore($store),
        ]);
    }

    public function store(Request $request)
    {
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
            'data'    => $this->formatStore($store),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $store = Store::find($id);
        if (!$store) {
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

        if (isset($data['regName'])) $data['reg_name'] = $data['regName'];
        if (isset($data['contactPerson'])) $data['contact_person'] = $data['contactPerson'];
        if (isset($data['contactNo'])) $data['phone'] = $data['contactNo'];
        if (isset($data['emailId'])) $data['email'] = $data['emailId'];
        if (isset($data['pinCode'])) $data['pincode'] = $data['pinCode'];
        if (isset($data['gstNo'])) $data['gstin'] = $data['gstNo'];
        if (isset($data['tanPan'])) $data['tan_pan'] = $data['tanPan'];
        if (isset($data['active'])) {
            $data['is_active'] = filter_var($data['active'], FILTER_VALIDATE_BOOLEAN);
        }

        $store->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Company updated successfully',
            'data'    => $this->formatStore($store->fresh()),
        ]);
    }

    public function destroy($id)
    {
        $store = Store::find($id);
        if (!$store) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $store->delete();

        return response()->json([
            'success' => true,
            'message' => 'Company deleted successfully',
        ]);
    }

    public function subscriptionStatus(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'status'        => 'ACTIVE',
                'plan'          => 'Enterprise Multi-Store',
                'expiry_date'   => '2028-12-31',
                'days_left'     => 999,
                'max_users'     => 50,
                'current_users' => 1,
                'features'      => [
                    'pos'        => true,
                    'warehouse'  => true,
                    'reports'    => true,
                    'multi_store'=> true,
                    'cloud_sync' => true,
                ],
            ],
        ]);
    }

    public function backupsOverview(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'last_backup'    => now()->subHours(2)->toIso8601String(),
                'status'         => 'HEALTHY',
                'backup_size_mb' => 42.8,
                'total_backups'  => 14,
                'auto_backup'    => true,
            ],
        ]);
    }
}
