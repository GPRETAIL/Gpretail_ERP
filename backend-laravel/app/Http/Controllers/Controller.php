<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Resolve the active store ID from the middleware-validated StoreContext attributes,
     * falling back to explicit request/header scope or the single authorized store.
     */
    protected function resolveStoreId(Request $request, ?int $default = 1): ?int
    {
        $selected = $request->attributes->get('store_context_id');
        if ($selected !== null && (int) $selected > 0) {
            return (int) $selected;
        }

        $candidate = $request->header('X-Company-Scope-Id')
            ?: $request->input('store_id')
            ?: $request->input('company_id')
            ?: $request->input('companyId');

        if ($candidate !== null && $candidate !== '' && $candidate !== 'all' && is_numeric($candidate)) {
            return (int) $candidate;
        }

        $authorizedIds = $request->attributes->get('store_context_ids', []);
        if (is_array($authorizedIds) && count($authorizedIds) === 1) {
            return (int) reset($authorizedIds);
        }

        return $default;
    }
}
