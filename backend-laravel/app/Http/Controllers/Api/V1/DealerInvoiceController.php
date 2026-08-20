<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\DealerInvoice;
use App\Models\DealerInvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class DealerInvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = DealerInvoice::with(['customer', 'items.product', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('invoice_no', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%");
                  });
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('invoice_date', 'desc')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('invoice_date', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => $paginated->items(),
            'total'   => $paginated->total(),
            'page'    => $paginated->currentPage(),
            'limit'   => $paginated->perPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id'  => 'nullable|exists:customers,id',
            'invoice_date' => 'nullable|date',
            'items'        => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|numeric|min:0.01',
            'items.*.price'      => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $storeId = $request->header('X-Company-Scope-Id', 1);

        $invoice = DB::transaction(function () use ($request, $storeId) {
            $customerId = $request->input('customer_id');
            if (!$customerId) {
                $defaultCustomer = Customer::first();
                $customerId = $defaultCustomer ? $defaultCustomer->id : 1;
            }

            $invoiceNo = $request->input('invoice_no') ?: 'DINV-' . date('Ymd') . '-' . rand(1000, 9999);
            $subtotal = 0;
            $taxAmount = 0;
            $itemsData = $request->input('items', []);

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['price'] ?? 0);
                $tax = (float) ($item['tax_amount'] ?? 0);
                $subtotal += ($qty * $price);
                $taxAmount += $tax;
            }

            $dealerInvoice = DealerInvoice::create([
                'store_id'     => $storeId,
                'customer_id'  => $customerId,
                'invoice_no'   => $invoiceNo,
                'invoice_date' => $request->input('invoice_date') ?: now()->toDateString(),
                'subtotal'     => $subtotal,
                'tax_amount'   => $taxAmount,
                'grand_total'  => $subtotal + $taxAmount,
                'status'       => 'COMPLETED',
                'created_by'   => $request->user()?->id ?? 1,
            ]);

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['price'] ?? 0);
                $tax = (float) ($item['tax_amount'] ?? 0);

                DealerInvoiceItem::create([
                    'dealer_invoice_id' => $dealerInvoice->id,
                    'product_id'        => $item['product_id'],
                    'quantity'          => $qty,
                    'price'             => $price,
                    'tax_amount'        => $tax,
                    'total'             => ($qty * $price) + $tax,
                ]);
            }

            return $dealerInvoice;
        });

        return response()->json([
            'success' => true,
            'message' => 'Dealer invoice created successfully',
            'data'    => $invoice->load(['customer', 'items.product']),
        ], 201);
    }

    public function nextBillNo()
    {
        $latest = DealerInvoice::max('id') + 1;
        $nextNo = 'DINV-' . date('Ymd') . '-' . str_pad($latest, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'data'    => $nextNo,
            'next_bill_no' => $nextNo,
        ]);
    }

    // Dealer Invoice Returns
    public function returnsIndex(Request $request)
    {
        return $this->index($request);
    }

    public function returnsStore(Request $request)
    {
        return $this->store($request);
    }

    public function nextReturnNo()
    {
        $latest = DealerInvoice::max('id') + 1;
        $nextNo = 'DRET-' . date('Ymd') . '-' . str_pad($latest, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'data'    => $nextNo,
            'next_return_no' => $nextNo,
        ]);
    }
}
