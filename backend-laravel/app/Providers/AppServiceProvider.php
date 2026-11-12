<?php

namespace App\Providers;

use App\Services\Accounting\LedgerPoster;
use App\Services\Notifications\RealtimeService;
use App\Services\Tenancy\StoreModelScope;
use App\Services\Tenancy\StoreSchema;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(StoreSchema::class);
        $this->app->scoped(RealtimeService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Signed-in API calls: a per-user ceiling, so a leaked token or a runaway script can't hammer
        // reports and exports. Platform sync replays are exempt (a node may replay a long backlog).
        RateLimiter::for('signed-in', function (Request $request) {
            if ($request->attributes->get('authenticated_sync_replay')) {
                return Limit::none();
            }
            $perMinute = (int) config('sanctum.signed_in_requests_per_minute', 600);

            return $perMinute > 0
                ? Limit::perMinute($perMinute)->by('user:'.($request->user()?->getAuthIdentifier() ?? $request->ip()))
                : Limit::none();
        });
        Event::listen(QueryExecuted::class, function (QueryExecuted $query): void {
            $metrics = request()->attributes->get('api_performance');
            if ($metrics) {
                $metrics->queries++;
                $metrics->databaseMs += $query->time;
            }
        });
        Sanctum::authenticateAccessTokensUsing(function ($token, bool $isValid): bool {
            if (! $isValid || ! in_array('client:web', $token->abilities ?? [], true)) {
                return $isValid;
            }
            $lifetime = (int) config('sanctum.web_lifetime_minutes');
            $idle = (int) config('sanctum.web_idle_minutes');

            return (! $lifetime || $token->created_at?->gt(now()->subMinutes($lifetime)))
                && (! $idle || ! $token->last_used_at || $token->last_used_at->gt(now()->subMinutes($idle)));
        });
        LedgerPoster::observe();
        $scope = app(StoreModelScope::class);
        Event::listen('eloquent.booted: App\\Models\\*', function ($event, $models) use ($scope): void {
            $scope->bootModel($models[0]);
        });
        Event::listen('eloquent.saving: App\\Models\\*', function ($event, $models) use ($scope): void {
            $scope->saving($models[0]);
        });
    }
}
