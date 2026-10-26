export function mapPosStockRow(row) {
  const productId = row.productId ?? row.id;
  const variantId = row.variantId ?? null;
  const sellingMode = String(row.sellingMode || "PIECE").toUpperCase();
  const barcodeId = row.barcodeId ?? null;
  return {
    id: sellingMode === "PIECE" && barcodeId ? `barcode:${barcodeId}` : `stock:${productId}:${variantId || 0}`,
    productId, variantId, barcodeId, sellingMode,
    barcode: row.barcode || "", productName: row.productName || row.name || "Unknown Product",
    qty: sellingMode === "PIECE" && barcodeId ? Math.min(1, Number(row.qty ?? row.stock_qty ?? 0)) : Number(row.qty ?? row.stock_qty ?? 0),
    cost: Number(row.cost || 0), price: Number(row.price ?? row.selling_price ?? row.mrp ?? 0),
    tax: Number(row.tax ?? row.tax_rate ?? 0), taxName: row.taxName || "", taxType: row.taxType || "",
    requiresQuantityPrompt: Boolean(row.requiresQuantityPrompt),
  };
}

export const posStockOptions = rows => rows.map(row => ({ value: row.id, label: `${row.productName}${row.barcode ? ` · ${row.barcode}` : ""} (Stock: ${row.qty})` }));
export const mergePosStockRows = (previous, incoming) => Array.from(new Map([...previous, ...incoming].map(row => [row.id, row])).values());
