<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class PurgePlaintextSnapshots extends Command
{
    protected $signature = 'security:purge-plaintext-snapshots {--encrypt : Verify an encrypted copy before removing each plaintext snapshot}';

    protected $description = 'Protect legacy private snapshots and remove temporary backup files older than 24 hours';

    public function handle(): int
    {
        $lock = Cache::lock('security:purge-plaintext-snapshots', 3600);
        if (! $lock->get()) {
            $this->info('Snapshot cleanup is already running.');

            return self::SUCCESS;
        }
        $disk = Storage::disk('local');
        $processed = 0;
        $failed = 0;
        try {
            foreach (['config-backups', 'deployment-upgrades', 'backups/tmp'] as $directory) {
                foreach ($disk->allFiles($directory) as $file) {
                    if (basename($file) === '.gitignore' || ($directory !== 'backups/tmp' && str_ends_with($file, '.enc'))) {
                        continue;
                    }
                    $path = $disk->path($file);
                    $root = realpath($disk->path($directory));
                    $resolved = realpath($path);
                    if (! $root || ! $resolved || is_link($path) || ! str_starts_with($resolved, $root.DIRECTORY_SEPARATOR)) {
                        $failed++;

                        continue;
                    }
                    if ($directory === 'backups/tmp' && $disk->lastModified($file) >= now()->subDay()->timestamp) {
                        continue;
                    }
                    try {
                        $plain = $disk->get($file);
                        if (! is_string($plain)) {
                            throw new RuntimeException('Could not read snapshot.');
                        }
                        if ($this->option('encrypt') && $directory !== 'backups/tmp') {
                            $destination = $file.'.enc';
                            if (! $disk->exists($destination) && ! $disk->put($destination, Crypt::encryptString($plain), ['visibility' => 'private'])) {
                                throw new RuntimeException('Could not save encrypted snapshot.');
                            }
                            if (Crypt::decryptString($disk->get($destination)) !== $plain) {
                                throw new RuntimeException('Encrypted snapshot does not match; plaintext retained.');
                            }
                            chmod($disk->path($destination), 0600);
                        }
                        if ($disk->get($file) !== $plain || ! $disk->delete($file)) {
                            throw new RuntimeException('Snapshot changed or could not be removed.');
                        }
                        $processed++;
                    } catch (Throwable) {
                        $failed++;
                        $this->error('Could not safely process '.$file.'. The source was retained.');
                    }
                }
            }
        } finally {
            $lock->release();
        }
        $this->info("Processed {$processed} snapshot/temp file(s); {$failed} failed. Recent backup temporary files were preserved.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
