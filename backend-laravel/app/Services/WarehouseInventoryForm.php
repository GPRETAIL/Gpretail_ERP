<?php

namespace App\Services;

use App\Models\Barcode;
use App\Models\InventoryEntry;
use App\Models\InventoryEntryItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The warehouse inventory step of the LR workflow (LR -> invoice -> inventory -> barcodes): one
 * product with its size/design rows, linked to its LR and invoice. Rows add stock as they are
 * saved; editing replaces the rows (and their stock) until barcodes are printed for them.
 */
class WarehouseInventoryForm
{
    private const LINKS = ['transport_entry_id', 'invoice_id', 'supplier_id', 'product_id', 'brand_id', 'pattern_id', 'style_id',
        'fit_id', 'sleeve_id', 'type_id', 'material_id', 'color_id', 'tax_id'];

    private const DETAILS = 'company_name supplier_name product_name brand_name hsn_code buying_price p_tax discount item_value total
        purchase_order serial_no batch_expiry invoice_workflow_status item_name colour_option multiple_price upload_barcode weight wastage working_charge';

    private const ROW_DETAILS = ['qty', 'cost', 'p_dis', 'margin_perc', 'margin', 'mrp', 'price', 'amount', 'selling_price', 'discount_perc', 'final_price'];

    public function __construct(
        private readonly StockService $stock,
        private readonly VariantResolverService $variants,
    ) {}

    /** The warehouse form posts one product with rows that carry no product_id of their own. */
    public static function handles(Request $request): bool
    {
        return ($request->has('transportEntryId') || $request->has('productId'))
            && collect($request->input('items', []))->every(fn ($row) => empty($row['product_id']));
    }

    public function save(Request $request, int $storeId, ?InventoryEntry $existing = null): InventoryEntry
    {
        $input = MasterFormData::normalize($request->all());
        $data = $this->validate($existing ? array_replace($this->current($existing), $input) : $input, $existing);

        return DB::transaction(function () use ($request, $storeId, $existing, $data, $input) {
            $replaceRows = ! $existing || array_key_exists('items', $input);
            if ($existing && $replaceRows && Barcode::where('inventory_entry_id', $existing->id)->exists()) {
                throw ValidationException::withMessages(['items' => 'Barcodes are already generated for this entry, so its rows cannot change. Only the details can be edited.']);
            }
            $rows = array_map(fn ($row) => MasterFormData::normalize($row), $data['items'] ?? []);
            $total = $data['total'] ?? array_sum(array_map(fn ($row) => (float) ($row['amount'] ?? 0), $rows));
            $attributes = [
                ...array_intersect_key($data, array_flip(self::LINKS)),
                'type' => 'PURCHASE', 'total_amount' => (float) $total,
                'master_details' => array_intersect_key($data, array_flip(preg_split('/\s+/', self::DETAILS))),
            ];
            if ($existing) {
                $existing->update($attributes);
                $entry = $existing;
            } else {
                $entry = InventoryEntry::create($attributes + [
                    'store_id' => $storeId, 'entry_no' => DocumentNumberService::resolve($request, $storeId, 'IE'),
                    'entry_date' => $data['entry_date'] ?? now()->toDateString(), 'status' => 'COMPLETED', 'created_by' => $request->user()?->id,
                ]);
            }
            if ($replaceRows) {
                $this->removeRows($entry, $request->user()?->id);
                $this->addRows($entry, $rows, $request->user()?->id);
            }

            return $entry;
        });
    }

    /** Reverses the rows' stock; used on delete and before rows are replaced. */
    public function removeRows(InventoryEntry $entry, ?int $userId = null): void
    {
        foreach ($entry->items()->get() as $item) {
            $this->stock->adjust((int) $entry->store_id, (int) $item->product_id, $item->variant_id ? (int) $item->variant_id : null,
                -(float) $item->quantity, 'INVENTORY_ENTRY', $entry->id, (float) $item->unit_price, $userId);
            $item->delete();
        }
    }

    private function addRows(InventoryEntry $entry, array $rows, ?int $userId): void
    {
        foreach ($rows as $index => $row) {
            $qty = (float) $row['qty'];
            $cost = (float) ($row['cost'] ?? 0);
            $variant = $this->variants->resolve((int) $entry->product_id, $entry->brand_id ? (int) $entry->brand_id : null,
                $row['size'] ?? null, $entry->color_id ? (int) $entry->color_id : null, $row['design_no'] ?? null);
            InventoryEntryItem::create([
                'inventory_entry_id' => $entry->id, 'product_id' => $entry->product_id, 'variant_id' => $variant->id,
                'quantity' => $qty, 'unit_price' => $cost, 'total_price' => (float) ($row['amount'] ?? $qty * $cost),
                's_no' => (int) ($row['s_no'] ?? $index + 1), 'size' => $row['size'] ?? null, 'design_no' => $row['design_no'] ?? null,
                'master_details' => array_intersect_key($row, array_flip(self::ROW_DETAILS)),
            ]);
            $this->stock->adjust((int) $entry->store_id, (int) $entry->product_id, $variant->id, $qty, 'INVENTORY_ENTRY', $entry->id, $cost, $userId);
        }
    }

    private function current(InventoryEntry $entry): array
    {
        return array_replace($entry->master_details ?? [], $entry->only(self::LINKS));
    }

    private function validate(array $data, ?InventoryEntry $existing): array
    {
        $validated = validator($data, [
            'transport_entry_id' => [$existing ? 'nullable' : 'required', 'integer'],
            'invoice_id' => 'nullable|integer', 'supplier_id' => 'nullable|integer',
            'product_id' => 'required|integer',
            ...array_fill_keys(['brand_id', 'pattern_id', 'style_id', 'fit_id', 'sleeve_id', 'type_id', 'material_id', 'color_id', 'tax_id'], 'nullable|integer'),
            'items' => [$existing ? 'sometimes' : 'required', 'array', 'min:1'],
            'items.*.qty' => 'required|numeric|gt:0',
            'items.*.size' => 'nullable|string|max:100', 'items.*.designNo' => 'nullable|string|max:100',
            ...array_fill_keys(array_map(fn ($key) => 'items.*.'.lcfirst(str_replace('_', '', ucwords($key, '_'))), array_diff(self::ROW_DETAILS, ['qty'])), 'nullable|numeric'),
            'total' => 'nullable|numeric|min:0', 'entry_date' => 'nullable|date',
        ])->validate();
        // Every link must point at a record of this store (the store scope applies to these tables).
        foreach (['transport_entry_id' => 'transport_entries', 'invoice_id' => 'purchase_invoices', 'supplier_id' => 'suppliers', 'product_id' => 'products', 'brand_id' => 'brands', 'tax_id' => 'taxes'] as $field => $table) {
            if (! empty($validated[$field]) && ! StoreQuery::table($table)->where('id', $validated[$field])->exists()) {
                throw ValidationException::withMessages([$field => 'Select a valid record from this store.']);
            }
        }
        if (! empty($validated['invoice_id']) && ! empty($validated['transport_entry_id'])
            && ! StoreQuery::table('purchase_invoices')->where('id', $validated['invoice_id'])->where('transport_entry_id', $validated['transport_entry_id'])->exists()) {
            throw ValidationException::withMessages(['invoice_id' => 'This invoice belongs to a different LR.']);
        }

        return array_replace($data, $validated);
    }
}
