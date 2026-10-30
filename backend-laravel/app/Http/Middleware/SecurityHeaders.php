<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline browser hardening. JSON responses get a lock-down CSP since they never render;
 * the SPA shell only gets framing/sniffing protection so camera scanning, print iframes and
 * third-party checkout scripts keep working. A full SPA CSP belongs in the web server config.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $headers = $response->headers;

        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        if ($request->isSecure()) {
            $headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
        if (str_contains((string) $headers->get('Content-Type'), 'json')) {
            $headers->set('X-Frame-Options', 'DENY');
            $headers->set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        } else {
            $headers->set('X-Frame-Options', 'SAMEORIGIN');
        }

        return $response;
    }
}
