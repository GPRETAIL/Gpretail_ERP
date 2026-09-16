<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\MastersDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MastersDashboardController extends Controller
{
    protected MastersDashboardService $service;

    public function __construct(MastersDashboardService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/v1/masters/dashboard
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
