<?php

namespace App\Http\Controllers\Api\V1\Warehouse;

use App\Http\Controllers\Controller;
use App\Services\Inventory\ItemLocatorService;
use Illuminate\Http\Request;

/**
 * Sales > Stock Item Locator: the same rows as Warehouse > Item Locator (BarcodeController@itemLocator). It has
 * its own controller because the class name is the Sales page's permission key (MobileAccess), so a counter
 * given only Sales pages can still look up stock.
 */
class ItemLocatorController extends Controller
{
    public function index(Request $request, ItemLocatorService $locator)
    {
        $rows = $locator->rows($request->boolean('in_stock', true));

        return response()->json(['success' => true, 'data' => $rows, 'total' => count($rows)]);
    }
}
