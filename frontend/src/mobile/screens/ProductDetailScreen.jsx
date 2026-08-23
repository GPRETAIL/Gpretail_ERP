import React, { useState, useEffect } from "react";
import api from "../../api/axios";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Product Detail screen — fetches full product from GET /products/{id}.
 */
export default function ProductDetailScreen({ product, onBack }) {
  const [p, setP] = useState(product || null);
  const [loading, setLoading] = useState(!product);

  useEffect(() => {
    if (product?.id && !product?.hsnCode) {
      // Fetch full details
      setLoading(true);
      api
        .get(`/products/${product.id}`)
        .then((res) => {
          setP(res.data?.data || res.data || product);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [product]);

  if (loading || !p) {
    return (
      <div className="vx-card text-center py-12">
        <p className="text-sm text-slate-400">Loading product details...</p>
      </div>
    );
  }

  const name = p.productName || p.name || "Product";
  const code = p.productCode || p.sku || p.code || "";
  const sellingPrice = p.sellingPrice || p.mrp || p.price || 0;
  const costPrice = p.costPrice || p.purchasePrice || p.cost || 0;
  const stock = p.currentStock ?? p.stock ?? p.quantity ?? 0;
  const minStock = p.minimumStock ?? p.minStock ?? p.reorderLevel ?? 0;
  const hsn = p.hsnCode || p.hsn || "";
  const category = p.categoryName || p.category?.name || p.category || "";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="space-y-4 pb-12">
      {/* Product Image Card */}
      <div className="vx-card text-center p-6 flex flex-col items-center">
        <div className="w-32 h-32 rounded-2xl bg-slate-100 flex items-center justify-center text-5xl mb-3 shadow-inner font-bold text-indigo-600">
          {initial}
        </div>
        <h3 className="text-base font-extrabold text-slate-900 m-0">{name}</h3>
        <p className="text-xs text-slate-400 font-mono mt-1">{code}</p>
      </div>

      {/* Attributes List Card */}
      <div className="vx-card divide-y divide-slate-100 text-xs">
        <div className="flex justify-between py-2.5">
          <span className="text-slate-500">Selling Price</span>
          <strong className="text-slate-900 font-bold">{money(sellingPrice)}</strong>
        </div>
        <div className="flex justify-between py-2.5">
          <span className="text-slate-500">Cost Price</span>
          <strong className="text-slate-900 font-bold">{money(costPrice)}</strong>
        </div>
        <div className="flex justify-between py-2.5 items-center">
          <span className="text-slate-500">Stock</span>
          <span
            className={`font-bold flex items-center gap-1.5 ${
              stock > minStock ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                stock > minStock ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            {Number(stock).toLocaleString("en-IN")} PCS
          </span>
        </div>
        <div className="flex justify-between py-2.5">
          <span className="text-slate-500">Min. Stock Level</span>
          <span className="font-medium text-slate-800">
            {Number(minStock).toLocaleString("en-IN")} PCS
          </span>
        </div>
        {hsn && (
          <div className="flex justify-between py-2.5">
            <span className="text-slate-500">HSN Code</span>
            <span className="font-mono text-slate-800">{hsn}</span>
          </div>
        )}
        {category && (
          <div className="flex justify-between py-2.5">
            <span className="text-slate-500">Category</span>
            <span className="font-medium text-slate-800">{category}</span>
          </div>
        )}
      </div>

      {/* Edit CTA */}
      <button
        type="button"
        onClick={onBack}
        className="w-full py-3.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-98 transition-all"
      >
        Edit Product
      </button>
    </div>
  );
}
