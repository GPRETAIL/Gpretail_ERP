<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Barcode;
use App\Models\PosSale;
use App\Models\Stock;
use App\Services\ApprovalService;
use App\Services\BusinessPermissions;
use App\Services\PosCounter;
use App\Services\PosOfflineBilling;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * What a POS till downloads while online so it can keep billing through an internet outage (see
 * PosOfflineBilling), and the manager's list of offline bills that synced with something to check.
 */
class PosOfflineController extends Controller
{
    private const PAGE = 2000;

    /** The counter's offline number series and the cashier's discount limit. */
    public function series(Request $request, ApprovalService $approvals): JsonResponse
    {
        $storeId = $this->store($request);
        $user = $request->user();
        $limit = $approvals->enabled($storeId) ? $approvals->limitFor($user, $storeId)['max_discount_percent'] : null;

        return response()->json(['success' => true, 'data' => [
            'store_id' => $storeId,
            'series' => PosOfflineBilling::series($storeId, PosCounter::find($user->counter_id, $storeId)),
            'max_discount_percent' => $limit,
            'max_age_days' => PosOfflineBilling::MAX_AGE_DAYS,
        ]]);
    }

    /**
     * Sellable stock, one page at a time (keyset on id, so pages stay fast on a large store).
     * kind=barcodes: every scannable barcode with stock; kind=products: product-level stock for
     * items sold by their product barcode/code without unit barcodes. Rows have the same shape as
     * /pos-sales/stock-products, which the POS already understands.
     */
    public function catalog(Request $request): JsonResponse
    {
        $storeId = $this->store($request);
        $after = max(0, (int) $request->input('after', 0));
        $kind = $request->input('kind') === 'products' ? 'products' : 'barcodes';

        if ($kind === 'barcodes') {
            $page = Barcode::where('is_active', true)->where('id', '>', $after)->orderBy('id')->limit(self::PAGE)
                ->with(['product:id,name,code,barcode,hsn_code,selling_mode,selling_price,mrp,cost_price,tax_id', 'product.tax:id,name,rate,type'])->get();
            $stock = Stock::where('store_id', $storeId)->whereIn('variant_id', $page->pluck('variant_id')->filter()->unique())
                ->pluck('quantity', 'variant_id');
            $rows = $page->filter(fn ($barcode) => $barcode->product && $barcode->variant_id && (float) ($stock[$barcode->variant_id] ?? 0) > 0)
                ->map(fn ($barcode) => $this->row($barcode->product, (float) $stock[$barcode->variant_id], [
                    'barcode' => $barcode->barcode, 'barcodeId' => $barcode->id, 'variantId' => $barcode->variant_id,
                    'price' => (float) ($barcode->selling_price ?: $barcode->product->selling_price), 'mrp' => (float) ($barcode->mrp ?: $barcode->product->mrp),
                ]));
        } else {
            $page = Stock::where('store_id', $storeId)->whereNull('variant_id')->where('quantity', '>', 0)->where('id', '>', $after)->orderBy('id')->limit(self::PAGE)
                ->with(['product:id,name,code,barcode,hsn_code,selling_mode,selling_price,mrp,cost_price,tax_id', 'product.tax:id,name,rate,type'])->get();
            $rows = $page->filter(fn ($stock) => $stock->product)->map(fn ($stock) => $this->row($stock->product, (float) $stock->quantity, [
                'barcode' => $stock->product->barcode ?: $stock->product->code, 'barcodeId' => null, 'variantId' => null,
                'price' => (float) $stock->product->selling_price, 'mrp' => (float) $stock->product->mrp,
            ]));
        }

        return response()->json(['success' => true, 'data' => $rows->values(), 'meta' => [
            'kind' => $kind, 'next' => $page->count() === self::PAGE ? $page->last()->id : null,
        ]]);
    }

    /** Offline bills that synced with points to check; ?status=all includes those already checked. */
    public function review(Request $request): JsonResponse
    {
        $storeId = $this->store($request);
        $sales = PosSale::where('store_id', $storeId)->whereNotNull('offline_billed_at')->whereNotNull('sync_review')
            ->when($request->input('status') !== 'all', fn ($query) => $query->whereNull('sync_reviewed_at'))
            ->with(['user:id,name'])->latest('offline_billed_at')->limit(500)->get();

        return response()->json(['success' => true, 'data' => $sales->map(fn (PosSale $sale) => [
            'id' => $sale->id, 'bill_no' => $sale->bill_no, 'invoice_no' => $sale->invoice_no, 'billed_at' => $sale->offline_billed_at?->toIso8601String(),
            'synced_at' => $sale->updated_at?->toIso8601String(), 'counter_name' => $sale->counter_name, 'cashier' => $sale->user?->name,
            'grand_total' => (float) $sale->grand_total, 'issues' => $sale->sync_review, 'reviewed_at' => $sale->sync_reviewed_at?->toIso8601String(),
            'review_note' => $sale->sync_review_note,
        ])]);
    }

    public function markReviewed(Request $request, int $id, BusinessPermissions $permissions): JsonResponse
    {
        abort_unless($permissions->allows($request->user(), 'transactions.approve'), 403, 'Only a manager can sign off offline bills.');
        $data = $request->validate(['note' => 'nullable|string|max:500']);
        $sale = PosSale::where('store_id', $this->store($request))->whereNotNull('sync_review')->findOrFail($id);
        $sale->forceFill(['sync_reviewed_at' => now(), 'sync_reviewed_by' => $request->user()->id, 'sync_review_note' => $data['note'] ?? null])->save();

        return response()->json(['success' => true, 'message' => "Bill {$sale->bill_no} marked as checked"]);
    }

    private function row($product, float $qty, array $fields): array
    {
        $sellingMode = strtoupper((string) ($product->selling_mode ?: 'PIECE'));

        return [
            'productId' => $product->id, 'sellingMode' => $sellingMode, 'requiresQuantityPrompt' => in_array($sellingMode, ['PACK', 'CUT'], true),
            'code' => $product->code, 'productName' => $product->name, 'hsnCode' => $product->hsn_code, 'qty' => $qty,
            'cost' => (float) $product->cost_price, 'tax' => (float) ($product->tax->rate ?? 0), 'taxName' => $product->tax?->name, 'taxType' => $product->tax?->type,
            ...$fields,
        ];
    }

    private function store(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id');
        if (! $storeId) {
            throw ValidationException::withMessages(['store' => 'Select a store first; offline billing works one store at a time.']);
        }

        return $storeId;
    }
}
