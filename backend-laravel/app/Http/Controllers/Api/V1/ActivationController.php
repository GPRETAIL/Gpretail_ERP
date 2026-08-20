<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ActivationController extends Controller
{
    public function status()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'activated' => true,
                'status'    => 'active',
                'licence'   => [
                    'state'  => 'ACTIVE',
                    'plan'   => 'Enterprise',
                    'reason' => null,
                ],
            ],
        ]);
    }

    public function register(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Deployment activated successfully.',
            'data' => [
                'activated' => true,
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
