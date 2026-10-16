<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Api\V1\SettingsController;
use App\Models\PlatformActivation;
use App\Services\StoreContext;
use App\Services\StoreLicenceVerifier;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveStoreContext
{
    public function __construct(private StoreContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            return $next($request);
        }

        $stores = $this->context->stores($request->user());
        $ids = $stores->pluck('id')->all();
        $candidates = [];
        foreach (['X-Company-Scope-Id', 'X-Company-Id', 'X-Store-Id'] as $header) {
            if ($request->hasHeader($header)) {
                $candidates[] = $request->header($header);
            }
        }
        foreach (['store_id', 'storeId', 'company_id', 'companyId'] as $key) {
            if ($request->filled($key)) {
                $candidates[] = $request->input($key);
            }
        }
        foreach ($candidates as $id) {
            if (! is_scalar($id) || ! ctype_digit((string) $id) || (int) $id < 1) {
                return $this->error('STORE_SELECTION_REQUIRED', 'Select a store first', 422);
            }
        }
        $candidates = array_unique(array_map('intval', $candidates));
        if (count($candidates) > 1) {
            return $this->error('STORE_CONTEXT_MISMATCH', 'The selected store does not match this form. Reopen it in the correct store.', 422);
        }
        $selected = $candidates ? reset($candidates) : (count($ids) === 1 ? $ids[0] : null);
        if ($selected && ! in_array($selected, $ids, true)) {
            return $this->error('STORE_ACCESS_DENIED', 'You are not assigned to this store.', 403);
        }

        $themeSettings = $request->route()?->getControllerClass() === SettingsController::class
            && in_array($request->route()->getActionMethod(), ['getTheme', 'updateTheme', 'listThemePresets', 'saveThemePreset', 'applyThemePreset', 'deleteThemePreset'], true);
        if ($themeSettings) {
            $themeStore = $request->route('id');
            if (! ctype_digit((string) $themeStore) || ! in_array((int) $themeStore, $ids, true)) {
                return $this->error('STORE_ACCESS_DENIED', 'Store not found', 404);
            }
            if ($candidates && $selected !== (int) $themeStore) {
                return $this->error('STORE_CONTEXT_MISMATCH', 'The selected store does not match this form. Reopen it in the correct store.', 422);
            }
            $selected = (int) $themeStore;
        }

        $path = preg_replace('#^api/(v1/)?#', '', $request->path());
        // Profile/preferences and subscription management do not create business records.
        $management = $themeSettings || $request->is('api/auth/*')
            || preg_match('#^(company-stores(/|$)|companies/subscription/|dashboard/layout|user-table-preferences/)#', $path);
        $write = ! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true) && ! $management;
        if ($write && ! $selected) {
            return $this->error(
                $ids ? 'STORE_SELECTION_REQUIRED' : 'NO_STORES_ASSIGNED',
                $ids ? 'Select a store first' : 'No stores are available. Ask your administrator to assign and activate a store.',
                422,
            );
        }
        if ($write && ! $stores->firstWhere('id', $selected)?->is_active) {
            return $this->error('STORE_INACTIVE', 'This store is inactive. Contact your administrator.', 403);
        }

        if ($write && $selected) {
            $store = $stores->firstWhere('id', $selected);
            $activation = PlatformActivation::current();
            if ($store->platform_store_id || $activation?->activated) {
                $licence = app(StoreLicenceVerifier::class)->verify($store, $activation);
                if (! $licence['ok']) {
                    return $this->error('STORE_LICENCE_INVALID', $licence['message'], 403);
                }
                $request->attributes->set('store_licence_claims', $licence['claims']);
            }
        }

        $request->attributes->set('store_context_ids', $selected ? [$selected] : $ids);
        $request->attributes->set('store_context_id', $selected);
        $request->attributes->set('store_context_write', $write);
        if ($selected && ! $management) {
            // Do not add aliases to request->all(): legacy mass-assignment controllers would
            // otherwise try to insert camelCase/nonexistent database columns. Model events
            // assign the validated ownership columns; existing payload aliases were checked above.
            $request->headers->set('X-Company-Scope-Id', (string) $selected);
            $request->headers->set('X-Company-Id', (string) $selected);
        }

        return $next($request);
    }

    private function error(string $code, string $message, int $status): Response
    {
        return response()->json(['success' => false, 'code' => $code, 'message' => $message], $status);
    }
}
