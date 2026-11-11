<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Front-end crashes reported by the app's error boundaries (website, /app and the HRMS app), written to the
 * client_errors log (storage/logs/client-errors-*.log, kept 14 days) so they are seen before a user calls.
 * No table: works the same on shared hosting.
 */
class ClientErrorController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:20', 'regex:/^E-[A-Z0-9]{3,10}$/'],
            'message' => 'required|string|max:500',
            'name' => 'nullable|string|max:100',
            'stack' => 'nullable|string|max:4000',
            'component_stack' => 'nullable|string|max:4000',
            'where' => 'nullable|string|max:120',
            'path' => 'nullable|string|max:300',
            'build' => 'nullable|string|max:40',
            'user_agent' => 'nullable|string|max:300',
        ]);
        $user = $request->user();
        Log::channel('client_errors')->error($data['message'], $data + [
            'user_id' => $user?->id,
            'username' => $user?->username,
            'store_id' => $request->attributes->get('store_context_id') ?? $user?->store_id,
            'ip' => $request->ip(),
        ]);

        return response()->json(['success' => true, 'reference' => $data['reference']], 202);
    }
}
