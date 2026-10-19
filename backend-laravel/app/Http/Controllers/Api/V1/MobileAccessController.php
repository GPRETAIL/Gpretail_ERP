<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\MobileAccess;
use App\Services\StoreContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileAccessController extends Controller
{
    public function status(Request $request, MobileAccess $access, StoreContext $context): JsonResponse
    {
        $user = $request->user();

        return response()->json(['success' => true, 'data' => [
            'tenant_admin' => $access->tenantAdmin($user),
            'mobile_session' => $access->isMobile($request),
            'portal_url' => config('platform.portal_url'),
            'stores' => $context->stores($user)->map(fn ($store) => $access->storeStatus($user, $store))->values(),
        ]]);
    }
}
