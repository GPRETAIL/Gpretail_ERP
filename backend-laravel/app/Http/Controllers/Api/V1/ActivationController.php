<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PlatformActivation;
use App\Services\PlatformActivationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * This deployment's registration/status gate with the platform (Gpretail_Admin). Talks to it via
 * PlatformActivationService -> PlatformClient over Gpretail_Admin's /api/v1/tenant/* endpoints.
 *
 * set-password / password-setup-check are deliberately no-ops: unlike vynorix's tenant identity
 * service, GPRETAIL_ERP seeds its own local admin accounts at install time (see the
 * 2026_08_21_000001_seed_super_admin_user migration) rather than adopting a platform-issued
 * password, so there is nothing for the platform to set up here.
 */
class ActivationController extends Controller
{
    public function __construct(private PlatformActivationService $activationService) {}

    public function status()
    {
        $activation = PlatformActivation::current();

        if (!$activation || !$activation->activated) {
            return response()->json([
                'success' => true,
                'data' => [
                    'activated' => false,
                    'status' => null,
                    'licence' => null,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'activated' => true,
                'status' => $activation->status,
                'active_till' => $activation->active_till?->toIso8601String(),
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
        $validator = Validator::make($request->all(), [
            'one_time_password' => 'required|string',
            'company_code' => 'nullable|string',
            'client_id' => 'nullable|string',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        $result = $this->activationService->register(
            $request->input('one_time_password'),
            $request->input('company_code'),
            $request->input('client_id'),
        );

        if (!$result['ok']) {
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
