<?php

namespace App\Providers;

use App\Services\RealtimeService;
use App\Services\StoreModelScope;
use App\Services\StoreSchema;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\Event;
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
        $scope = app(StoreModelScope::class);
        Event::listen('eloquent.booted: App\\Models\\*', function ($event, $models) use ($scope): void {
            $scope->bootModel($models[0]);
        });
        Event::listen('eloquent.saving: App\\Models\\*', function ($event, $models) use ($scope): void {
            $scope->saving($models[0]);
        });
    }
}
