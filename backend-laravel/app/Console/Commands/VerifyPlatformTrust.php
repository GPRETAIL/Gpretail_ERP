<?php

namespace App\Console\Commands;

use App\Services\StoreLicenceVerifier;
use Illuminate\Console\Command;

class VerifyPlatformTrust extends Command
{
    protected $signature = 'platform:verify-trust {--production : Check production trust even in local/testing environments}';

    protected $description = 'Check that the ERP pins a valid production Ed25519 licence verification key';

    public function handle(): int
    {
        if (! $this->option('production') && app()->environment(['local', 'testing'])) {
            return self::SUCCESS;
        }
        $public = (string) config('platform.licence_public_keys.prod', '');
        $der = base64_decode($public, true);
        if (! $der || strlen($der) !== 44 || ! str_starts_with($der, hex2bin('302a300506032b6570032100')) || $public === StoreLicenceVerifier::DEV_PUBLIC_KEY
         || ! openssl_pkey_get_public("-----BEGIN PUBLIC KEY-----\n".chunk_split($public, 64, "\n").'-----END PUBLIC KEY-----')) {
            $this->error('Configure PLATFORM_LICENCE_PUBLIC_KEY with the verified Vynerix Admin production Ed25519 public key.');

            return self::FAILURE;
        }
        $this->info('Production licence verification key is configured.');

        return self::SUCCESS;
    }
}
