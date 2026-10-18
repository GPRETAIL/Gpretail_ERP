<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivation;
use App\Services\PlatformActivationService;
use App\Services\PlatformBootstrap;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * This deployment's registration/status gate with the platform (Gpretail_Admin). Talks to it via
 * PlatformActivationService -> PlatformClient over Gpretail_Admin's /api/v1/tenant/* endpoints.
 *
 * First-login setup uses an expiring, company-scoped bootstrap token, never a business session.
 */
class ActivationController extends Controller
{
    public function __construct(private PlatformActivationService $activationService) {}

    public function status()
    {
        $activation = PlatformActivation::current();

        if (! $activation || ! $activation->activated) {
            return response()->json([
                'success' => true,
                'data' => [
                    'activated' => false,
                    'status' => null,
                    'licence' => null,
                ],
            ]);
        }

        $now = now();
        $activeTill = $activation->active_till;
        $daysRemaining = $activeTill ? (int) $now->diffInDays($activeTill, false) : null;
        $isTrial = ($activation->licence_state === 'TRIAL') || ($daysRemaining !== null && $daysRemaining <= 14);

        return response()->json([
            'success' => true,
            'data' => [
                'activated' => true,
                'status' => $activation->status,
                'active_till' => $activeTill?->toIso8601String(),
                'days_remaining' => $daysRemaining !== null ? max(0, $daysRemaining) : null,
                'is_trial' => $isTrial,
                'plan_tier' => $activation->licence_state ?? ($isTrial ? 'TRIAL' : 'PRO'),
                'limits' => $activation->limits,
                'feature_flags' => $activation->feature_flags,
                'licence' => [
                    'state' => $activation->licence_state,
                    'expires_at' => $activation->licence_expires_at?->toIso8601String(),
                    'grace_until' => $activation->licence_grace_until?->toIso8601String(),
                ],
                'last_synced_at' => $activation->last_synced_at?->toIso8601String(),
                'last_sync_error' => $activation->last_sync_error,
            ],
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'license_key' => 'nullable|string|max:16384',
            'company_code' => 'nullable|string|max:128',
            'client_id' => 'nullable|string|max:255',
            'one_time_password' => 'nullable|string|max:128',
        ]);
        $licenseKey = $request->input('license_key');
        $otp = $request->input('one_time_password');
        $companyCode = $request->input('company_code');
        $clientId = $request->input('client_id');

        // Handle single unified license key if provided
        if (! empty($licenseKey)) {
            $parsed = $this->parseLicenseKey((string) $licenseKey);
            if ($parsed) {
                $otp = $parsed['otp'] ?? $otp;
                $companyCode = $parsed['company_code'] ?? $companyCode;
                $clientId = $parsed['client_id'] ?? $clientId;
            } else {
                $otp = trim((string) $licenseKey);
            }
        }

        if (empty($otp)) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a valid License Key or Activation Code.',
                'errors' => ['one_time_password' => ['The activation code is required.']],
            ], 422);
        }

        $setup = $request->attributes->get('platform_setup_identity');
        if ($setup && $companyCode && $companyCode !== $setup['company_code']) {
            return response()->json(['success' => false, 'message' => 'The activation key belongs to a different company.'], 403);
        }
        $result = $this->activationService->register(
            $otp,
            $setup['company_code'] ?? $companyCode,
            $clientId,
            $setup['email'] ?? null,
        );

        if (! $result['ok']) {
            return response()->json(['success' => false, 'message' => $result['message']], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Deployment activated successfully.',
            'data' => [
                'activated' => true,
                'status' => $result['activation']->status,
            ],
        ]);
    }

    public function bootstrapRegister(Request $request, PlatformBootstrap $bootstrap)
    {
        $token = $request->bearerToken() ?? '';
        $identity = $bootstrap->identity($token);
        if (! $identity) {
            return response()->json(['success' => false, 'message' => 'Company setup session expired. Sign in again.'], 401);
        }

        return Cache::lock('erp-company-activation', 60)->get(function () use ($request, $bootstrap, $token, $identity) {
            $existing = PlatformActivation::current();
            if ($existing?->activated || ($existing && $existing->company_code !== $identity['company_code'])) {
                return response()->json(['success' => false, 'message' => 'This installation is already registered. Return to login.'], 409);
            }
            $request->attributes->set('platform_setup_identity', $identity);
            $response = $this->register($request);
            if ($response->isSuccessful()) {
                $bootstrap->forget($token);
            }

            return $response;
        }) ?: response()->json(['success' => false, 'message' => 'Activation is already in progress. Retry shortly.'], 409);
    }

    /**
     * Parse unified License Key (e.g. GPR-base64 or structured token)
     */
    private function parseLicenseKey(string $key): ?array
    {
        $raw = trim($key);
        if (str_starts_with(strtoupper($raw), 'GPR-')) {
            $raw = substr($raw, 4);
        }

        // Try base64 URL-safe JSON decode: {"c": company_code, "i": client_id, "o": otp}
        $normalized = strtr($raw, '-_', '+/');
        $decoded = base64_decode($normalized, true);
        if ($decoded !== false) {
            $json = json_decode($decoded, true);
            if (is_array($json) && (! empty($json['o']) || ! empty($json['otp']))) {
                return [
                    'company_code' => $json['c'] ?? $json['company_code'] ?? null,
                    'store_code' => $json['s'] ?? $json['store_code'] ?? null,
                    'client_id' => $json['i'] ?? $json['client_id'] ?? null,
                    'otp' => $json['o'] ?? $json['otp'] ?? null,
                ];
            }
        }

        // Try colon-separated string: COMPANY_CODE:CLIENT_ID:OTP
        if (str_contains($raw, ':')) {
            $parts = explode(':', $raw);
            if (count($parts) === 3) {
                return [
                    'company_code' => $parts[0],
                    'client_id' => $parts[1],
                    'otp' => $parts[2],
                ];
            }
        }

        return null;
    }

    public function setPassword(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Password configured successfully.',
        ]);
    }

    public function passwordSetupCheck()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'needsPassword' => false,
            ],
        ]);
    }
}
