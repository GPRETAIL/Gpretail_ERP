<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Services\PaginationService;
use Illuminate\Http\Request;

/**
 * CRM -> Loyalty Points. Mirrors the CI4 LoyaltyApiController's design
 * (read-only view of balances/transaction history) but reads from the
 * proper loyalty_transactions ledger this app already has, rather than
 * CI4's redemption-only redeem_tab.
 */
class LoyaltyController extends Controller
{
    public function __construct(private readonly PaginationService $paginationService) {}

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

        $result = $this->paginationService->paginate($query, 'customers', $request, [
            'default_sort'  => 'loyalty_points',
            'default_order' => 'desc',
            'tie_breaker'   => 'id',
            'allowed_sorts' => ['id', 'name', 'phone', 'loyalty_card_number', 'loyalty_points'],
        ]);

        $result['totalPoints'] = (int) Customer::sum('loyalty_points');

        return response()->json($result);
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

        $result = $this->paginationService->paginate($query, 'stock_transactions', $request, [
            'default_sort'  => 'id',
            'default_order' => 'desc',
            'tie_breaker'   => 'id',
            'allowed_sorts' => ['id', 'created_at'],
        ]);

        return response()->json($result);
    }
}
