<?php

namespace App\Http\Middleware;

use App\Services\BusinessPermissions;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthorizeBusinessAction
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user) {
            $permissions = app(BusinessPermissions::class);
            $ability = $permissions->ability($request);
            if (! $permissions->allows($user, $ability, $request->attributes->get('authenticated_sync_replay', false))) {
                return response()->json(['success' => false, 'code' => 'PERMISSION_DENIED', 'message' => 'Your role does not permit this action.', 'required_permission' => $ability], 403);
            }
        }

        return $next($request);
    }
}
