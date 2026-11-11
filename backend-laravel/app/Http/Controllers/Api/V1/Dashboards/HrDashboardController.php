<?php

namespace App\Http\Controllers\Api\V1\Dashboards;

use App\Http\Controllers\Controller;
use App\Services\Dashboards\HrDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Dashboard > HR tab and HRMS > Dashboard. */
class HrDashboardController extends Controller
{
    public function __construct(private readonly HrDashboardService $service) {}

    /** GET /api/hrms/dashboard */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['date_from' => 'nullable|date_format:Y-m-d', 'date_to' => 'nullable|date_format:Y-m-d']);

        return response()->json(['success' => true, 'data' => $this->service->getDashboardData($data, $request->user())]);
    }
}
