<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PrinterConfig;
use App\Models\Store;
use App\Models\StoreLocalNode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class SettingsController extends Controller
{
    // Printer Configs Resolve
    public function printerConfigsResolve(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $config = PrinterConfig::where('store_id', $storeId)->where('is_default', true)->first();

        return response()->json([
            'success' => true,
            'data' => [
                'printer_name' => $config?->name ?? 'POS Thermal Printer',
                'printer_type' => $config?->printer_type ?? 'THERMAL',
                'paper_size' => $config?->paper_size ?? '80mm',
                'header_text' => $config?->header_text ?? 'SRI BALAJI TEXTILE',
                'footer_text' => $config?->footer_text ?? 'Thank you for shopping with us!',
            ],
        ]);
    }

    // Local Printer Service
    public function localPrinterMeta(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'fileName' => 'erp-printer-connector.zip',
                'type' => 'ZIP Archive',
                'installHint' => 'Extract ZIP and run run.bat on Windows or run.sh on macOS/Linux. Select printers in terminal for silent printing.',
                'service_running' => false,
                'version' => '2.0.0',
                'platform' => PHP_OS_FAMILY,
            ],
        ]);
    }

    public function localPrinterInstaller(Request $request)
    {
        $connectorDir = resource_path('printer-connector');
        $tempZipPath = storage_path('app/erp-printer-connector-'.time().'.zip');

        if (! is_dir(storage_path('app'))) {
            @mkdir(storage_path('app'), 0755, true);
        }

        $zip = new \ZipArchive;
        if ($zip->open($tempZipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) === true) {
            if (is_dir($connectorDir)) {
                $files = new \RecursiveIteratorIterator(
                    new \RecursiveDirectoryIterator($connectorDir, \RecursiveDirectoryIterator::SKIP_DOTS),
                    \RecursiveIteratorIterator::LEAVES_ONLY
                );

                foreach ($files as $file) {
                    if (! $file->isDir()) {
                        $filePath = $file->getRealPath();
                        $relativePath = substr($filePath, strlen($connectorDir) + 1);
                        $zip->addFile($filePath, $relativePath);
                    }
                }
            } else {
                // Fallback default readme
                $zip->addFromString('README.txt', "GP Retail Silent Printer Connector\nRun node server.js on port 5001");
            }
            $zip->close();
        }

        if (! file_exists($tempZipPath)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create connector archive.',
            ], 500);
        }

        return response()->download($tempZipPath, 'erp-printer-connector.zip', [
            'Content-Type' => 'application/zip',
            'Content-Disposition' => 'attachment; filename="erp-printer-connector.zip"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ])->deleteFileAfterSend(true);
    }

    // Local Server Config Test — real cross-origin probe of the store's local install,
    // done server-side (not trusted to the browser) so the result reflects what the
    // cloud can actually reach, not just what the admin's own browser can reach.
    public function localServerTest(Request $request)
    {
        $storeId = (int) $request->header('X-Company-Scope-Id', 1);
        $url = trim((string) $request->input('local_server_url', ''));

        $node = StoreLocalNode::where('store_id', $storeId)->first();
        if ($url === '') {
            $url = (string) ($node->local_server_url ?? '');
        }

        if ($url === '' || ! preg_match('#^https?://#i', $url)) {
            return response()->json([
                'success' => false,
                'message' => 'Enter a valid local server URL (must start with http:// or https://) first.',
            ], 422);
        }

        $probeUrl = rtrim($url, '/').'/api/connector/web-config';
        $startedAt = microtime(true);
        $healthy = false;

        try {
            $response = Http::timeout(5)->get($probeUrl);
            $healthy = $response->successful() && (bool) data_get($response->json(), 'data.enabled', false);
        } catch (\Throwable $e) {
            $healthy = false;
        }

        $latencyMs = (int) round((microtime(true) - $startedAt) * 1000);

        if ($node) {
            $node->local_healthy = $healthy;
            $node->last_health_check_at = now();
            $node->save();
        }

        return response()->json([
            'success' => $healthy,
            'message' => $healthy
                ? 'Local server is reachable and reporting healthy.'
                : 'Could not reach a healthy local server at that URL.',
            'data' => [
                'status' => $healthy ? 'ONLINE' : 'OFFLINE',
                'latency' => $latencyMs.'ms',
            ],
        ]);
    }

    // Sales Customization
    /**
     * Receipt layout customization (fonts, columns, messages, etc.) set on
     * the Sales > Customisation page. Keyed by store (the frontend calls
     * this "company"), stored as one JSON blob on stores.receipt_customization
     * - every POS screen fetches this on load to sync its localStorage
     * cache, so returning the wrong shape here doesn't just fail to save,
     * it actively resets the cached customization back to defaults.
     */
    public function salesCustomization(Request $request)
    {
        $storeId = $request->input('companyId') ?? $request->input('company_id');

        if ($request->isMethod('post') || $request->isMethod('put')) {
            if (! $storeId) {
                return response()->json(['success' => false, 'message' => 'companyId is required'], 422);
            }

            $store = Store::find($storeId);
            if (! $store) {
                return response()->json(['success' => false, 'message' => 'Store not found'], 404);
            }

            $store->update([
                'receipt_customization' => $request->except(['companyId', 'company_id']),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'POS customization settings updated',
            ]);
        }

        $store = $storeId ? Store::find($storeId) : null;

        return response()->json([
            'success' => true,
            'data' => $store?->receipt_customization ?? [],
        ]);
    }

    // Company Theme
    public function getTheme(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'primary_color' => '#2563eb',
                'secondary_color' => '#1e40af',
                'mode' => 'light',
            ],
        ]);
    }

    public function updateTheme(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Theme updated successfully',
            'data' => $request->all(),
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
