<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use Illuminate\Http\Request;

/**
 * CRM -> Loyalty Points. Mirrors the CI4 LoyaltyApiController's design
 * (read-only view of balances/transaction history) but reads from the
 * proper loyalty_transactions ledger this app already has, rather than
 * CI4's redemption-only redeem_tab.
 */
class LoyaltyController extends Controller
{
    public function balances(Request $request)
    {
        $query = Customer::query();

        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%")
                  ->orWhere('loyalty_card_number', 'like', "%{$s}%");
            });
        }

        $limit = max(1, $request->integer('limit', 20));
        $page  = max(1, $request->integer('page', 1));

        $paginated = $query->orderByDesc('loyalty_points')
            ->paginate($limit, ['id', 'name', 'phone', 'loyalty_card_number', 'loyalty_points', 'disable_loyalty'], 'page', $page);

        return response()->json([
            'success'     => true,
            'data'        => $paginated->items(),
            'total'       => $paginated->total(),
            'page'        => $paginated->currentPage(),
            'limit'       => $paginated->perPage(),
            'totalPages'  => $paginated->lastPage(),
            'totalPoints' => (int) Customer::sum('loyalty_points'),
        ]);
    }

    public function transactions(Request $request)
    {
        $query = LoyaltyTransaction::with(['customer:id,name,phone', 'posSale:id,invoice_no']);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->input('customer_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->boolean('all') || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $items = $query->orderByDesc('created_at')->limit(2000)->get();
            return response()->json(['success' => true, 'data' => $items, 'total' => $items->count()]);
        }

        $limit     = max(1, $request->integer('limit', 20));
        $page      = max(1, $request->integer('page', 1));
        $paginated = $query->orderByDesc('created_at')->paginate($limit, ['*'], 'page', $page);

        return response()->json([
            'success'    => true,
            'data'       => $paginated->items(),
            'total'      => $paginated->total(),
            'page'       => $paginated->currentPage(),
            'limit'      => $paginated->perPage(),
            'totalPages' => $paginated->lastPage(),
        ]);
    }
}
