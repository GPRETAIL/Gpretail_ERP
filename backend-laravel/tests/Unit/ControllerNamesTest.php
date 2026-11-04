<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Controller class names (without namespace) are the permission and mobile-page keys (BusinessPermissions,
 * MobileAccess), so two controllers with the same name in different modules would share one set of rules.
 */
class ControllerNamesTest extends TestCase
{
    public function test_every_controller_name_is_unique(): void
    {
        $names = [];
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(dirname(__DIR__, 2).'/app/Http/Controllers'));
        foreach ($files as $file) {
            if (str_ends_with($file->getFilename(), 'Controller.php')) {
                $names[$file->getFilename()][] = $file->getPath();
            }
        }
        $duplicates = array_filter($names, fn ($paths) => count($paths) > 1);

        $this->assertSame([], $duplicates, 'Controller names must be unique: they are permission keys.');
    }
}
