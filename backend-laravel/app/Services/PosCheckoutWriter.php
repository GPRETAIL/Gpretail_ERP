<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\PosSale;
use App\Models\ProductVariant;
use App\Models\Stock;
use App\Models\StockBatch;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Bulk persistence exclusively for a new POS sale, inside its outer transaction.
 * Ownership is validated by scoped reads before the query-builder writes below;
 * this deliberately does not disable model scopes or cache authorization results.
 */
class PosCheckoutWriter
{
    public function write(PosSale $sale, array $items, Collection $products, Collection $barcodes): void
    {
        if (DB::transactionLevel() < 1) {
            throw new \LogicException('POS persistence requires a transaction.');
        }
        $variantIds = array_values(array_unique(array_filter(array_column($items, 'variantId'))));
        $variants = $variantIds ? ProductVariant::whereKey($variantIds)->get()->keyBy('id') : collect();
        foreach ($items as $index => $item) {
            if (! empty($item['variantId'])) {
                $variant = $variants->get($item['variantId']);
                if (! $variant || (int) $variant->product_id !== (int) $item['productId']) {
                    throw ValidationException::withMessages(["items.$index.variantId" => 'This variant does not belong to the selected product and store.']);
                }
            }
        }

        // Every stock/batch lock is acquired in deterministic order before writes.
        $stocks = Stock::where('store_id', $sale->store_id)->whereIn('product_id', $products->keys())
            ->orderBy('id')->lockForUpdate()->get()->keyBy(fn ($stock) => $stock->product_id.':'.($stock->variant_id ?: 0));
        $batches = $variantIds ? StockBatch::where('store_id', $sale->store_id)->whereIn('variant_id', $variantIds)
            ->where('remaining_qty', '>', 0)->orderBy('received_at')->orderBy('id')->lockForUpdate()->get()->groupBy('variant_id') : collect();
        $timestamp = now()->toDateTimeString();
        $lines = $movements = $allocations = $changedStocks = $changedBatches = [];
        foreach ($items as $index => $item) {
            $qty = (float) $item['qty'];
            $price = (float) $item['price'];
            $discount = (float) ($item['discount'] ?? 0);
            $taxRate = (float) ($item['tax'] ?? 0);
            $lineSub = $qty * $price - $discount;
            $lineTax = $lineSub * $taxRate / 100;
            $stock = $stocks->get($item['productId'].':'.(($item['variantId'] ?? null) ?: 0));
            $before = (float) ($stock?->quantity ?? 0);
            $after = $before - $qty;
            if (! $stock || $after < -0.0005) {
                throw new InsufficientStockException((int) $item['productId'], $before, $qty);
            }
            $stock->quantity = max(0, $after);
            $changedStocks[$stock->id] = ['quantity' => $stock->quantity, 'available_quantity' => (float) $stock->quantity - (float) $stock->allocated_quantity];
            $lines[] = [
                'pos_sale_id' => $sale->id, 'product_id' => $item['productId'], 'variant_id' => $item['variantId'] ?? null,
                'barcode_id' => $item['barcodeId'] ?? null, 'quantity' => $qty, 'unit_mrp' => $item['mrp'] ?? $price,
                'selling_price' => $price, 'discount' => $discount, 'tax_rate' => $taxRate, 'tax_amount' => $lineTax,
                'subtotal' => $lineSub + $lineTax, 'tax_name' => $item['taxName'] ?? null, 'tax_type' => $item['taxType'] ?? null,
                'cost_price' => $item['cost'] ?? null, 'sales_man_id' => $item['salesManId'] ?? null, 'sales_man_name' => $item['salesManName'] ?? null,
                'created_at' => $timestamp, 'updated_at' => $timestamp,
            ];
            $movements[] = [
                'store_id' => $sale->store_id, 'product_id' => $item['productId'], 'variant_id' => $item['variantId'] ?? null,
                'reference_type' => 'POS_SALE', 'reference_id' => $sale->id, 'type' => 'OUT', 'quantity' => $qty,
                'before_qty' => $before, 'after_qty' => max(0, $after), 'cost_price' => $price, 'created_by' => $sale->user_id,
                'created_at' => $timestamp, 'updated_at' => $timestamp,
            ];
            $remaining = $qty;
            foreach ($batches->get($item['variantId'] ?? null, collect()) as $batch) {
                if ($remaining <= 0.0005) {
                    break;
                }
                $take = min($remaining, (float) $batch->remaining_qty);
                if ($take <= 0) {
                    continue;
                }
                $batch->remaining_qty = (float) $batch->remaining_qty - $take;
                $changedBatches[$batch->id] = ['remaining_qty' => $batch->remaining_qty];
                $allocations[] = ['line' => $index, 'stock_batch_id' => $batch->id, 'quantity' => $take, 'created_at' => $timestamp, 'updated_at' => $timestamp];
                $remaining -= $take;
            }
            // As in StockService, stock predating FIFO tracking may lack batches.
            // Aggregate locked stock above remains the source of availability.
        }

        foreach (array_chunk($lines, 200) as $chunk) {
            DB::table('pos_sale_items')->insert($chunk);
        }
        foreach (array_chunk($movements, 200) as $chunk) {
            DB::table('stock_transactions')->insert($chunk);
        }
        // Do not assume contiguous auto-increment IDs: other tills may insert.
        $ids = DB::table('stock_transactions')->where('store_id', $sale->store_id)
            ->where('reference_type', 'POS_SALE')->where('reference_id', $sale->id)->orderBy('id')->pluck('id');
        if ($ids->count() !== count($movements)) {
            throw new \LogicException('POS stock audit rows could not be reconciled.');
        }
        foreach ($allocations as &$allocation) {
            $allocation['stock_transaction_id'] = $ids[$allocation['line']];
            unset($allocation['line']);
        }
        unset($allocation);
        foreach (array_chunk($allocations, 200) as $chunk) {
            DB::table('stock_batch_allocations')->insert($chunk);
        }
        $this->updateLockedRows('stocks', $changedStocks, $timestamp);
        $this->updateLockedRows('stock_batches', $changedBatches, $timestamp);
        $pieceIds = $barcodes->filter(fn ($barcode) => strtoupper((string) ($products->get($barcode->product_id)->selling_mode ?: 'PIECE')) === 'PIECE')->keys();
        if ($pieceIds->isNotEmpty()) {
            DB::table('barcodes')->whereIn('id', $pieceIds)->update(['is_active' => false, 'updated_at' => $timestamp]);
        }
    }

    /** Only IDs obtained from the locked store-owned rows above are accepted. */
    private function updateLockedRows(string $table, array $rows, string $timestamp): void
    {
        foreach (array_chunk($rows, 200, true) as $chunk) {
            $updates = ['updated_at' => $timestamp];
            foreach (array_keys(reset($chunk)) as $column) {
                $case = 'CASE id';
                foreach ($chunk as $id => $values) {
                    $case .= ' WHEN '.(int) $id.' THEN '.number_format((float) $values[$column], 3, '.', '');
                }
                $updates[$column] = DB::raw($case.' END');
            }
            DB::table($table)->whereIn('id', array_keys($chunk))->update($updates);
        }
    }
}
