<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\CrmDashboardService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CrmDashboardController extends Controller
{
    protected CrmDashboardService $service;

    public function __construct(CrmDashboardService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/v1/crm/dashboard
     * Consolidated high-performance CRM dashboard aggregation
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

    /**
     * GET /api/v1/crm/dashboard/export
     * CSV summary export
     */
    public function export(Request $request): StreamedResponse
    {
        $filters = $request->only(['warehouse_id', 'store_id', 'date_from', 'date_to']);
        $user = $request->user();

        $data = $this->service->getDashboardData($filters, $user);
        $summary = $data['summary'];
        $segmentation = $data['segmentation'] ?? [];

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="crm_dashboard_' . Carbon::now()->format('Y-m-d_His') . '.csv"',
        ];

        return response()->stream(function () use ($summary, $segmentation) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ERP CRM Dashboard Summary']);
            fputcsv($handle, ['Generated At', Carbon::now()->toDateTimeString()]);
            fputcsv($handle, []);

            fputcsv($handle, ['Metric', 'Value']);
            fputcsv($handle, ['Total Customers', $summary['total_customers']]);
            fputcsv($handle, ['Active Customers', $summary['active_customers']]);
            fputcsv($handle, ['New Customers (Period)', $summary['new_customers']]);
            fputcsv($handle, ['Total Customer Orders', $summary['total_orders']]);
            fputcsv($handle, ['Total Orders Value (INR)', $summary['total_order_value']]);
            fputcsv($handle, ['Advance Received (INR)', $summary['advance_received']]);
            fputcsv($handle, ['Balance Receivable (INR)', $summary['balance_receivable']]);
            fputcsv($handle, ['Outstanding Customer Receivables (INR)', $summary['total_receivables']]);
            fputcsv($handle, ['Total Active Loyalty Points', $summary['total_loyalty_points']]);
            fputcsv($handle, ['Loyalty Club Members', $summary['loyalty_members_count']]);
            fputcsv($handle, []);

            fputcsv($handle, ['Customer Segmentation']);
            fputcsv($handle, ['Segment', 'Count', 'Percentage']);
            foreach ($segmentation as $key => $seg) {
                fputcsv($handle, [
                    $seg['label'] ?? $key,
                    $seg['count'] ?? 0,
                    ($seg['pct'] ?? 0) . '%',
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}
