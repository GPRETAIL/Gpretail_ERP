<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class UpdateRemoteSupportAgent extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'support:update-agent {--force : Force re-download even if already present}';

    /**
     * The console command description.
     */
    protected $description = 'Download and cache the latest official RustDesk Windows portable agent';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $targetDir = public_path('downloads');
        if (! File::isDirectory($targetDir)) {
            File::makeDirectory($targetDir, 0755, true);
        }

        $targetFile = $targetDir.DIRECTORY_SEPARATOR.'rustdesk-portable.exe';

        if (File::exists($targetFile) && ! $this->option('force')) {
            $this->info("RustDesk portable agent already cached at: {$targetFile} (".round(File::size($targetFile) / 1024 / 1024, 2).' MB)');
            $this->comment('Use --force to re-download the latest release.');

            return self::SUCCESS;
        }

        $this->info('Fetching latest release info from GitHub API...');

        $ctx = stream_context_create([
            'http' => [
                'header' => "User-Agent: Next-ERP-Support-Agent\r\n",
                'timeout' => 20,
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        $raw = @file_get_contents('https://api.github.com/repos/rustdesk/rustdesk/releases/latest', false, $ctx);
        if (! $raw) {
            $this->error('Failed to connect to GitHub API.');

            return self::FAILURE;
        }

        $data = json_decode($raw, true);
        $exeUrl = null;
        $exeName = null;

        foreach ($data['assets'] ?? [] as $asset) {
            if (str_ends_with($asset['name'], 'x86_64.exe') && ! str_contains($asset['name'], 'setup')) {
                $exeUrl = $asset['browser_download_url'];
                $exeName = $asset['name'];
                break;
            }
        }

        if (! $exeUrl) {
            $this->error('Could not find suitable Windows x86_64 portable asset in release.');

            return self::FAILURE;
        }

        $this->info("Found: {$exeName}");
        $this->info("Downloading from: {$exeUrl}");

        $fp = fopen($targetFile, 'w+');
        $ch = curl_init($exeUrl);
        curl_setopt($ch, CURLOPT_TIMEOUT, 300);
        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        $success = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        fclose($fp);

        if (! $success || ! File::exists($targetFile) || File::size($targetFile) < 1000000) {
            $this->error('Download failed: '.($err ?: 'File incomplete'));

            return self::FAILURE;
        }

        $this->info('Successfully cached portable agent: '.round(File::size($targetFile) / 1024 / 1024, 2).' MB');

        return self::SUCCESS;
    }
}
