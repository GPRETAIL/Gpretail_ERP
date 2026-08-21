<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\WarehouseDashboardService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WarehouseDashboardController extends Controller
{
    protected WarehouseDashboardService $service;

    public function __construct(WarehouseDashboardService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/v1/warehouse/dashboard
     * Consolidated high-performance dashboard aggregation
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['warehouse_id', 'date_from', 'date_to']);
        $user = $request->user();

        $data = $this->service->getDashboardData($filters, $user);

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }

    /**
     * GET /api/v1/warehouse/dashboard/inventory
     */
    public function inventory(Request $request): JsonResponse
    {
        $filters = $request->only(['warehouse_id']);
        $user = $request->user();
        $storeId = !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : ($user?->store_id ?: null);

        $inventory = $this->service->getInventoryOverview($storeId);
        $valuation = $this->service->getInventoryValuation($storeId);

        return response()->json([
            'success' => true,
            'data'    => [
                'inventory' => $inventory,
                'valuation' => $valuation,
            ],
        ]);
    }

    /**
     * GET /api/v1/warehouse/dashboard/incoming
     */
    public function incoming(Request $request): JsonResponse
    {
        $filters = $request->only(['warehouse_id', 'date_from', 'date_to']);
        $user = $request->user();
        $storeId = !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : ($user?->store_id ?: null);
        $from = !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : null;
        $to = !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : null;

        $incoming = $this->service->getIncomingGoods($storeId, $from, $to, 20);
        $grn = $this->service->getGrnSummary($storeId, $from, $to);
        $transport = $this->service->getTransportSummary($storeId, $from, $to);

        return response()->json([
            'success' => true,
            'data'    => [
                'incoming'  => $incoming,
                'grn'       => $grn,
                'transport' => $transport,
            ],
        ]);
    }

    /**
     * GET /api/v1/warehouse/dashboard/outgoing
     */
    public function outgoing(Request $request): JsonResponse
    {
        $filters = $request->only(['warehouse_id', 'date_from', 'date_to']);
        $user = $request->user();
        $storeId = !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : ($user?->store_id ?: null);
        $from = !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : null;
        $to = !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : null;

        $outgoing = $this->service->getStockOutwardSummary($storeId, $from, $to, 20);

        return response()->json([
            'success' => true,
            'data'    => $outgoing,
        ]);
    }

    /**
     * GET /api/v1/warehouse/dashboard/alerts
     */
    public function alerts(Request $request): JsonResponse
    {
        $filters = $request->only(['warehouse_id']);
        $user = $request->user();
        $storeId = !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : ($user?->store_id ?: null);

        $alerts = $this->service->getLowStockAlerts($storeId, 50);

        return response()->json([
            'success' => true,
            'data'    => $alerts,
        ]);
    }

    /**
     * GET /api/v1/warehouse/dashboard/activity
     */
    public function activity(Request $request): JsonResponse
    {
        $filters = $request->only(['warehouse_id']);
        $user = $request->user();
        $storeId = !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : ($user?->store_id ?: null);

        $activity = $this->service->getRecentActivity($storeId, 30);

        return response()->json([
            'success' => true,
            'data'    => $activity,
        ]);
    }

    /**
     * GET /api/v1/warehouse/dashboard/export
     * CSV summary export
     */
    public function export(Request $request): StreamedResponse
    {
        $filters = $request->only(['warehouse_id', 'date_from', 'date_to']);
        $user = $request->user();

        $data = $this->service->getDashboardData($filters, $user);
        $summary = $data['summary'];
        $sellingModes = $data['inventory']['selling_modes'] ?? [];

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="warehouse_dashboard_' . Carbon::now()->format('Y-m-d_His') . '.csv"',
        ];

        return response()->stream(function () use ($summary, $sellingModes) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ERP Warehouse Dashboard Summary']);
            fputcsv($handle, ['Generated At', Carbon::now()->toDateTimeString()]);
            fputcsv($handle, []);

            fputcsv($handle, ['Metric', 'Value']);
            fputcsv($handle, ['Total Stock Units', $summary['total_stock_qty']]);
            fputcsv($handle, ['Available Units', $summary['total_available_qty']]);
            fputcsv($handle, ['Allocated Units', $summary['total_allocated_qty']]);
            fputcsv($handle, ['Cost Value (INR)', $summary['total_cost_value']]);
            fputcsv($handle, ['Retail Value (INR)', $summary['total_retail_value']]);
            fputcsv($handle, ['Total Products', $summary['total_products']]);
            fputcsv($handle, ['Total Variants', $summary['total_variants']]);
            fputcsv($handle, ['Pending Purchases', $summary['pending_purchases']]);
            fputcsv($handle, ['Outward Today', $summary['outward_today']]);
            fputcsv($handle, ['Low Stock Items', $summary['low_stock_count']]);
            fputcsv($handle, ['Transport Issues', $summary['transport_issues_count']]);
            fputcsv($handle, []);

            fputcsv($handle, ['Selling Mode Breakdown']);
            fputcsv($handle, ['Mode', 'Unit', 'Total Qty', 'Available Qty', 'Product Count', 'Cost Value']);
            foreach ($sellingModes as $key => $mode) {
                fputcsv($handle, [
                    $mode['label'] ?? $key,
                    $mode['unit'] ?? '-',
                    $mode['total_qty'] ?? 0,
                    $mode['available_qty'] ?? 0,
                    $mode['product_count'] ?? 0,
                    $mode['cost_value'] ?? 0,
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}
