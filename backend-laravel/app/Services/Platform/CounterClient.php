<?php

namespace App\Services\Platform;

use App\Models\StoreLocalNode;
use RuntimeException;
use ZipArchive;

/**
 * The Vynerix Counter client (resources/printer-connector/counter.js): the billing app served from each counter,
 * so billing opens even when the main server PC is off. This server hands out the installer (connector + app +
 * counter.json) and, afterwards, newer builds of the app.
 */
class CounterClient
{
    public const PORT = 5050;

    /** The built web app (npm run build) this server shares with its counters. */
    public function distPath(): string
    {
        return rtrim((string) (config('sync.counter_app_dist') ?: base_path('../frontend/dist')), '/\\');
    }

    /** Changes whenever the app is rebuilt; null when there is no build. */
    public function version(): ?string
    {
        $index = $this->distPath().DIRECTORY_SEPARATOR.'index.html';

        return is_file($index) ? substr(sha1_file($index), 0, 16) : null;
    }

    /** A zip of the current build (made once per version). */
    public function bundle(): string
    {
        $version = $this->version() ?? throw new RuntimeException('The web app has not been built on this server (npm run build).');
        $dir = storage_path('app/counter-app');
        $file = $dir.DIRECTORY_SEPARATOR.$version.'.zip';
        if (! is_file($file)) {
            @mkdir($dir, 0755, true);
            foreach (glob($dir.DIRECTORY_SEPARATOR.'*.zip') ?: [] as $old) {
                @unlink($old);
            }
            $zip = new ZipArchive;
            $zip->open($file, ZipArchive::CREATE | ZipArchive::OVERWRITE);
            $this->addTree($zip, $this->distPath(), '', fn (string $relative) => ! str_starts_with($relative, 'downloads/'));
            $zip->close();
        }

        return $file;
    }

    /** The installer for one counter: the connector, counter.json for this store's main server and cloud, and the app. */
    public function installer(StoreLocalNode $node): string
    {
        $upstream = rtrim((string) $node->counter_url, '/');
        if (! preg_match('#^https?://#i', $upstream)) {
            throw new RuntimeException('Set the counter address (for example http://mainserver:5173) in Connect to cloud first.');
        }
        $this->version() ?? throw new RuntimeException('The web app has not been built on this server (npm run build).');
        $file = storage_path('app/'.uniqid('vynerix-counter-', true).'.zip');
        $zip = new ZipArchive;
        $zip->open($file, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $this->addTree($zip, resource_path('printer-connector'), '', fn (string $relative) => ! str_contains('/'.$relative, '/node_modules/')
            && ! str_starts_with($relative, 'test/') && ! str_starts_with($relative, 'app/')
            && ! in_array(basename($relative), ['printer_config.json', 'counter.json'], true) && ! str_ends_with(strtolower($relative), '.log'));
        $zip->addFromString('counter.json', json_encode([
            'upstream' => $upstream,
            'cloud_api' => LocalNodeRegistration::cloudApiBase($node->cloud_server_url) ?: null,
            'port' => self::PORT,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $this->addTree($zip, $this->distPath(), 'app/', fn (string $relative) => ! str_starts_with($relative, 'downloads/'));
        $zip->addFromString('app/.version', (string) $this->version());
        $zip->close();

        return $file;
    }

    private function addTree(ZipArchive $zip, string $root, string $prefix, callable $keep): void
    {
        if (! is_dir($root)) {
            return;
        }
        $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \RecursiveDirectoryIterator::SKIP_DOTS));
        foreach ($files as $item) {
            if ($item->isDir() || $item->isLink()) {
                continue;
            }
            $relative = str_replace('\\', '/', substr($item->getRealPath(), strlen(realpath($root)) + 1));
            if ($keep($relative)) {
                $zip->addFile($item->getRealPath(), $prefix.$relative);
            }
        }
    }
}
