<?php

namespace App\Providers;

use App\Services\StoreModelScope;
use App\Services\StoreSchema;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(StoreSchema::class);
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
        $scope = app(StoreModelScope::class);
        Event::listen('eloquent.booted: App\\Models\\*', function ($event, $models) use ($scope): void {
            $scope->bootModel($models[0]);
        });
        Event::listen('eloquent.saving: App\\Models\\*', function ($event, $models) use ($scope): void {
            $scope->saving($models[0]);
        });
    }
}
