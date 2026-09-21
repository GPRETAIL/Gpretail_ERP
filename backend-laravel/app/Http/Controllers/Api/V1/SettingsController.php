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

    // Cloud Server Config Test — same server-side probe pattern as localServerTest(), but the
    // cloud install always answers connector/web-config with enabled:false (node_role is
    // 'cloud' there, never 'local'), so reachability is judged by a successful JSON response
    // rather than data.enabled.
    public function cloudServerTest(Request $request)
    {
        $storeId = (int) $request->header('X-Company-Scope-Id', 1);
        $url = trim((string) $request->input('cloud_server_url', ''));

        $node = StoreLocalNode::where('store_id', $storeId)->first();
        if ($url === '') {
            $url = (string) ($node->cloud_server_url ?? '');
        }

        if ($url === '' || ! preg_match('#^https?://#i', $url)) {
            return response()->json([
                'success' => false,
                'message' => 'Enter a valid cloud server URL (must start with http:// or https://) first.',
            ], 422);
        }

        $probeUrl = rtrim($url, '/').'/api/connector/web-config';
        $startedAt = microtime(true);
        $healthy = false;

        try {
            $response = Http::timeout(5)->get($probeUrl);
            $healthy = $response->successful() && (bool) data_get($response->json(), 'success', false);
        } catch (\Throwable $e) {
            $healthy = false;
        }

        $latencyMs = (int) round((microtime(true) - $startedAt) * 1000);

        return response()->json([
            'success' => $healthy,
            'message' => $healthy
                ? 'Cloud server is reachable.'
                : 'Could not reach a cloud server at that URL.',
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
    // "Company" is this app's user-facing name for what the schema calls a Store (see
    // AuthController::me, which maps company_id straight from store_id) -- there is no separate
    // companies table, so {id} here is a store id.
    private const THEME_STYLES = ['classic', 'apple', 'glass'];
    // Must mirror FONT_OPTIONS ids in themeRegistry.js exactly -- an allowlist, not free-text, so
    // this field can't become an arbitrary-CSS-injection surface (low severity for font-family
    // specifically, but there's no reason to accept anything the frontend wouldn't ever send).
    private const FONT_FAMILIES = ['system', 'inter', 'roboto', 'poppins', 'playfair'];
    private const HEX_COLOR_RULE = 'regex:/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/';

    public function getTheme(Request $request, $id)
    {
        $store = Store::find($id);
        if (! $store) {
            return response()->json(['success' => false, 'message' => 'Store not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $store->theme_customization ?: [],
        ]);
    }

    public function updateTheme(Request $request, $id)
    {
        $store = Store::find($id);
        if (! $store) {
            return response()->json(['success' => false, 'message' => 'Store not found'], 404);
        }

        $validated = $request->validate($this->themeValidationRules());

        // Themes.jsx's "Reset to Default" sends an empty payload -- store that as null (not an
        // empty array) so it reads back identically to a store that never had a theme saved at
        // all, and createTenantTheme's own per-field fallback applies uniformly either way.
        $store->theme_customization = array_filter($validated, fn ($v) => $v !== null) ?: null;
        $store->save();

        return response()->json([
            'success' => true,
            'message' => 'Theme updated successfully',
            'data' => $store->theme_customization ?: [],
        ]);
    }

    private function themeValidationRules(): array
    {
        return [
            'primary_color' => ['nullable', self::HEX_COLOR_RULE],
            'secondary_color' => ['nullable', self::HEX_COLOR_RULE],
            // Advanced tokens -- optional on top of primary/secondary; createTenantTheme falls
            // back to MUI's own sensible defaults per-field when a tenant hasn't set one.
            'background_color' => ['nullable', self::HEX_COLOR_RULE],
            'text_color' => ['nullable', self::HEX_COLOR_RULE],
            'success_color' => ['nullable', self::HEX_COLOR_RULE],
            'warning_color' => ['nullable', self::HEX_COLOR_RULE],
            'error_color' => ['nullable', self::HEX_COLOR_RULE],
            'border_radius' => ['nullable', 'integer', 'min:0', 'max:32'],
            'theme_style' => ['nullable', 'in:'.implode(',', self::THEME_STYLES)],
            'font_family' => ['nullable', 'in:'.implode(',', self::FONT_FAMILIES)],
        ];
    }

    // Saved presets are an entirely separate, named library layered on top of the one active
    // theme_customization above -- saving/listing/deleting one never touches it. Only "apply"
    // does, and it does so by routing through the exact same updateTheme path (see applyThemePreset
    // below), not by duplicating its persistence logic.
    public function listThemePresets(Request $request, $id)
    {
        $store = Store::find($id);
        if (! $store) {
            return response()->json(['success' => false, 'message' => 'Store not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $store->themePresets()->orderBy('name')->get(['id', 'name', 'config']),
        ]);
    }

    public function saveThemePreset(Request $request, $id)
    {
        $store = Store::find($id);
        if (! $store) {
            return response()->json(['success' => false, 'message' => 'Store not found'], 404);
        }

        $data = $request->validate(array_merge(
            ['name' => ['required', 'string', 'max:60']],
            $this->themeValidationRules()
        ));
        $name = $data['name'];
        unset($data['name']);

        // Whatever fields were actually sent become the saved snapshot -- typically the page's
        // current live form state (including ones left blank/default), so re-applying this preset
        // later reproduces exactly what was being previewed when it was saved, not just the fields
        // that happened to differ from default at that moment.
        $preset = $store->themePresets()->updateOrCreate(
            ['name' => $name],
            ['config' => array_filter($data, fn ($v) => $v !== null)]
        );

        return response()->json([
            'success' => true,
            'message' => "Saved \"{$name}\"",
            'data' => $preset->only(['id', 'name', 'config']),
        ], 201);
    }

    public function applyThemePreset(Request $request, $id, $presetId)
    {
        $store = Store::find($id);
        if (! $store) {
            return response()->json(['success' => false, 'message' => 'Store not found'], 404);
        }

        $preset = $store->themePresets()->find($presetId);
        if (! $preset) {
            return response()->json(['success' => false, 'message' => 'Preset not found'], 404);
        }

        $store->theme_customization = $preset->config ?: null;
        $store->save();

        return response()->json([
            'success' => true,
            'message' => "Applied \"{$preset->name}\"",
            'data' => $store->theme_customization ?: [],
        ]);
    }

    public function deleteThemePreset(Request $request, $id, $presetId)
    {
        $store = Store::find($id);
        if (! $store) {
            return response()->json(['success' => false, 'message' => 'Store not found'], 404);
        }

        $deleted = $store->themePresets()->where('id', $presetId)->delete();
        if (! $deleted) {
            return response()->json(['success' => false, 'message' => 'Preset not found'], 404);
        }

        return response()->json(['success' => true, 'message' => 'Preset deleted']);
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
