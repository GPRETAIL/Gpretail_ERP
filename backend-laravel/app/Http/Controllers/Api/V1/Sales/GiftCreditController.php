<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Controllers\Controller;
use App\Services\Sales\GiftCreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POS: gift vouchers, credit notes and coupons. The payment step asks what a code is worth on this bill; the bill itself
 * uses it at checkout (vouchers[] on POST pos-sales). A wrong or unusable code answers 422 with the reason.
 */
class GiftCreditController extends Controller
{
    public function __construct(private GiftCreditService $credits) {}

    public function lookup(Request $request): JsonResponse
    {
        $data = $request->validate(['number' => 'required|string|max:80', 'bill_total' => 'required|numeric|min:0', 'due' => 'required|numeric|min:0']);
        $storeId = (int) $request->attributes->get('store_context_id', 0);
        abort_unless($storeId > 0, 422, 'Select a store first.');

        return response()->json(['success' => true, 'data' => $this->credits->quote($storeId, $data['number'], (float) $data['bill_total'], (float) $data['due'])]);
    }
}
