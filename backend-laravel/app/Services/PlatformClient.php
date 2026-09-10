<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Talks to Gpretail_Admin (the platform/control-plane side of this deployment) over its
 * /api/v1/tenant/* registration protocol. Snake_case request/response, matching this app's own
 * conventions (see SyncCycleService.php) — both sides are Laravel.
 */
class PlatformClient
{
    private function baseUrl(): string
    {
        return rtrim((string) config('platform.base_url'), '/');
    }

    /**
     * Registers this deployment with the platform using the one-time password issued when the
     * company was created there. On success the OTP is burned platform-side — it cannot be reused.
     *
     * @return array{ok: bool, status: int, data: array, message: ?string}
     */
    public function register(string $companyCode, string $clientId, string $oneTimePassword): array
    {
        try {
            $response = Http::timeout((int) config('platform.http_timeout_seconds'))
                ->post($this->baseUrl().'/api/v1/tenant/register', [
                    'company_code' => $companyCode,
                    'client_id' => $clientId,
                    'one_time_password' => $oneTimePassword,
                ]);
        } catch (ConnectionException $e) {
            return ['ok' => false, 'status' => 0, 'data' => [], 'message' => 'Could not reach the platform: '.$e->getMessage()];
        }

        return $this->parse($response);
    }

    /**
     * Pulls this company's configuration from the platform: status, active_till, entitlement
     * limits, feature flags, and a signed licence. Authenticated by the sync token issued at
     * registration; falls back to the shared platform-service token only when no sync token is
     * stored yet (a co-located, trusted-network Gpretail_Admin).
     *
     * @return array{ok: bool, status: int, data: array, message: ?string}
     */
    public function pullSnapshot(string $companyCode, ?string $syncToken): array
    {
        $request = Http::timeout((int) config('platform.http_timeout_seconds'));

        if ($syncToken) {
            $request = $request->withToken($syncToken);
        } elseif (config('platform.service_token')) {
            $request = $request->withHeaders(['X-Platform-Service-Token' => config('platform.service_token')]);
        }

        try {
            $response = $request->get($this->baseUrl().'/api/v1/tenant/'.$companyCode.'/snapshot');
        } catch (ConnectionException $e) {
            return ['ok' => false, 'status' => 0, 'data' => [], 'message' => 'Could not reach the platform: '.$e->getMessage()];
        }

        return $this->parse($response);
    }

    /**
     * Tells the platform this deployment has copied the tenant admin password hash it issued into a
     * local account — the platform nulls its own copy once the version matches, so a stale hash
     * doesn't sit in Gpretail_Admin's database indefinitely after this deployment owns it locally.
     *
     * @return array{ok: bool, status: int, data: array, message: ?string}
     */
    public function passwordAdopted(string $companyCode, ?string $syncToken, int $version): array
    {
        $request = Http::timeout((int) config('platform.http_timeout_seconds'));

        if ($syncToken) {
            $request = $request->withToken($syncToken);
        } elseif (config('platform.service_token')) {
            $request = $request->withHeaders(['X-Platform-Service-Token' => config('platform.service_token')]);
        }

        try {
            $response = $request->post($this->baseUrl().'/api/v1/tenant/'.$companyCode.'/password-adopted', [
                'version' => $version,
                'scope' => 'tenant',
            ]);
        } catch (ConnectionException $e) {
            return ['ok' => false, 'status' => 0, 'data' => [], 'message' => 'Could not reach the platform: '.$e->getMessage()];
        }

        return $this->parse($response);
    }

    private function parse(Response $response): array
    {
        $body = $response->json() ?? [];

        return [
            'ok' => $response->successful() && ($body['success'] ?? false) === true,
            'status' => $response->status(),
            'data' => $body['data'] ?? [],
            'message' => $body['message'] ?? null,
        ];
    }
}
