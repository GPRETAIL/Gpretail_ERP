<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\StoreDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreDashboardController extends Controller
{
    protected StoreDashboardService $service;

    public function __construct(StoreDashboardService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/v1/store/dashboard
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to']);
        $user = $request->user();

        $data = $this->service->getDashboardData($filters, $user);

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }
}
