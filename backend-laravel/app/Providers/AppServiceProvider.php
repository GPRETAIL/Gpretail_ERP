<?php

namespace App\Providers;

use App\Services\StoreModelScope;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $scope = app(StoreModelScope::class);
        Event::listen('eloquent.booted: App\\Models\\*', function ($event, $models) use ($scope): void {
            $scope->bootModel($models[0]);
        });
        Event::listen('eloquent.saving: App\\Models\\*', function ($event, $models) use ($scope): void {
            $scope->saving($models[0]);
        });
    }
}
