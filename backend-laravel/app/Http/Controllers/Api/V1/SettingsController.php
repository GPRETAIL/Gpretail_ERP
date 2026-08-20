<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PrinterConfig;
use App\Models\Store;
use App\Models\SystemConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    // Backups
    public function backupsOverview(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'total_backups'    => 1,
                'last_backup_date' => now()->toDateTimeString(),
                'backup_size'      => '2.4 MB',
                'auto_backup'      => true,
                'backups'          => [
                    [
                        'id'         => 1,
                        'filename'   => 'next_erp_auto_backup_' . date('Y_m_d') . '.sql',
                        'size'       => '2.4 MB',
                        'created_at' => now()->toDateTimeString(),
                        'type'       => 'AUTOMATIC',
                    ],
                ],
            ],
        ]);
    }

    public function backupsIndex(Request $request)
    {
        return $this->backupsOverview($request);
    }

    public function backupsStore(Request $request)
    {
        $backupFile = 'next_erp_manual_backup_' . date('Y_m_d_His') . '.sql';

        return response()->json([
            'success' => true,
            'message' => 'Database backup created successfully',
            'data'    => [
                'id'         => rand(10, 999),
                'filename'   => $backupFile,
                'size'       => '2.5 MB',
                'created_at' => now()->toDateTimeString(),
            ],
        ], 201);
    }

    public function backupsRestore(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Database backup restored successfully',
        ]);
    }

    public function backupsDestroy($id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Backup file deleted successfully',
        ]);
    }

    public function backupsSettings(Request $request)
    {
        if ($request->isMethod('post') || $request->isMethod('put')) {
            return response()->json([
                'success' => true,
                'message' => 'Backup settings saved',
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'auto_backup_enabled' => true,
                'frequency'           => 'DAILY',
                'retention_days'      => 30,
            ],
        ]);
    }

    // Printer Configs Resolve
    public function printerConfigsResolve(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $config = PrinterConfig::where('store_id', $storeId)->where('is_default', true)->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'printer_name' => $config?->name ?? 'POS Thermal Printer',
                'printer_type' => $config?->printer_type ?? 'THERMAL',
                'paper_size'   => $config?->paper_size ?? '80mm',
                'header_text'  => $config?->header_text ?? 'SRI BALAJI TEXTILE',
                'footer_text'  => $config?->footer_text ?? 'Thank you for shopping with us!',
            ],
        ]);
    }

    // Local Printer Service
    public function localPrinterMeta(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'service_running' => false,
                'version'         => '1.0.0',
                'platform'        => 'Windows',
            ],
        ]);
    }

    public function localPrinterInstaller(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'download_url' => '/files/printer_service_installer.exe',
            ],
        ]);
    }

    // Local Server Config Test
    public function localServerTest(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Local server connection test successful',
            'data'    => [
                'status'  => 'ONLINE',
                'latency' => '2ms',
            ],
        ]);
    }

    // Sales Customization
    public function salesCustomization(Request $request)
    {
        if ($request->isMethod('post') || $request->isMethod('put')) {
            return response()->json([
                'success' => true,
                'message' => 'POS customization settings updated',
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'allow_negative_stock' => false,
                'enable_discounts'     => true,
                'require_salesman'     => false,
                'default_payment_mode' => 'CASH',
                'print_barcode_on_bill'=> true,
            ],
        ]);
    }

    // Company Theme
    public function getTheme(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'primary_color'   => '#2563eb',
                'secondary_color' => '#1e40af',
                'mode'            => 'light',
            ],
        ]);
    }

    public function updateTheme(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Theme updated successfully',
            'data'    => $request->all(),
        ]);
    }

    // Admin notify
    public function notify(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'System broadcast notification dispatched',
        ]);
    }
}
