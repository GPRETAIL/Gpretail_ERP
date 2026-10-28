<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** One explicit form contract; omitted fields never reset saved values. */
class ProductFormData
{
    private const INPUTS = [
        'name' => ['name'], 'code' => ['code'], 'sku' => ['sku'],
        'barcode' => ['barcode', 'barcode_id', 'barcodeID'],
        'category_id' => ['category_id', 'product_group_id', 'productGroup'],
        'brand_id' => ['brand_id', 'brand'], 'sales_tax_id' => ['sales_tax_id', 'salesTax', 'tax_id'],
        'purchase_tax_id' => ['purchase_tax_id', 'purchaseTax'], 'size_group_id' => ['size_group_id', 'sizeGroup'],
        'company_id' => ['company_id', 'company'], 'hsn_code' => ['hsn_code', 'hsn'], 'unit' => ['unit', 'uom'],
        'type' => ['type'], 'section' => ['section'], 'selling_mode' => ['selling_mode', 'sellingMode'],
        'barcode_mode' => ['barcode_mode', 'barcodeMode'], 'barcode_source' => ['barcode_source', 'barcodeSource'],
        'discount_mode' => ['discount_mode', 'discountMode'], 'discount_mode_value' => ['discount_mode_value', 'discountModeValue'],
        'margin_min' => ['margin_min', 'marginMin'], 'margin_max' => ['margin_max', 'marginMax'],
        'stock_holding_period' => ['stock_holding_period', 'stockHoldingPeriod'], 'purchase_plan_mode' => ['purchase_plan_mode', 'purchasePlanMode'],
        'expected_gender' => ['expected_gender', 'expectedGender'], 'dumping' => ['dumping'], 'dumping_value' => ['dumping_value', 'dumpingValue'],
        'cess' => ['cess'], 'cess_value' => ['cess_value', 'cessValue'], 'daily_price' => ['daily_price', 'dailyPrice'],
        'daily_price_value' => ['daily_price_value', 'dailyPriceValue'], 'is_core' => ['is_core', 'isCore'], 'is_core_value' => ['is_core_value', 'isCoreValue'],
        'exclude_reward' => ['exclude_reward', 'excludeReward'], 'auto_po' => ['auto_po', 'autoPO'], 'auto_po_value' => ['auto_po_value', 'autoPOValue'],
        'purchase_entry_attributes' => ['purchase_entry_attributes', 'purchaseEntryAttrs'],
        'cost_price' => ['cost_price'], 'selling_price' => ['selling_price'], 'mrp' => ['mrp'],
        'min_stock' => ['min_stock'], 'max_stock' => ['max_stock'], 'is_active' => ['active', 'is_active'],
        'description' => ['description'], 'image' => ['image'], 'pack_size' => ['pack_size', 'packSize'],
    ];

    public function prepare(Request $request, ?Product $existing = null): array
    {
        $request->validate(['pack_size' => 'nullable|integer|min:0', 'packSize' => 'nullable|integer|min:0']);
        $input = $request->all();
        $data = [];
        foreach (self::INPUTS as $field => $aliases) {
            foreach ($aliases as $alias) {
                if (array_key_exists($alias, $input)) {
                    $data[$field] = $input[$alias];
                    break;
                }
            }
        }
        if (! $existing) {
            $data['code'] = ($data['code'] ?? null) ?: (($data['sku'] ?? null) ?: 'PRD_'.strtoupper(substr(uniqid(), -6)));
            $data['barcode'] = $data['barcode'] ?? $data['code'];
            $data += ['cost_price' => 0, 'selling_price' => 0, 'mrp' => 0, 'min_stock' => 0, 'max_stock' => 1000, 'is_active' => true];
            if (! array_key_exists('purchase_tax_id', $data)) {
                $data['purchase_tax_id'] = $data['sales_tax_id'] ?? null;
            }
        }
        foreach (['dumping', 'cess', 'daily_price', 'is_core', 'exclude_reward', 'auto_po', 'is_active'] as $field) {
            if (array_key_exists($field, $data)) {
                $data[$field] = filter_var($data[$field], FILTER_VALIDATE_BOOLEAN);
            }
        }
        foreach (['cost_price', 'selling_price', 'mrp', 'min_stock', 'max_stock'] as $field) {
            if (array_key_exists($field, $data) && ($data[$field] === '' || $data[$field] === null)) {
                $data[$field] = 0;
            }
        }
        if (array_key_exists('category_id', $data) && ! array_key_exists('category_id', $input)) {
            $group = $data['category_id'] ? StoreQuery::table('attribute_values')->where('id', $data['category_id'])
                ->whereIn('attribute_type_id', StoreQuery::table('attribute_types')->where('code', 'productgroups')->select('id'))->first() : null;
            if ($group) {
                $category = Category::firstOrCreate(['name' => $group->name], ['code' => 'PG-'.$group->id, 'is_active' => true]);
                $data['category_id'] = $category->id;
                $data['master_details'] = array_replace($existing?->master_details ?? [], ['product_group_attribute_id' => $group->id]);
            } else {
                $data['master_details'] = array_replace($existing?->master_details ?? [], ['product_group_attribute_id' => null]);
            }
        } elseif (array_key_exists('category_id', $data)) {
            $data['master_details'] = array_replace($existing?->master_details ?? [], ['product_group_attribute_id' => null]);
        }
        foreach (['category_id' => 'categories', 'brand_id' => 'brands', 'sales_tax_id' => 'taxes', 'purchase_tax_id' => 'taxes', 'size_group_id' => 'size_groups'] as $field => $table) {
            if (! array_key_exists($field, $data)) {
                continue;
            }
            if ($data[$field] === '' || $data[$field] === null) {
                $data[$field] = null;

                continue;
            }
            $query = StoreQuery::table($table);
            $match = is_numeric($data[$field]) ? $query->where('id', $data[$field])->first()
                : $query->where(fn ($q) => $q->where('name', $data[$field])->orWhere('code', $data[$field]))->first();
            if (! $match) {
                throw ValidationException::withMessages([$field => 'Select a valid record from this store.']);
            }
            $data[$field] = $match->id;
        }
        if (array_key_exists('sales_tax_id', $data)) {
            $data['tax_id'] = $data['sales_tax_id'];
        }
        if ($existing && $request->user()) {
            $data['updated_by'] = $request->user()->name ?: $request->user()->username;
        }

        return $data;
    }
}
