<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\FinanceDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceDashboardController extends Controller
{
    protected FinanceDashboardService $service;

    public function __construct(FinanceDashboardService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/v1/finance/dashboard
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
