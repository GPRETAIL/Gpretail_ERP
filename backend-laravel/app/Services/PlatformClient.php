<?php

namespace App\Services;

use App\Models\PlatformActivation;
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
    private function preflight(string $companyCode = '', ?string $syncToken = null, bool $requireToken = false, ?string $storeCode = null): ?array
    {
        if (($companyCode !== '' && preg_match('/\A[A-Za-z0-9_-]{1,64}\z/', $companyCode) !== 1)
            || ($storeCode !== null && preg_match('/\A[A-Za-z0-9_-]{1,64}\z/', $storeCode) !== 1)) {
            return ['ok' => false, 'status' => 422, 'data' => [], 'message' => 'Invalid company or store code format.'];
        }
        if ($requireToken && ($companyCode === '' || trim((string) $syncToken) === '')) {
            return ['ok' => false, 'status' => 401, 'data' => [], 'message' => 'Missing platform sync token.'];
        }
        $url = $this->baseUrl();
        $parts = parse_url($url);
        if (! is_array($parts) || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])
            || isset($parts['query']) || isset($parts['fragment'])
            || (strtolower($parts['scheme'] ?? '') !== 'https' && ! (app()->environment(['local', 'testing'])
                && strtolower($parts['scheme'] ?? '') === 'http' && in_array($parts['host'], ['localhost', '127.0.0.1', '[::1]'], true)))) {
            return ['ok' => false, 'status' => 0, 'data' => [], 'message' => 'GP Admin requires HTTPS.'];
        }

        return null;
    }

    public function authenticateTenant(string $email, string $password): array
    {
        if ($error = $this->preflight()) {
            return $error;
        }
        $url = $this->baseUrl();
        try {
            return $this->parse(Http::timeout((int) config('platform.http_timeout_seconds'))
                ->withoutRedirecting()->post($url.'/api/v1/tenant/authenticate', array_merge(compact('email', 'password'), ['prepare_registration' => true])));
        } catch (ConnectionException $exception) {
            return ['ok' => false, 'status' => 0, 'data' => [], 'message' => 'Could not reach GP Admin.'];
        }
    }

    public function activateStore(PlatformActivation $activation, string $storeCode, string $code): array
    {
        if ($error = $this->preflight((string) $activation->company_code, $activation->sync_token, true, $storeCode)) {
            return $error;
        }
        try {
            $response = Http::timeout((int) config('platform.http_timeout_seconds'))->withToken($activation->sync_token)
                ->withoutRedirecting()->post($this->baseUrl().'/api/v1/tenant/'.$activation->company_code.'/stores/activate', [
                    'store_code' => $storeCode, 'activation_code' => $code, 'deployment_id' => $activation->deployment_id,
                ]);
        } catch (ConnectionException $exception) {
            return ['ok' => false, 'status' => 0, 'data' => [], 'message' => 'Could not reach GP Admin. Try activation again.'];
        }

        return $this->parse($response);
    }

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
    public function register(string $companyCode, string $clientId, string $oneTimePassword, ?string $registrationTicket = null): array
    {
        if ($companyCode === '') {
            return ['ok' => false, 'status' => 422, 'data' => [], 'message' => 'Invalid company code format.'];
        }
        if ($error = $this->preflight($companyCode)) {
            return $error;
        }
        try {
            $response = Http::timeout((int) config('platform.http_timeout_seconds'))
                ->withoutRedirecting()->post($this->baseUrl().'/api/v1/tenant/register', [
                    'company_code' => $companyCode,
                    'client_id' => $clientId,
                    'one_time_password' => $oneTimePassword,
                    'registration_ticket' => $registrationTicket,
                ]);
        } catch (ConnectionException $e) {
            return ['ok' => false, 'status' => 0, 'data' => [], 'message' => 'Could not reach the platform: '.$e->getMessage()];
        }

        return $this->parse($response);
    }

    /**
     * Pulls this company's configuration from the platform: status, active_till, entitlement
     * limits, feature flags, and a signed licence. Authenticated by the sync token issued at
     * registration. Shared service tokens are never accepted as a fallback.
     *
     * @return array{ok: bool, status: int, data: array, message: ?string}
     */
    public function pullSnapshot(string $companyCode, ?string $syncToken): array
    {
        if ($error = $this->preflight($companyCode, $syncToken, true)) {
            return $error;
        }
        $request = Http::timeout((int) config('platform.http_timeout_seconds'));

        $request = $request->withToken(trim((string) $syncToken));

        try {
            $response = $request->withoutRedirecting()->get($this->baseUrl().'/api/v1/tenant/'.$companyCode.'/snapshot');
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
    public function passwordAdopted(string $companyCode, ?string $syncToken, int $version, ?string $storeCode = null): array
    {
        if ($error = $this->preflight($companyCode, $syncToken, true, $storeCode)) {
            return $error;
        }
        $request = Http::timeout((int) config('platform.http_timeout_seconds'));

        $request = $request->withToken(trim((string) $syncToken));

        try {
            $response = $request->withoutRedirecting()->post($this->baseUrl().'/api/v1/tenant/'.$companyCode.'/password-adopted', [
                'version' => $version,
                'scope' => $storeCode ? 'store' : 'tenant',
                'store_code' => $storeCode,
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

    public function firstEntry(string $companyCode, string $syncToken): array
    {
        if ($error = $this->preflight($companyCode, $syncToken, true)) {
            return $error;
        }
        try {
            return $this->parse(Http::timeout((int) config('platform.http_timeout_seconds'))->withToken($syncToken)
                ->withoutRedirecting()->post($this->baseUrl().'/api/v1/tenant/'.$companyCode.'/first-entry'));
        } catch (ConnectionException $exception) {
            return ['ok' => false, 'status' => 0, 'data' => [], 'message' => 'Could not validate company onboarding. Check the connection to GP Admin and retry.'];
        }
    }
}
