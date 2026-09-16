<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SettingsDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsDashboardController extends Controller
{
    protected SettingsDashboardService $service;

    public function __construct(SettingsDashboardService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/v1/settings/dashboard
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['warehouse_id', 'store_id']);
        $user = $request->user();

        $data = $this->service->getDashboardData($filters, $user);

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }
}
