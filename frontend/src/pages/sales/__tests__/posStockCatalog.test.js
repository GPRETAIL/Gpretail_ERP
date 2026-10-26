import { expect, it } from "vitest";
import { mapPosStockRow, mergePosStockRows, posStockOptions } from "../posStockCatalog";

it("keeps variants and physical piece barcodes distinct when adding scanned lines", () => {
  const base = { id: 5, sellingMode: "PIECE", stock_qty: 10, name: "Product", selling_price: 100 };
  const one = mapPosStockRow({ ...base, barcodeId: 10, variantId: 2 });
  const two = mapPosStockRow({ ...base, barcodeId: 11, variantId: 2 });
  expect(one.id).not.toBe(two.id);
  expect(one.qty).toBe(1);
  expect(one.productId).toBe(5);
  const variants = [2, 3].map(variantId => mapPosStockRow({ ...base, sellingMode: "PACK", variantId }));
  expect(variants[0].id).not.toBe(variants[1].id);
  expect(mergePosStockRows(variants, [variants[0]])).toHaveLength(2);
  expect(posStockOptions(variants)[0].value).toBe(variants[0].id);
});
