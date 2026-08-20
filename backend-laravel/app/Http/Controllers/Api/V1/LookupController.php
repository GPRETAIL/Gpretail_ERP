<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Employee;
use App\Models\HrDesignation;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Tax;
use App\Models\Transport;
use App\Models\TransportEntry;
use Illuminate\Http\Request;

class LookupController extends Controller
{
    /**
     * Consolidated batch lookup endpoint for high-speed master dropdown loading.
     * Supports: ?keys=companies,suppliers,transports,taxes,agents,cities,bundle_racks,divisions,designations,employees,next_lr
     * Or modules: ?module=transport_entry, ?module=invoice_entry
     */
    public function index(Request $request)
    {
        $module = $request->input('module');
        $keys = $request->input('keys');

        if ($keys) {
            $requestedKeys = is_array($keys) ? $keys : explode(',', $keys);
            $requestedKeys = array_map('trim', $requestedKeys);
        } elseif ($module === 'transport_entry') {
            $requestedKeys = ['companies', 'suppliers', 'agents', 'transports', 'cities', 'bundle_racks', 'divisions', 'designations', 'employees', 'next_lr'];
        } elseif ($module === 'invoice_entry') {
            $requestedKeys = ['taxes', 'companies', 'suppliers', 'transports'];
        } else {
            $requestedKeys = ['companies', 'suppliers', 'transports', 'taxes'];
        }

        $data = [];

        foreach ($requestedKeys as $key) {
            try {
                switch ($key) {
                    case 'companies':
                        $data['companies'] = Store::where('is_active', true)
                            ->select(['id', 'name', 'code'])
                            ->orderBy('name')
                            ->get();
                        break;

                    case 'suppliers':
                        $data['suppliers'] = Supplier::where('is_active', true)
                            ->select(['id', 'name', 'code', 'phone'])
                            ->orderBy('name')
                            ->limit(100)
                            ->get();
                        break;

                    case 'transports':
                        $data['transports'] = Transport::where('is_active', true)
                            ->select(['id', 'name', 'code', 'phone'])
                            ->orderBy('name')
                            ->get();
                        break;

                    case 'taxes':
                        $data['taxes'] = Tax::where('is_active', true)
                            ->select(['id', 'name', 'rate'])
                            ->orderBy('name')
                            ->get()
                            ->map(function ($t) {
                                $t->tax_percentage = (float) $t->rate;
                                return $t;
                            });
                        break;

                    case 'agents':
                        $data['agents'] = Agent::where('is_active', true)
                            ->select(['id', 'name', 'code'])
                            ->orderBy('name')
                            ->get();
                        break;

                    case 'cities':
                        $cityRes = app(ConfigurationController::class)->show($request, 'city');
                        $data['cities'] = $cityRes->getData()->data ?? [];
                        break;

                    case 'bundle_racks':
                        $brRes = app(ConfigurationController::class)->show($request, 'bundle_rack');
                        $data['bundle_racks'] = $brRes->getData()->data ?? [];
                        break;

                    case 'divisions':
                        $divRes = app(ProductAttributeController::class)->indexByType($request, 'division');
                        $data['divisions'] = $divRes->getData()->data ?? [];
                        break;

                    case 'designations':
                        $data['designations'] = HrDesignation::select(['id', 'name', 'code'])
                            ->orderBy('name')
                            ->get();
                        break;

                    case 'employees':
                        $data['employees'] = Employee::with('designation:id,name,code')
                            ->select(['id', 'name', 'employee_code', 'designation_id'])
                            ->orderBy('name')
                            ->limit(100)
                            ->get()
                            ->map(function ($e) {
                                $designationName = $e->designation?->name ?? '';
                                $e->designation = [
                                    'id'        => $e->designation_id,
                                    'name'      => $designationName,
                                    'role_name' => $designationName,
                                ];
                                return $e;
                            });
                        break;

                    case 'next_lr':
                        $latest = TransportEntry::max('id') ?: 0;
                        $data['next_lr'] = 'LR-' . date('Ymd') . '-' . str_pad($latest + 1, 4, '0', STR_PAD_LEFT);
                        break;
                }
            } catch (\Throwable $e) {
                $data[$key] = [];
            }
        }

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }
}
