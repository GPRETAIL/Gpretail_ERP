<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SystemConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConfigurationController extends Controller
{
    /**
     * Real counters live in system_configurations (key='counter') - the
     * same generic store the Configuration master page (type=COUNTER)
     * already writes to. This used to be a hardcoded pair of fake
     * counters that never reflected anything a user actually configured.
     */
    public function getCounters(Request $request)
    {
        $rows = SystemConfiguration::where('key', 'counter')
            ->orWhere('config_key', 'counter')
            ->orWhere('group', 'counter')
            ->orWhere('group_name', 'counter')
            ->get()
            ->map(fn ($c) => [
                'id'   => $c->id,
                'name' => $c->value ?? $c->config_value,
            ]);

        return response()->json([
            'success' => true,
            'data'    => $rows,
            'total'   => $rows->count(),
        ]);
    }

    public function index(Request $request)
    {
        $configs = SystemConfiguration::all();
        return response()->json([
            'success' => true,
            'data'    => $configs,
            'total'   => $configs->count(),
        ]);
    }

    public function show(Request $request, $key)
    {
        $normalized = strtolower(str_replace('-', '_', $key));

        // Default lookups for common configuration types
        $defaults = [
            'city' => [
                ['id' => 1, 'name' => 'Chennai', 'value' => 'Chennai'],
                ['id' => 2, 'name' => 'Coimbatore', 'value' => 'Coimbatore'],
                ['id' => 3, 'name' => 'Madurai', 'value' => 'Madurai'],
                ['id' => 4, 'name' => 'Tirupur', 'value' => 'Tirupur'],
                ['id' => 5, 'name' => 'Salem', 'value' => 'Salem'],
            ],
            'state' => [
                ['id' => 1, 'name' => 'Tamil Nadu', 'value' => 'Tamil Nadu', 'code' => '33'],
                ['id' => 2, 'name' => 'Karnataka', 'value' => 'Karnataka', 'code' => '29'],
                ['id' => 3, 'name' => 'Kerala', 'value' => 'Kerala', 'code' => '32'],
                ['id' => 4, 'name' => 'Andhra Pradesh', 'value' => 'Andhra Pradesh', 'code' => '37'],
            ],
            'country' => [
                ['id' => 1, 'name' => 'India', 'value' => 'India', 'code' => 'IN'],
            ],
            'bank' => [
                ['id' => 1, 'name' => 'State Bank of India', 'value' => 'SBI'],
                ['id' => 2, 'name' => 'HDFC Bank', 'value' => 'HDFC'],
                ['id' => 3, 'name' => 'ICICI Bank', 'value' => 'ICICI'],
                ['id' => 4, 'name' => 'Axis Bank', 'value' => 'AXIS'],
            ],
            'card_types' => [
                ['id' => 1, 'name' => 'Visa', 'value' => 'Visa'],
                ['id' => 2, 'name' => 'MasterCard', 'value' => 'MasterCard'],
                ['id' => 3, 'name' => 'RuPay', 'value' => 'RuPay'],
            ],
            'upi_provider' => [
                ['id' => 1, 'name' => 'Google Pay', 'value' => 'Google Pay'],
                ['id' => 2, 'name' => 'PhonePe', 'value' => 'PhonePe'],
                ['id' => 3, 'name' => 'Paytm', 'value' => 'Paytm'],
                ['id' => 4, 'name' => 'BHIM UPI', 'value' => 'BHIM UPI'],
            ],
            'bundle_rack' => [
                ['id' => 1, 'name' => 'Rack A-1', 'value' => 'Rack A-1'],
                ['id' => 2, 'name' => 'Rack A-2', 'value' => 'Rack A-2'],
                ['id' => 3, 'name' => 'Rack B-1', 'value' => 'Rack B-1'],
            ],
            'location' => [
                ['id' => 1, 'name' => 'Main Warehouse Floor', 'value' => 'Main Floor'],
                ['id' => 2, 'name' => 'Mezzanine Storage', 'value' => 'Mezzanine'],
            ],
            'agent_type' => [
                ['id' => 1, 'name' => 'Direct Sales Agent', 'value' => 'DIRECT'],
                ['id' => 2, 'name' => 'Wholesale Broker', 'value' => 'BROKER'],
            ],
        ];

        // Check if exists in database
        $dbConfigs = SystemConfiguration::where('key', $normalized)
            ->orWhere('config_key', $normalized)
            ->orWhere('group', $normalized)
            ->orWhere('group_name', $normalized)
            ->get();

        if ($dbConfigs->isNotEmpty()) {
            $data = $dbConfigs->map(function ($c) {
                return [
                    'id'         => $c->id,
                    'name'       => $c->value ?? $c->config_value,
                    'value'      => $c->value ?? $c->config_value,
                    'key'        => $c->key ?? $c->config_key,
                    'code'       => $c->code,
                    'sort_order' => $c->sort_order,
                    'extra_data' => $c->extra_data,
                ];
            });

            return response()->json([
                'success' => true,
                'data'    => $data,
                'total'   => $data->count(),
            ]);
        }

        if (isset($defaults[$normalized])) {
            return response()->json([
                'success' => true,
                'data'    => $defaults[$normalized],
                'total'   => count($defaults[$normalized]),
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => [],
            'total'   => 0,
        ]);
    }

    public function store(Request $request)
    {
        $key = $request->input('key') ?? $request->input('config_key') ?? $request->input('type') ?? 'general';
        $val = $request->input('value') ?? $request->input('config_value') ?? $request->input('name');
        $group = $request->input('group') ?? $request->input('group_name') ?? $key;

        $config = SystemConfiguration::create([
            'key'          => $key,
            'config_key'   => $key,
            'value'        => is_array($val) ? json_encode($val) : (string)$val,
            'config_value' => is_array($val) ? json_encode($val) : (string)$val,
            'group'        => $group,
            'group_name'   => $group,
            'code'         => $request->input('code'),
            'sort_order'   => $request->input('sort_order', 0),
            'extra_data'   => $request->input('extra_data'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Configuration saved successfully',
            'data'    => $config,
        ], 201);
    }

    public function storeType(Request $request, $type)
    {
        $request->merge(['key' => $type, 'group' => $type]);
        return $this->store($request);
    }

    public function updateType(Request $request, $type, $id)
    {
        $config = SystemConfiguration::find($id);
        if ($config) {
            $val = $request->input('value') ?? $request->input('config_value') ?? $request->input('name') ?? $config->value;
            $config->update([
                'value'        => is_array($val) ? json_encode($val) : (string)$val,
                'config_value' => is_array($val) ? json_encode($val) : (string)$val,
                'code'         => $request->input('code', $config->code),
                'sort_order'   => $request->input('sort_order', $config->sort_order),
                'extra_data'   => $request->input('extra_data', $config->extra_data),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Configuration updated successfully',
            'data'    => $config,
        ]);
    }

    /**
     * Single-record fetch for the Configuration master page's edit form (code/name/sort_order/
     * extra_data) -- was missing entirely, so the frontend's GET to this exact URL shape 404'd
     * and every edit failed with "Failed to load record" before any field even populated.
     */
    public function showType(Request $request, $type, $id)
    {
        $config = SystemConfiguration::find($id);
        if (!$config) {
            return response()->json(['success' => false, 'message' => 'Configuration not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'         => $config->id,
                'code'       => $config->code,
                'name'       => $config->value ?? $config->config_value,
                'sort_order' => $config->sort_order,
                'extra_data' => $config->extra_data,
            ],
        ]);
    }

    public function destroyType(Request $request, $type, $id)
    {
        $config = SystemConfiguration::find($id);
        if ($config) {
            $config->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Configuration deleted successfully',
        ]);
    }
}
