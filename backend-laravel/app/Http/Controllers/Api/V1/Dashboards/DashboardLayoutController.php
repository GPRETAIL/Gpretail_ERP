<?php

namespace App\Http\Controllers\Api\V1\Dashboards;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DashboardLayoutController extends Controller
{
    // Every tab's saved layout at once -- Dashboard.jsx loads this a single time on mount and
    // hands each tab its own slice, rather than every tab firing its own request.
    public function index(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $request->user()->dashboard_layouts ?? [],
        ]);
    }

    // One tab's layout at a time, since a save happens when the user finishes rearranging
    // whichever tab they're actively viewing -- saving only that key avoids clobbering the
    // other tabs' already-saved layouts with a stale full-object write.
    public function update(Request $request, string $tabKey)
    {
        // A tab id (overview, finance, ...) and a grid layout of reasonable size: the user's own saved arrangement.
        abort_unless(preg_match('/^[a-z0-9_-]{1,40}$/i', $tabKey) === 1, 404);
        $request->validate([
            'layout' => ['sometimes', 'array', 'max:200'],
            'layout.*' => ['array', 'max:40'],
            'layout.*.*' => ['nullable', function (string $attribute, mixed $value, \Closure $fail): void {
                if (is_array($value) || (is_string($value) && mb_strlen($value) > 120)) {
                    $fail('A layout entry holds only short values.');
                }
            }],
        ]);
        $user = $request->user();
        $layouts = $user->dashboard_layouts ?? [];
        $layouts[$tabKey] = $request->input('layout', []);
        $user->dashboard_layouts = $layouts;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Dashboard layout saved',
            'data' => $layouts[$tabKey],
        ]);
    }

    // Drops the saved layout for one tab so it falls back to its hardcoded default arrangement.
    public function reset(Request $request, string $tabKey)
    {
        abort_unless(preg_match('/^[a-z0-9_-]{1,40}$/i', $tabKey) === 1, 404);
        $user = $request->user();
        $layouts = $user->dashboard_layouts ?? [];
        unset($layouts[$tabKey]);
        $user->dashboard_layouts = $layouts;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Dashboard layout reset to default',
        ]);
    }
}
