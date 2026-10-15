<?php

namespace Tests\Feature;

use Symfony\Component\Process\Process;
use Tests\TestCase;

class HttpDeploymentDisabledTest extends TestCase
{
    public function test_retired_deployment_scripts_refuse_execution_regardless_of_input(): void
    {
        foreach (['unzip.php', 'migrate.php', 'public/unzip.php', 'public/migrate.php'] as $path) {
            $script = 'register_shutdown_function(static function () { echo " STATUS:".http_response_code(); }); $_GET["token"] = "anything"; $_POST["token"] = "anything"; require $argv[1];';
            $process = new Process([PHP_BINARY, '-r', $script, base_path($path)]);
            $process->mustRun();
            $this->assertStringContainsString('STATUS:404', $process->getOutput(), $path);
            $this->assertStringContainsString('Not found', $process->getOutput(), $path);
        }
    }
}
