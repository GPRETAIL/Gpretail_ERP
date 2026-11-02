import { useEffect, useState } from "react";
import api from "@/shared/api/apiClient";

/**
 * Warehouse Customisation's "sell without stock" switch, for the billing screens. Off (the default, and while
 * loading) a line cannot exceed the stock on hand; on, it can, and the line is marked as sold without stock.
 */
export default function useStockRules() {
  const [rules, setRules] = useState({ allowSaleWithoutStock: false, loaded: false });
  useEffect(() => {
    let alive = true;
    api.get("/pos-sales/stock-rules")
      .then((res) => alive && setRules({ allowSaleWithoutStock: Boolean(res.data?.data?.allowSaleWithoutStock), loaded: true }))
      .catch(() => alive && setRules((current) => ({ ...current, loaded: true })));
    return () => { alive = false; };
  }, []);
  return rules;
}

/** Per stock row, how many units the cart sells beyond its stock (only possible with the switch on). */
export function shortQtyByStock(lines, stockQtyOf) {
  const sold = new Map();
  lines.forEach((line) => {
    if (line.stockId == null) return;
    sold.set(line.stockId, (sold.get(line.stockId) || 0) + (Number(line.qty) || 0));
  });
  const short = new Map();
  sold.forEach((qty, stockId) => {
    const inStock = stockQtyOf(stockId);
    if (inStock == null) return; // Unknown stock: nothing to compare against.
    const over = qty - Math.max(0, Number(inStock) || 0);
    if (over > 0) short.set(stockId, over);
  });
  return short;
}

/** Row background for a line sold without stock. */
export const noStockRowSx = (theme) => ({ bgcolor: theme.palette.mode === "dark" ? "rgba(237,108,2,0.16)" : "rgba(237,108,2,0.08)" });
