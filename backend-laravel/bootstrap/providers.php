<?php

// laravel/telescope is require-dev only (deliberately excluded from production's
// `composer install --no-dev`), so App\Providers\TelescopeServiceProvider -- which extends a class
// from that package -- doesn't exist there. Registering it unconditionally crashed every artisan
// bootstrap in production, including composer's own post-install `package:discover` script, before
// a single line of the deploy even ran. Only register it when the underlying package is actually
// installed.
return array_filter([
    App\Providers\AppServiceProvider::class,
    class_exists(\Laravel\Telescope\TelescopeServiceProvider::class)
        ? App\Providers\TelescopeServiceProvider::class
        : null,
]);
