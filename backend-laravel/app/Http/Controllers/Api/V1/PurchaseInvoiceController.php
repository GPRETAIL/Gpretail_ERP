<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseInvoiceItem;
use App\Models\Supplier;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PurchaseInvoiceController extends Controller
{
    public function __construct(private readonly StockService $stockService)
    {
    }

    public function index(Request $request)
    {
        $query = PurchaseInvoice::with(['supplier', 'items.product', 'transport']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                  ->orWhere('supplier_invoice_no', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
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
            'supplier_id'  => 'nullable|exists:suppliers,id',
            'invoice_date' => 'nullable|date',
            'items'        => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|numeric|min:0.01',
            'items.*.rate'       => 'required|numeric|min:0',
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
            $supplierId = $request->input('supplier_id');
            if (!$supplierId) {
                $defaultSupplier = Supplier::first();
                $supplierId = $defaultSupplier ? $defaultSupplier->id : 1;
            }

            $invoiceNo = $request->input('invoice_no') ?: 'PINV-' . date('Ymd') . '-' . rand(1000, 9999);

            $subtotal = 0;
            $taxAmount = 0;
            $itemsData = $request->input('items', []);

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $rate = (float) ($item['rate'] ?? $item['unit_price'] ?? 0);
                $itemTax = (float) ($item['tax_amount'] ?? 0);
                $subtotal += ($qty * $rate);
                $taxAmount += $itemTax;
            }

            $grandTotal = $subtotal + $taxAmount;

            $purchaseInvoice = PurchaseInvoice::create([
                'store_id'            => $storeId,
                'supplier_id'         => $supplierId,
                'invoice_no'          => $invoiceNo,
                'invoice_date'        => $request->input('invoice_date') ?: now()->toDateString(),
                'supplier_invoice_no' => $request->input('supplier_invoice_no'),
                'subtotal'            => $subtotal,
                'tax_amount'          => $taxAmount,
                'grand_total'         => $grandTotal,
                'status'              => $request->input('status', 'APPROVED'),
                'notes'               => $request->input('notes'),
                'created_by'          => $request->user()?->id ?? 1,
            ]);

            foreach ($itemsData as $item) {
                $qty = (float) ($item['quantity'] ?? 1);
                $rate = (float) ($item['rate'] ?? $item['unit_price'] ?? 0);
                $total = ($qty * $rate) + (float) ($item['tax_amount'] ?? 0);

                PurchaseInvoiceItem::create([
                    'purchase_invoice_id' => $purchaseInvoice->id,
                    'product_id'          => $item['product_id'],
                    'variant_id'          => $item['variant_id'] ?? null,
                    'quantity'            => $qty,
                    'rate'                => $rate,
                    'tax_id'              => $item['tax_id'] ?? null,
                    'tax_amount'          => $item['tax_amount'] ?? 0,
                    'discount'            => $item['discount'] ?? 0,
                    'total'               => $total,
                ]);

                $this->stockService->adjust(
                    storeId: (int) $storeId,
                    productId: (int) $item['product_id'],
                    variantId: isset($item['variant_id']) ? (int) $item['variant_id'] : null,
                    delta: $qty,
                    referenceType: 'PURCHASE_INVOICE',
                    referenceId: $purchaseInvoice->id,
                    costPrice: $rate,
                    userId: $request->user()?->id,
                );
            }

            return $purchaseInvoice;
        });

        return response()->json([
            'success' => true,
            'message' => 'Purchase invoice created successfully',
            'data'    => $invoice->load(['supplier', 'items.product']),
        ], 201);
    }

    public function show($id)
    {
        $invoice = PurchaseInvoice::with(['supplier', 'items.product', 'transport'])->find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase invoice not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $invoice,
        ]);
    }

    public function update(Request $request, $id)
    {
        $invoice = PurchaseInvoice::find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase invoice not found',
            ], 404);
        }

        $invoice->update($request->only([
            'supplier_id', 'invoice_date', 'supplier_invoice_no', 'status', 'notes'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Purchase invoice updated successfully',
            'data'    => $invoice->load(['supplier', 'items.product']),
        ]);
    }

    public function destroy($id)
    {
        $invoice = PurchaseInvoice::with('items')->find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase invoice not found',
            ], 404);
        }

        try {
            DB::transaction(function () use ($invoice) {
                foreach ($invoice->items as $item) {
                    $this->stockService->adjust(
                        storeId: (int) $invoice->store_id,
                        productId: (int) $item->product_id,
                        variantId: $item->variant_id ? (int) $item->variant_id : null,
                        delta: -(float) $item->quantity,
                        referenceType: 'PURCHASE_INVOICE',
                        referenceId: $invoice->id,
                        costPrice: (float) $item->rate,
                    );
                }

                $invoice->items()->delete();
                $invoice->delete();
            });
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this invoice: reversing it would take stock negative (some of it has likely already been sold or moved). ' . $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Purchase invoice deleted successfully',
        ]);
    }
}
