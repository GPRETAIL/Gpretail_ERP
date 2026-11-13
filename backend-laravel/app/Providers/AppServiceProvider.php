<?php

namespace App\Providers;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\Accounting\LedgerPoster;
use App\Services\Notifications\RealtimeService;
use App\Services\Tenancy\StoreModelScope;
use App\Services\Tenancy\StoreSchema;
use App\Support\RequestMemo;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Http\Events\RequestHandled;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
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
        $this->app->scoped(RequestMemo::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // On-prem, the counters reach this server through the Vite proxy on the same machine. Trusting only that
        // local proxy's X-Forwarded-For gives each counter its own address for sign-in limits and logs.
        if (config('sync.node_role') === 'local') {
            \Illuminate\Http\Middleware\TrustProxies::at(['127.0.0.1', '::1']);
        }

        // Per-request lookups (RequestMemo) are dropped after each request and when what they read changes.
        Event::listen(RequestHandled::class, fn () => $this->app->make(RequestMemo::class)->flush());
        foreach ([PlatformActivation::class, Store::class, User::class] as $model) {
            $model::saved(fn () => $this->app->make(RequestMemo::class)->flush());
            $model::deleted(fn () => $this->app->make(RequestMemo::class)->flush());
        }
        // N+1: a relation loaded one row at a time on models fetched as a list. Tests fail on it; anywhere
        // else it still loads, and is written once per model and relation to the performance log.
        Model::preventLazyLoading();
        if (! $this->app->runningUnitTests()) {
            Model::handleLazyLoadingViolationUsing(function (Model $model, string $relation): void {
                static $seen = [];
                $key = $model::class.'.'.$relation;
                if (! $model->exists || $model->wasRecentlyCreated || isset($seen[$key])) {
                    return;
                }
                $seen[$key] = true;
                Log::channel('performance')->warning('N+1: relation loaded row by row', [
                    'model' => $model::class, 'relation' => $relation, 'request' => $this->requestLabel(),
                ]);
            });
        }
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
        $slowQueryMs = (int) config('logging.performance.slow_query_ms', 1000);
        Event::listen(QueryExecuted::class, function (QueryExecuted $query) use ($slowQueryMs): void {
            $metrics = request()->attributes->get('api_performance');
            if ($metrics) {
                $metrics->queries++;
                $metrics->databaseMs += $query->time;
            }
            // The SQL only, never the bindings (they can hold customer data).
            if ($slowQueryMs > 0 && $query->time >= $slowQueryMs) {
                Log::channel('performance')->warning('Slow query', [
                    'ms' => (int) round($query->time), 'sql' => Str::limit($query->sql, 2000), 'request' => $this->requestLabel(),
                ]);
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

    private function requestLabel(): string
    {
        return $this->app->runningInConsole() ? 'console' : request()->method().' /'.request()->path();
    }
}
