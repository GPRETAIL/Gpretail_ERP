<?php

namespace App\Console\Commands;

use App\Models\PlatformActivation;
use App\Models\User;
use App\Services\LegacyTenantOwnerLink;
use App\Services\PlatformActivationService;
use App\Services\PlatformClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class LinkLegacyTenantOwner extends Command
{
    protected $signature = 'platform:link-legacy-owner {email}';

    protected $description = 'Link the registered legacy owner while retaining their password and keeping unlinked local stores separate';

    public function handle(PlatformClient $client, LegacyTenantOwnerLink $linker, PlatformActivationService $sync): int
    {
        try {
            $activation = PlatformActivation::current();
            if (! $activation) {
                throw new \RuntimeException('No registered deployment.');
            }
            $result = $client->pullSnapshot($activation->company_code, $activation->sync_token);
            if (! $result['ok']) {
                throw new \RuntimeException($result['message'] ?? 'GP Admin is unavailable.');
            }
            $user = User::whereRaw('LOWER(email) = ?', [strtolower($this->argument('email'))])->firstOrFail();
            Storage::disk('local')->put('deployment-upgrades/owner-'.$user->id.'-before.json', json_encode($user->getAttributes()));
            $linker->link($this->argument('email'), $result['data']['company']);
            $synced = $sync->sync($activation);
            if (! $synced['ok']) {
                throw new \RuntimeException($synced['message']);
            }
            $this->info('Tenant Admin linked and GP Admin stores synced. Passwords and unlinked local stores were preserved.');

            return self::SUCCESS;
        } catch (\Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
