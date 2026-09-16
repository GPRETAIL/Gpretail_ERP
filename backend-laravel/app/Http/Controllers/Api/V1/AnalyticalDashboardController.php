<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AnalyticalDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticalDashboardController extends Controller
{
    protected AnalyticalDashboardService $service;

    public function __construct(AnalyticalDashboardService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/v1/analytical/dashboard
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['warehouse_id', 'store_id', 'date_from', 'date_to']);
        $user = $request->user();

        $data = $this->service->getDashboardData($filters, $user);

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }
}
