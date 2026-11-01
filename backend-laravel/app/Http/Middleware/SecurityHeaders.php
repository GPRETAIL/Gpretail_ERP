<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline browser hardening. JSON responses get a lock-down CSP since they never render; the SPA shell gets
 * APP_POLICY from routes/web.php (public/.htaccess routes every HTML page through Laravel so it always applies).
 */
class SecurityHeaders
{
    /**
     * The SPA's Content-Security-Policy. Scripts may only come from this origin and Google sign-in, so an
     * injected <script> or inline handler can't run (bearer tokens live in localStorage). Everything else stays
     * as wide as the app needs: styles inline (MUI), Google Fonts, images from https/data/blob (receipts, QR),
     * connections to the LAN local server over http, the print connector on ws://127.0.0.1 and hosted Pusher,
     * and blob/data frames for PDF and print previews.
     */
    public const APP_POLICY = "default-src 'self'; "
        ."script-src 'self' https://accounts.google.com/gsi/client; "
        ."style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; "
        ."font-src 'self' data: https://fonts.gstatic.com; "
        ."img-src 'self' data: blob: https:; "
        ."connect-src 'self' https: wss: http: ws:; "
        ."frame-src 'self' blob: data: https://accounts.google.com; "
        ."worker-src 'self' blob:; media-src 'self' blob:; manifest-src 'self'; "
        ."object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

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
