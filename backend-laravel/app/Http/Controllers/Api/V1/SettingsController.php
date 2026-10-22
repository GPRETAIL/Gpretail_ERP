<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PrinterConfig;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Services\RegisteredServerProbe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    // Printer Configs Resolve
    public function printerConfigsResolve(Request $request)
    {
        $storeId = $this->resolveStoreId($request, 1);
        $config = PrinterConfig::where('store_id', $storeId)->where('is_default', true)->first();

        return response()->json([
            'success' => true,
            'data' => [
                'printer_name' => $config?->name ?? 'POS Thermal Printer',
                'printer_type' => $config?->printer_type ?? 'THERMAL',
                'paper_size' => $config?->paper_size ?? '80mm',
                'header_text' => $config?->header_text ?? Store::find($storeId)?->name ?? 'Vynerix',
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
        return $this->probeServer($request, true);
    }

    public function cloudServerTest(Request $request)
    {
        return $this->probeServer($request, false);
    }

    private function probeServer(Request $request, bool $local)
    {
        abort_unless(in_array($request->user()?->role, ['admin', 'super_admin'], true), 403);
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');
        $node = StoreLocalNode::where('store_id', $storeId)->firstOrFail();
        $key = $local ? 'local_server_url' : 'cloud_server_url';
        $request->validate([$key => 'nullable|string|max:2048']);
        $started = microtime(true);
        $result = app(RegisteredServerProbe::class)->check((string) $node->{$key}, trim((string) $request->input($key, '')), $local);
        $healthy = $result['healthy'];
        if ($local) {
            $node->update(['local_healthy' => $healthy, 'last_health_check_at' => now()]);
        }

        return response()->json(['success' => $healthy, 'message' => $healthy ? 'Server is reachable and healthy.' : 'Server did not report healthy.', 'data' => ['status' => $healthy ? 'ONLINE' : 'OFFLINE', 'latency' => (int) ((microtime(true) - $started) * 1000).'ms']]);
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
            $request->validate(['settingsSection' => ['sometimes', 'in:sales,receipt']]);
            if (! $storeId) {
                return response()->json(['success' => false, 'message' => 'companyId is required'], 422);
            }

            $store = Store::find($storeId);
            if (! $store) {
                return response()->json(['success' => false, 'message' => 'Store not found'], 404);
            }

            $data = DB::transaction(function () use ($request, $store) {
                $locked = Store::whereKey($store->id)->lockForUpdate()->firstOrFail();
                $incoming = $request->except(['companyId', 'company_id', 'settingsSection']);
                if ($request->has('settingsSection')) {
                    $salesKeys = ['billNumberReset', 'billNumberOverride', 'settlementNumberReset', 'settlementNumberOverride', 'saleSaveAs', 'posPaymentDialogVisible'];
                    $receiptKeys = ['showBarcodeOnBill', 'showBarcodeOnReturnSlip', 'receiptCodeType', 'showDiscountOnReceipt', 'discountDisplayMode', 'showTaxTableOnReceipt', 'receiptWidthInches', 'thankYouMessage', 'receiptFontFamily', 'receiptFormat', 'printMode', 'paymentQrMode', 'paymentUpiId', 'paymentQrImageUrl', 'paymentQrSize', 'posReceiptPrintCopies', 'generalFields', 'taxFields', 'productFields'];
                    $allowed = $request->input('settingsSection') === 'sales' ? $salesKeys : $receiptKeys;
                    $incoming = array_intersect_key($incoming, array_flip($allowed));
                    $incoming = array_replace($locked->receipt_customization ?? [], $incoming);
                }
                $locked->update(['receipt_customization' => $incoming]);

                return $incoming;
            });

            return response()->json([
                'success' => true,
                'message' => 'POS customization settings updated',
                'data' => $data,
            ]);
        }

        $store = $storeId ? Store::find($storeId) : null;

        return response()->json([
            'success' => true,
            'data' => $store?->receipt_customization ?? [],
        ]);
    }

    // Compatibility routes delegate to the same governance and validation service as company themes.
    public function getTheme(Request $request, $id)
    {
        return app(ThemeWorkspaceController::class)->index($request, $id);
    }

    public function updateTheme(Request $request, $id)
    {
        return app(ThemeWorkspaceController::class)->update($request, $id);
    }

    public function listThemePresets(Request $request, $id)
    {
        return app(ThemeWorkspaceController::class)->presets($request, $id);
    }

    public function saveThemePreset(Request $request, $id)
    {
        return app(ThemeWorkspaceController::class)->savePreset($request, $id);
    }

    public function applyThemePreset(Request $request, $id, $presetId)
    {
        return app(ThemeWorkspaceController::class)->applyPreset($request, $id, $presetId);
    }

    public function deleteThemePreset(Request $request, $id, $presetId)
    {
        return app(ThemeWorkspaceController::class)->deletePreset($request, $id, $presetId);
    }

    public function notify(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'System broadcast notification dispatched',
        ]);
    }
}
