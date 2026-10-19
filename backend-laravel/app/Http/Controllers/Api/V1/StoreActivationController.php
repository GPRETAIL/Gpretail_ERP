<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\Warehouse;
use App\Services\PlatformActivationService;
use App\Services\PlatformClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StoreActivationController extends Controller
{
    private function owner(Request $request): PlatformActivation
    {
        $activation = PlatformActivation::current();
        $user = $request->user();
        abort_unless($activation?->activated && $user->platform_company_code === $activation->company_code
            && $user->role === 'admin' && ! $user->store_id
            && strcasecmp($user->email, $activation->tenant_admin_email ?? '') === 0, 403, 'Only the registered Tenant Admin can activate stores.');

        return $activation;
    }

    public function index(Request $request): JsonResponse
    {
        $activation = $this->owner($request);

        return response()->json(['success' => true, 'data' => Store::where('platform_company_code', $activation->company_code)->get(),
            'warehouses' => Warehouse::withoutGlobalScopes()->where('platform_company_code', $activation->company_code)->get()]);
    }

    public function overview(Request $request): JsonResponse
    {
        $response = $this->index($request)->getData(true);

        return response()->json(['success' => true, 'data' => ['stores' => $response['data'], 'warehouses' => $response['warehouses']]]);
    }

    public function sync(Request $request, PlatformActivationService $service): JsonResponse
    {
        $result = $service->sync($this->owner($request));

        return response()->json(['success' => $result['ok'], 'message' => $result['message']], $result['ok'] ? 200 : 503);
    }

    public function activate(Request $request, PlatformClient $client, PlatformActivationService $service): JsonResponse
    {
        $activation = $this->owner($request);

        $licenseKey = $request->input('license_key');
        if (! empty($licenseKey)) {
            $raw = trim((string) $licenseKey);
            if (str_starts_with(strtoupper($raw), 'GPR-')) {
                $raw = substr($raw, 4);
            }
            $decoded = json_decode(base64_decode(strtr($raw, '-_', '+/')), true);
            if (is_array($decoded)) {
                if (! $request->filled('store_code') && ! empty($decoded['s'])) {
                    $request->merge(['store_code' => $decoded['s']]);
                }
                if (! $request->filled('activation_code') && ! empty($decoded['o'])) {
                    $request->merge(['activation_code' => $decoded['o']]);
                }
            }
        }

        $data = $request->validate(['store_code' => 'required|string|max:64', 'activation_code' => 'required|string|max:128']);
        if (! $activation->deployment_id) {
            $activation->update(['deployment_id' => (string) Str::uuid()]);
        }
        $result = $client->activateStore($activation, $data['store_code'], $data['activation_code']);
        if (! $result['ok']) {
            return response()->json(['success' => false, 'message' => $result['message']], $result['status'] ?: 503);
        }
        $sync = $service->sync($activation);

        return response()->json(['success' => $sync['ok'], 'message' => $sync['ok'] ? 'Store activated. Select it before entering data.' : 'Vynerix Admin activated the store, but ERP sync failed: '.($sync['message'] ?? 'Unknown verification error').' Refresh stores after the issue is resolved; the activation code has already been consumed.'], $sync['ok'] ? 200 : 503);
    }
}
