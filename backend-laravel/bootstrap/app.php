<?php

use App\Http\Middleware\CaptureSyncOutbox;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            Route::middleware('api')->prefix('api')->group(base_path('routes/invoice_ai.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->appendToGroup('api', [CaptureSyncOutbox::class]);

        // This is a pure JSON API + React SPA - there is no server-rendered
        // "login" web route to redirect to. Without this, Laravel's default
        // auth:sanctum failure handler tries route('login') for any request
        // that didn't send an Accept: application/json header (real
        // frontend traffic always does - only direct/manual API callers
        // hit this) and crashes with a 500 RouteNotFoundException instead
        // of a clean 401.
        Authenticate::redirectUsing(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // A clean, reliable 409 instead of a raw-SQL-message 500 -- SyncCycleService
        // depends on this specific status to recognize "this write already landed"
        // when replaying a queued event, which must work the same in production
        // (APP_DEBUG=false hides the SQL error text a naive text-match would need).
        $exceptions->render(function (UniqueConstraintViolationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'This record already exists.',
            ], 409);
        });
    })
    ->create();
