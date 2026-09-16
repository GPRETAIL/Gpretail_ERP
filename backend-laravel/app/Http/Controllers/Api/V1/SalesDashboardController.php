<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SalesDashboardService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SalesDashboardController extends Controller
{
    protected SalesDashboardService $service;

    public function __construct(SalesDashboardService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/v1/sales/dashboard
     * Consolidated Sales tab dashboard aggregation
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
     * GET /api/v1/sales/dashboard/export
     * CSV summary export
     */
    public function export(Request $request): StreamedResponse
    {
        $filters = $request->only(['warehouse_id', 'store_id', 'date_from', 'date_to']);
        $user = $request->user();

        $data = $this->service->getDashboardData($filters, $user);
        $summary = $data['summary'];
        $paymentBreakdown = $data['payment_breakdown'] ?? [];

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="sales_dashboard_' . Carbon::now()->format('Y-m-d_His') . '.csv"',
        ];

        return response()->stream(function () use ($summary, $paymentBreakdown) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ERP Sales Dashboard Summary']);
            fputcsv($handle, ['Generated At', Carbon::now()->toDateTimeString()]);
            fputcsv($handle, []);

            fputcsv($handle, ['Metric', 'Value']);
            fputcsv($handle, ['Today Sales Amount (INR)', $summary['today_sales_amount']]);
            fputcsv($handle, ['Today Bills Count', $summary['today_bills_count']]);
            fputcsv($handle, ['Period Sales Amount (INR)', $summary['range_sales_amount']]);
            fputcsv($handle, ['Period Bills Count', $summary['range_bills_count']]);
            fputcsv($handle, ['Returns Amount (INR)', $summary['returns_amount']]);
            fputcsv($handle, ['Net Sales Amount (INR)', $summary['net_sales_amount']]);
            fputcsv($handle, ['Credit Pending Amount (INR)', $summary['credit_pending_amount']]);
            fputcsv($handle, ['Open Cash Registers', $summary['open_registers_count']]);
            fputcsv($handle, []);

            fputcsv($handle, ['Payment Mode Breakdown']);
            fputcsv($handle, ['Mode', 'Bills', 'Amount']);
            foreach ($paymentBreakdown as $row) {
                fputcsv($handle, [$row['mode'] ?? '-', $row['bills'] ?? 0, $row['amount'] ?? 0]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}
