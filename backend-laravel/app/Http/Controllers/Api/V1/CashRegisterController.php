<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CashRegisterSession;
use App\Models\PosSale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CashRegisterController extends Controller
{
    // Cash Opening List
    public function openingIndex(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $sessions = CashRegisterSession::with('user')
            ->where('store_id', $storeId)
            ->orderBy('opened_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $sessions,
            'total'   => $sessions->count(),
        ]);
    }

    // Cash Opening Action
    public function openingStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'opening_cash' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);
        $userId = $request->user()?->id ?? 1;

        // Close any existing open session or create new
        $session = CashRegisterSession::create([
            'store_id'     => $storeId,
            'user_id'      => $userId,
            'opened_at'    => now(),
            'opening_cash' => $request->input('opening_cash'),
            'status'       => 'OPEN',
            'notes'        => $request->input('notes'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cash register opened successfully',
            'data'    => $session,
        ], 201);
    }

    public function openingMeta(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $lastSession = CashRegisterSession::where('store_id', $storeId)
            ->orderBy('id', 'desc')
            ->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'has_open_session' => $lastSession && $lastSession->status === 'OPEN',
                'last_closing_cash' => $lastSession ? $lastSession->closing_cash : 0,
                'session' => $lastSession,
            ],
        ]);
    }

    // Cash Closing List
    public function closingIndex(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $sessions = CashRegisterSession::with('user')
            ->where('store_id', $storeId)
            ->where('status', 'CLOSED')
            ->orderBy('closed_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $sessions,
            'total'   => $sessions->count(),
        ]);
    }

    // Cash Closing Action
    public function closingStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'closing_cash' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);
        $session = CashRegisterSession::where('store_id', $storeId)
            ->where('status', 'OPEN')
            ->orderBy('id', 'desc')
            ->first();

        if (!$session) {
            $session = CashRegisterSession::where('store_id', $storeId)
                ->orderBy('id', 'desc')
                ->first();
        }

        if ($session) {
            $closingCash = (float) $request->input('closing_cash');
            $openingCash = (float) $session->opening_cash;
            $cashSales = (float) PosSale::where('store_id', $storeId)
                ->where('created_at', '>=', $session->opened_at)
                ->where('payment_mode', 'CASH')
                ->sum('paid_amount');

            $expectedCash = $openingCash + $cashSales;
            $difference = $closingCash - $expectedCash;

            $session->update([
                'closed_at'     => now(),
                'closing_cash'  => $closingCash,
                'expected_cash' => $expectedCash,
                'difference'    => $difference,
                'status'        => 'CLOSED',
                'notes'         => $request->input('notes'),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Cash register closed successfully',
            'data'    => $session,
        ]);
    }

    public function closingMeta(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $session = CashRegisterSession::where('store_id', $storeId)
            ->where('status', 'OPEN')
            ->orderBy('id', 'desc')
            ->first();

        $openingCash = $session ? (float) $session->opening_cash : 0;
        $cashSales = $session ? (float) PosSale::where('store_id', $storeId)
            ->where('created_at', '>=', $session->opened_at)
            ->where('payment_mode', 'CASH')
            ->sum('paid_amount') : 0;

        return response()->json([
            'success' => true,
            'data'    => [
                'opening_cash'  => $openingCash,
                'cash_sales'    => $cashSales,
                'expected_cash' => $openingCash + $cashSales,
                'opened_at'     => $session ? $session->opened_at : null,
            ],
        ]);
    }

    public function closingNextBillNo()
    {
        $latest = PosSale::max('id') + 1;
        $nextNo = 'BILL-' . date('Ymd') . '-' . str_pad($latest, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'data'    => $nextNo,
            'next_bill_no' => $nextNo,
        ]);
    }

    public function openingAmount(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $session = CashRegisterSession::where('store_id', $storeId)
            ->where('status', 'OPEN')
            ->orderBy('id', 'desc')
            ->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'opening_cash' => $session ? $session->opening_cash : 0,
            ],
        ]);
    }
}
