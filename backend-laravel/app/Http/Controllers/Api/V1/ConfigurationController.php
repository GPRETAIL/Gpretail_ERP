<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ImportsMasterRows;
use App\Http\Controllers\Controller;
use App\Models\SystemConfiguration;
use App\Services\PaginationService;
use Illuminate\Http\Request;

class ConfigurationController extends Controller
{
    use ImportsMasterRows;

    public function __construct(private readonly PaginationService $paginationService) {}

    /**
     * Real counters live in system_configurations (key='counter') - the
     * same generic store the Configuration master page (type=COUNTER)
     * already writes to. This used to be a hardcoded pair of fake
     * counters that never reflected anything a user actually configured.
     */
    public function getCounters(Request $request)
    {
        if ($request->boolean('paginate')) {
            return $this->show($request, 'counter');
        }
        $rows = SystemConfiguration::where('key', 'counter')
            ->orWhere('config_key', 'counter')
            ->orWhere('group', 'counter')
            ->orWhere('group_name', 'counter')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->value ?? $c->config_value,
            ]);

        return response()->json([
            'success' => true,
            'data' => $rows,
            'total' => $rows->count(),
        ]);
    }

    public function index(Request $request)
    {
        $configs = SystemConfiguration::all();

        return response()->json([
            'success' => true,
            'data' => $configs,
            'total' => $configs->count(),
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

        // The listing explicitly opts in; dropdown lookups keep their legacy response.
        if ($request->boolean('paginate')) {
            $query = SystemConfiguration::where(function ($q) use ($normalized) {
                $q->where('key', $normalized)->orWhere('config_key', $normalized)
                    ->orWhere('group', $normalized)->orWhere('group_name', $normalized);
            });
            if (! $query->exists() && isset($defaults[$normalized])) {
                $rows = collect($defaults[$normalized])->map(fn ($row) => array_replace(['is_active' => true, 'created_by' => null, 'company_id' => null], $row));
                $search = strtolower((string) $request->input('search', ''));
                if ($search !== '') {
                    $rows = $rows->filter(fn ($row) => str_contains(strtolower($row['name'].' '.($row['code'] ?? '')), $search))->values();
                }
                $limit = max(1, min((int) $request->input('limit', 20), (int) config('pagination.max_limit', 200)));
                $page = max(1, (int) $request->input('page', 1));
                $total = $rows->count();
                $pages = max(1, (int) ceil($total / $limit));

                return response()->json([
                    'success' => true, 'data' => $rows->slice(($page - 1) * $limit, $limit)->values(),
                    'pagination' => ['mode' => 'offset', 'page' => $page, 'per_page' => $limit, 'total' => $total,
                        'total_pages' => $pages, 'has_next' => $page < $pages, 'has_previous' => $page > 1],
                ]);
            }
            if ($request->filled('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('value', 'like', "%{$search}%")->orWhere('config_value', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            }
            $result = $this->paginationService->paginate($query, 'configurations', $request, [
                'default_sort' => 'id', 'default_order' => 'asc',
                'allowed_sorts' => ['id', 'code', 'sort_order'],
            ]);
            $result['data'] = collect($result['data'])->map(fn ($c) => [
                'id' => $c->id, 'name' => $c->value ?? $c->config_value,
                'value' => $c->value ?? $c->config_value, 'key' => $c->key ?? $c->config_key,
                'is_active' => $c->is_active, 'created_by' => $c->created_by, 'company_id' => $c->store_id, 'store_id' => $c->store_id,
                'code' => $c->code, 'sort_order' => $c->sort_order, 'extra_data' => $c->extra_data,
            ]);

            return response()->json($result);
        }

        // Check if exists in database
        $dbConfigs = SystemConfiguration::where('key', $normalized)
            ->orWhere('config_key', $normalized)
            ->orWhere('group', $normalized)
            ->orWhere('group_name', $normalized)
            ->get();

        if ($dbConfigs->isNotEmpty()) {
            $data = $dbConfigs->map(function ($c) {
                return [
                    'id' => $c->id,
                    'name' => $c->value ?? $c->config_value,
                    'value' => $c->value ?? $c->config_value,
                    'key' => $c->key ?? $c->config_key,
                    'is_active' => $c->is_active,
                    'created_by' => $c->created_by,
                    'company_id' => $c->store_id,
                    'store_id' => $c->store_id,
                    'code' => $c->code,
                    'sort_order' => $c->sort_order,
                    'extra_data' => $c->extra_data,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $data,
                'total' => $data->count(),
            ]);
        }

        if (isset($defaults[$normalized])) {
            return response()->json([
                'success' => true,
                'data' => $defaults[$normalized],
                'total' => count($defaults[$normalized]),
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [],
            'total' => 0,
        ]);
    }

    public function store(Request $request)
    {
        $key = $request->input('key') ?? $request->input('config_key') ?? $request->input('type') ?? 'general';
        $val = $request->input('value') ?? $request->input('config_value') ?? $request->input('name');
        $group = $request->input('group') ?? $request->input('group_name') ?? $key;

        $config = SystemConfiguration::create([
            'key' => $key,
            'config_key' => $key,
            'value' => is_array($val) ? json_encode($val) : (string) $val,
            'config_value' => is_array($val) ? json_encode($val) : (string) $val,
            'group' => $group,
            'group_name' => $group,
            'code' => $request->input('code') ?: strtoupper(substr($key, 0, 5)).'_'.strtoupper(substr(uniqid(), -8)),
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $request->input('sort_order', 0),
            'extra_data' => $request->input('extra_data'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Configuration saved successfully',
            'data' => $config,
        ], 201);
    }

    public function storeType(Request $request, $type)
    {
        $request->merge(['key' => $type, 'group' => $type]);

        return $this->store($request);
    }

    public function updateType(Request $request, $type, $id)
    {
        $config = SystemConfiguration::where(function ($query) use ($type): void {
            $normalized = strtolower(str_replace('-', '_', $type));
            $query->where('key', $normalized)->orWhere('config_key', $normalized)->orWhere('group', $normalized)->orWhere('group_name', $normalized);
        })->find($id);
        if (! $config) {
            return response()->json(['success' => false, 'message' => 'Configuration not found'], 404);
        }
        if ($config) {
            $val = $request->input('value') ?? $request->input('config_value') ?? $request->input('name') ?? $config->value;
            $config->update([
                'value' => is_array($val) ? json_encode($val) : (string) $val,
                'config_value' => is_array($val) ? json_encode($val) : (string) $val,
                'code' => $request->input('code', $config->code),
                'is_active' => $request->has('is_active') ? $request->boolean('is_active') : $config->is_active,
                'sort_order' => $request->input('sort_order', $config->sort_order),
                'extra_data' => $request->input('extra_data', $config->extra_data),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Configuration updated successfully',
            'data' => $config,
        ]);
    }

    /**
     * Single-record fetch for the Configuration master page's edit form (code/name/sort_order/
     * extra_data) -- was missing entirely, so the frontend's GET to this exact URL shape 404'd
     * and every edit failed with "Failed to load record" before any field even populated.
     */
    public function showType(Request $request, $type, $id)
    {
        $config = SystemConfiguration::where(function ($query) use ($type): void {
            $normalized = strtolower(str_replace('-', '_', $type));
            $query->where('key', $normalized)->orWhere('config_key', $normalized)->orWhere('group', $normalized)->orWhere('group_name', $normalized);
        })->find($id);
        if (! $config) {
            return response()->json(['success' => false, 'message' => 'Configuration not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $config->id,
                'is_active' => $config->is_active,
                'created_by' => $config->created_by,
                'company_id' => $config->store_id,
                'store_id' => $config->store_id,
                'code' => $config->code,
                'name' => $config->value ?? $config->config_value,
                'sort_order' => $config->sort_order,
                'extra_data' => $config->extra_data,
            ],
        ]);
    }

    public function destroyType(Request $request, $type, $id)
    {
        $config = SystemConfiguration::where(function ($query) use ($type): void {
            $normalized = strtolower(str_replace('-', '_', $type));
            $query->where('key', $normalized)->orWhere('config_key', $normalized)->orWhere('group', $normalized)->orWhere('group_name', $normalized);
        })->find($id);
        if ($config) {
            $config->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Configuration deleted successfully',
        ]);
    }
}
