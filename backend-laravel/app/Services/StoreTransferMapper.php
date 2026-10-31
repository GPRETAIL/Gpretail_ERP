<?php

namespace App\Services;

use App\Models\AttributeValue;
use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Size;
use App\Models\StockOutwardItem;
use App\Models\Tax;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Stores never see each other's masters (products, brands, sizes, variants, barcodes). A transfer
 * line therefore carries a snapshot taken in the sending store, and the receiving store books it
 * to its own product with the same code. Run each side while that store is the selected context,
 * so lookups see only its masters and anything created belongs to it.
 */
class StoreTransferMapper
{
    public function __construct(private readonly VariantResolverService $variants) {}

    /** Called in the sending store: what was sent, in words the receiving store can use. */
    public function snapshot(int $productId, ?int $variantId): array
    {
        $product = Product::with('tax:id,name')->findOrFail($productId);
        $variant = $variantId ? ProductVariant::with(['size:id,name', 'brand:id,name,code'])->find($variantId) : null;
        $color = $variant?->color_id ? AttributeValue::find($variant->color_id) : null;
        $positive = fn (...$prices) => collect($prices)->first(fn ($price) => (float) $price > 0);

        return [
            'product_name' => $product->name, 'product_code' => $product->code, 'sku' => $product->sku, 'product_barcode' => $product->barcode,
            'selling_mode' => $product->selling_mode, 'hsn_code' => $product->hsn_code, 'unit' => $product->unit,
            'size' => $variant?->size?->name, 'design_no' => $variant?->design_no, 'brand_name' => $variant?->brand?->name, 'brand_code' => $variant?->brand?->code,
            'color_name' => $color?->name, 'tax_name' => $product->tax?->name,
            'mrp' => $positive($variant?->mrp, $product->mrp), 'selling_price' => $positive($variant?->selling_price, $product->selling_price),
        ];
    }

    /**
     * Sizes and colours hang off store-owned groups/types, so they are never invented: a line whose
     * size or colour the receiving store lacks would silently merge into another variant.
     */
    public function assertMastersExist(Collection $items): void
    {
        $missing = [];
        foreach ($items as $item) {
            if ($item->size && ! $this->size($item->size)) {
                $missing['size'][] = $item->size;
            }
            if ($item->color_name && ! $this->color($item->color_name)) {
                $missing['colour'][] = $item->color_name;
            }
        }
        if ($missing) {
            $lists = collect($missing)->map(fn ($names, $type) => $type.' '.implode(', ', array_unique($names)))->implode('; ');
            throw ValidationException::withMessages(['items' => "Add these to this store's masters before receiving: {$lists}."]);
        }
    }

    /** Called in the receiving store: its own product and variant for this line. @return array{0: int, 1: int} */
    public function receivingVariant(StockOutwardItem $item): array
    {
        $product = $this->product($item);
        $brandId = $item->brand_name ? $this->brand($item)->id : null;
        $variant = $this->variants->resolve($product->id, $brandId, $item->size, $this->color($item->color_name)?->id, $item->design_no);
        if ((float) $variant->mrp <= 0 && (float) $variant->selling_price <= 0) {
            $variant->update(['mrp' => $item->mrp ?? 0, 'selling_price' => $item->selling_price ?? 0, 'cost_price' => $item->unit_price ?? 0]);
        }

        return [$product->id, $variant->id];
    }

    private function product(StockOutwardItem $item): Product
    {
        $existing = Product::query()
            ->when($item->product_code, fn ($q) => $q->where('code', $item->product_code), fn ($q) => $q->where('name', $item->product_name))
            ->first();
        if ($existing) {
            return $existing;
        }
        $tax = $item->tax_name ? Tax::where('name', $item->tax_name)->first() : null;

        return Product::create([
            'name' => $item->product_name, 'code' => $item->product_code, 'sku' => $item->sku, 'barcode' => $item->product_barcode,
            'selling_mode' => $item->selling_mode ?: 'PIECE', 'hsn_code' => $item->hsn_code, 'unit' => $item->unit,
            'mrp' => $item->mrp ?? 0, 'selling_price' => $item->selling_price ?? 0, 'cost_price' => $item->unit_price ?? 0,
            'tax_id' => $tax?->id, 'sales_tax_id' => $tax?->id, 'purchase_tax_id' => $tax?->id, 'is_active' => true,
        ]);
    }

    private function brand(StockOutwardItem $item): Brand
    {
        return Brand::whereRaw('UPPER(TRIM(name)) = ?', [strtoupper(trim($item->brand_name))])->first()
            ?? Brand::create(['name' => $item->brand_name, 'code' => $item->brand_code ?: strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $item->brand_name), 0, 20)), 'is_active' => true]);
    }

    private function size(string $name): ?Size
    {
        return Size::whereRaw('UPPER(TRIM(name)) = ?', [strtoupper(trim($name))])->first();
    }

    private function color(?string $name): ?AttributeValue
    {
        return $name ? AttributeValue::whereRaw('UPPER(TRIM(name)) = ?', [strtoupper(trim($name))])
            ->whereHas('attributeType', fn ($q) => $q->whereIn('code', ['colour', 'color']))->first() : null;
    }
}
