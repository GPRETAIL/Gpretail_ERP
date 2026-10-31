<?php

namespace App\Services;

use App\Models\PurchaseInvoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Commercial invoice headers precede product intake; saving one must not add stock. */
class WarehouseInvoiceForm
{
    private const DETAILS = 'transport_entry_id company_name supplier_name entry_date lr_entry_no lr_no lr_expense interstate credit_note bill_value expense_perc expense_amt pieces bundles tax_included discount_on_total tds internal_vendor rcm agent_commission pcs_discount gross_amount rounding po_type po_no';

    public function save(Request $request, int $storeId, ?PurchaseInvoice $existing = null): PurchaseInvoice
    {
        return DB::transaction(function () use ($request, $storeId, $existing) {
            $input = MasterFormData::normalize($request->all());
            $base = $existing ? array_merge($existing->master_details ?? [], $existing->only(['supplier_id', 'invoice_no', 'invoice_date']), [
                'base_amount' => $existing->subtotal, 'tax_charges' => $existing->tax_amount,
                'discount' => $existing->discount_amount, 'net_amount' => $existing->grand_total,
            ]) : [];
            $data = array_replace($base, $input);
            $validated = validator($data, [
                'supplier_id' => 'required|integer', 'transport_entry_id' => 'required|integer',
                'invoice_no' => 'required|string|max:100', 'invoice_date' => 'required|date', 'entry_date' => 'required|date',
                'items' => 'sometimes|array', 'items.*' => 'array',
                'base_amount' => 'nullable|numeric|min:0', 'tax_charges' => 'nullable|numeric|min:0',
                'discount' => 'nullable|numeric|min:0', 'net_amount' => 'nullable|numeric|min:0',
            ])->validate();
            foreach (['supplier_id' => 'suppliers', 'transport_entry_id' => 'transport_entries'] as $field => $table) {
                if (! StoreQuery::table($table)->where('id', $validated[$field])->exists()) {
                    throw ValidationException::withMessages([$field => 'Select a valid record from this store.']);
                }
            }
            $details = array_intersect_key($data, array_flip(explode(' ', self::DETAILS)));
            $details['workflow'] = 'warehouse_invoice';
            $details['warehouse_items'] = array_key_exists('items', $input)
                ? array_map(fn ($row) => array_intersect_key(MasterFormData::normalize($row), array_flip([
                    'type', 'amount_on', 'dis_perc', 'discount', 'tax_id', 'tax_perc', 'net_amount',
                ])), $input['items']) : ($existing?->master_details['warehouse_items'] ?? []);
            foreach ($details['warehouse_items'] as $row) {
                if (! empty($row['tax_id']) && ! StoreQuery::table('taxes')->where('id', $row['tax_id'])->exists()) {
                    throw ValidationException::withMessages(['items' => 'Select a valid tax from this store.']);
                }
            }
            $attributes = [
                'supplier_id' => $validated['supplier_id'], 'transport_entry_id' => (int) $validated['transport_entry_id'], 'invoice_no' => $validated['invoice_no'],
                'invoice_date' => $validated['invoice_date'], 'subtotal' => $data['base_amount'] ?? 0,
                'tax_amount' => $data['tax_charges'] ?? 0, 'discount_amount' => $data['discount'] ?? 0,
                'grand_total' => $data['net_amount'] ?? 0, 'master_details' => $details,
            ];
            if ($existing) {
                $existing->update($attributes);
                $invoice = $existing;
            } else {
                $invoice = PurchaseInvoice::create($attributes + ['store_id' => $storeId, 'status' => 'PENDING', 'payment_status' => 'UNPAID']);
            }

            return $invoice->load(['supplier', 'company:id,name']);
        });
    }
}
