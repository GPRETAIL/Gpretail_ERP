<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivation;
use App\Services\PlatformClient;
use App\Services\StoreContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RemoteSupportController extends Controller
{
    public function config(): JsonResponse
    {
        return response()->json(['data' => ['agent_download_url' => '/downloads/Vynerix%20Remote%20Tool.exe']]);
    }

    public function requestSession(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => 'required|string|max:64', 'client_password' => 'nullable|string|max:64',
            'customer_name' => 'nullable|string|max:120', 'contact_number' => 'nullable|string|max:40',
            'system_os' => 'nullable|string|max:50', 'category' => 'required|in:printing,hardware,software,sync,general',
            'priority' => 'required|in:normal,high,urgent', 'issue_description' => 'nullable|string|max:1000',
        ]);
        $data['client_id'] = preg_replace('/[\s-]+/', '', $data['client_id']);
        $data['customer_name'] = $data['customer_name'] ?? $request->user()->name;
        $store = app(StoreContext::class)->available($request->user())->find($request->attributes->get('store_context_id'));
        $data['store_code'] = $store?->code;

        return $this->forward($request, 'request', $data);
    }

    public function activeSession(Request $request): JsonResponse
    {
        return $this->forward($request, 'active');
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['page' => 'nullable|integer|min:1', 'per_page' => 'nullable|integer|min:1|max:100',
            'category' => 'nullable|string|max:60', 'search' => 'nullable|string|max:120']);

        return $this->forward($request, 'sessions', $data, true);
    }

    public function cancelSession(Request $request, int $id): JsonResponse
    {
        return $this->forward($request, 'cancel', ['id' => $id]);
    }

    public function endSession(Request $request, int $id): JsonResponse
    {
        return $this->forward($request, 'end', ['id' => $id]);
    }

    private function forward(Request $request, string $operation, array $payload = [], bool $history = false): JsonResponse
    {
        $activation = PlatformActivation::current();
        abort_unless($activation?->activated && $activation->company_code === $request->user()->platform_company_code, 403, 'Activate this company deployment before requesting remote support.');
        $result = app(PlatformClient::class)->remoteSupport($activation, $operation, array_merge($payload, ['requester_id' => $request->user()->id]));
        if (! $result['ok']) {
            $status = in_array($result['status'], [403, 404, 409, 422, 429], true) ? $result['status'] : 503;

            return response()->json(['message' => $result['message'] ?? 'Support is temporarily unavailable. Please retry.'], $status);
        }

        return response()->json($history ? $result['data'] : ['data' => $result['data'] ?: null]);
    }
}
