<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Symfony\Component\Process\Process;

$directory = getenv('ERP_DEPLOY_APP_DIR');
if (! is_string($directory) || ! is_file($directory.'/artisan')) {
    throw new RuntimeException('ERP directory was not verified.');
}
chdir($directory);
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$connection = config('database.connections.'.config('database.default'));
if (! in_array($connection['driver'] ?? '', ['mysql', 'mariadb'], true)) {
    throw new RuntimeException('Deployment backup requires MySQL or MariaDB.');
}
$binary = is_executable('/usr/bin/mariadb-dump') ? '/usr/bin/mariadb-dump' : '/usr/bin/mysqldump';
if (! is_executable($binary)) {
    throw new RuntimeException('Native database backup executable is unavailable.');
}
$recovery = getenv('HOME').'/.gp-erp-recovery';
umask(0077);
$optionsFile = tempnam($recovery, 'db-options-');
$escape = static fn (string $value): string => str_replace(["\\", "\r", "\n", '"'], ["\\\\", '\r', '\n', '\"'], $value);
$options = "[client]\n";
foreach (['host', 'port', 'username', 'password'] as $name) {
    $option = $name === 'username' ? 'user' : $name;
    $options .= $option.'="'.$escape((string) ($connection[$name] ?? '')).'"'."\n";
}
$path = $recovery.'/database-'.gmdate('YmdHis').'-'.bin2hex(random_bytes(4)).'.sql.gz';
$output = null;
try {
    if ($optionsFile === false || file_put_contents($optionsFile, $options) === false) {
        throw new RuntimeException('Cannot prepare private database backup options.');
    }
    chmod($optionsFile, 0600);
    $output = gzopen($path, 'wb6');
    if ($output === false) {
        throw new RuntimeException('Cannot open private database backup output.');
    }
    $process = new Process([$binary, '--defaults-extra-file='.$optionsFile, '--single-transaction', '--quick', '--skip-lock-tables', '--hex-blob', '--no-tablespaces', '--', $connection['database']]);
    $process->setTimeout(1200);
    $process->run(static function (string $type, string $chunk) use ($output, $process): void {
        if ($type === Process::OUT && gzwrite($output, $chunk) !== strlen($chunk)) {
            throw new RuntimeException('Database backup write failed.');
        }
        $process->clearOutput();
        $process->clearErrorOutput();
    });
    gzclose($output);
    $output = null;
    if (! $process->isSuccessful() || ! is_file($path) || filesize($path) < 100) {
        throw new RuntimeException('Database backup failed; deployment stopped before changing live code.');
    }
    chmod($path, 0600);
    file_put_contents($path.'.sha256', hash_file('sha256', $path)."\n");
    echo "Private database backup completed before deployment.\n";
} catch (Throwable $exception) {
    if (is_resource($output)) {
        gzclose($output);
    }
    if (is_file($path)) {
        unlink($path);
    }
    throw $exception;
} finally {
    if (is_string($optionsFile) && is_file($optionsFile)) {
        unlink($optionsFile);
    }
}
