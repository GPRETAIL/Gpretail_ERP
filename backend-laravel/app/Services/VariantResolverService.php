<?php

namespace App\Services;

use App\Models\ProductVariant;
use App\Models\Size;

/**
 * The one place every warehouse controller resolves a real ProductVariant
 * instead of hardcoding variant_id: null. Variant identity is intentionally
 * narrow - Brand + Size + Colour + Design - matching exactly what
 * direct_purchase_items already captures. The same product+attributes
 * combo always resolves to the same variant row no matter which document
 * (Direct Purchase, Inventory Entry, Purchase Invoice, ...) received it.
 */
class VariantResolverService
{
    public function resolve(
        int $productId,
        ?int $brandId,
        ?string $sizeName,
        ?int $colorId,
        ?string $designNo,
    ): ProductVariant {
        $sizeId = $this->resolveSizeId($sizeName);
        $designNo = $this->normalize($designNo);

        $match = ProductVariant::where('product_id', $productId)
            ->where(fn ($q) => $brandId ? $q->where('brand_id', $brandId) : $q->whereNull('brand_id'))
            ->where(fn ($q) => $sizeId ? $q->where('size_id', $sizeId) : $q->whereNull('size_id'))
            ->where(fn ($q) => $colorId ? $q->where('color_id', $colorId) : $q->whereNull('color_id'))
            ->where(fn ($q) => $designNo !== null
                ? $q->whereRaw('LOWER(TRIM(design_no)) = ?', [strtolower($designNo)])
                : $q->whereNull('design_no'))
            ->first();

        if ($match) {
            return $match;
        }

        $placeholder = 'VAR-' . $productId . '-' . strtoupper(substr(uniqid(), -8));

        return ProductVariant::create([
            'product_id' => $productId,
            'brand_id' => $brandId,
            'size_id' => $sizeId,
            'color_id' => $colorId,
            'design_no' => $designNo,
            'sku' => $placeholder,
            'barcode' => $placeholder,
            'cost_price' => 0,
            'selling_price' => 0,
            'mrp' => 0,
        ]);
    }

    /**
     * direct_purchase_items.size is free text, not a size_id FK. Matches it
     * against the Sizes master by exact (case/whitespace-normalized) name -
     * if nothing matches, the variant is created without a strict size_id
     * rather than fabricating a master-data row with a guessed size_group.
     */
    private function resolveSizeId(?string $sizeName): ?int
    {
        $sizeName = $this->normalize($sizeName);
        if ($sizeName === null) {
            return null;
        }

        $size = Size::whereRaw('UPPER(TRIM(name)) = ?', [strtoupper($sizeName)])->first();

        return $size?->id;
    }

    /**
     * Convenience for controllers whose item payloads may already carry an
     * explicit variant_id (respected as-is), or may carry the raw Brand/
     * Size/Colour/Design attributes to resolve one from, or may carry
     * neither yet (returns null - same as today, no regression) until the
     * frontend for that screen is updated to send them.
     */
    public function resolveFromItemArray(array $item, int $productId): ?int
    {
        $explicit = $item['variantId'] ?? $item['variant_id'] ?? null;
        if ($explicit) {
            return (int) $explicit;
        }

        $brandId = $item['brandId'] ?? $item['brand_id'] ?? null;
        $size = $item['size'] ?? null;
        $colorId = $item['colorId'] ?? $item['color_id'] ?? null;
        $designNo = $item['designNo'] ?? $item['design_no'] ?? null;

        if (!$brandId && !$size && !$colorId && !$designNo) {
            return null;
        }

        $variant = $this->resolve(
            productId: $productId,
            brandId: $brandId ? (int) $brandId : null,
            sizeName: $size,
            colorId: $colorId ? (int) $colorId : null,
            designNo: $designNo,
        );

        return $variant->id;
    }

    private function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
