<?php

namespace App\Http\Middleware;

use App\Services\BusinessPermissions;
use App\Services\MobileAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthorizeBusinessAction
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user) {
            $access = app(MobileAccess::class);
            if ($error = $access->authorize($request)) {
                return response()->json(['success' => false, ...$error], 403);
            }
            $permissions = app(BusinessPermissions::class);
            $ability = $permissions->ability($request);
            $explicitGrant = $user->is_active && ($user->module_permissions !== null || $user->page_permissions !== null) && $access->page($request)
                && in_array($ability, ['read', 'masters.write', 'sales.post', 'purchases.post', 'transactions.delete', 'transactions.approve', 'reports.export'], true);
            if (! $explicitGrant && ! $permissions->allows($user, $ability, $request->attributes->get('authenticated_sync_replay', false))) {
                return response()->json(['success' => false, 'code' => 'PERMISSION_DENIED', 'message' => 'Your role does not permit this action.', 'required_permission' => $ability], 403);
            }
        }

        return $next($request);
    }
}
