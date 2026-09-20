import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
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
    if (product?.id && !product?.hsn) {
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
      <Box className="vx-card text-center py-12">
        <Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>Loading product details...</Typography>
      </Box>
    );
  }

  const name = p.name || "Product";
  const code = p.sku || p.code || "";
  const sellingPrice = p.selling_price || p.mrp || 0;
  const costPrice = p.cost_price || 0;
  const stock = p.stock_qty ?? 0;
  const minStock = p.min_stock ?? 0;
  const hsn = p.hsn || "";
  const category = p.category?.name || "";
  const initial = name.charAt(0).toUpperCase();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 6 }}>
      {/* Product Image Card */}
      <Box className="vx-card text-center p-6 flex flex-col items-center">
        <Box sx={{ width: 128, height: 128, borderRadius: "16px", bgcolor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, mb: 1.5, boxShadow: "inset 0 2px 4px 0 rgba(0,0,0,0.06)", fontWeight: 700, color: "#4f46e5" }}>
          {initial}
        </Box>
        <Typography component="h3" sx={{ fontSize: 16, fontWeight: 800, color: "#0f172a", m: 0 }}>{name}</Typography>
        <Typography component="p" sx={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", mt: 0.5 }}>{code}</Typography>
      </Box>

      {/* Attributes List Card */}
      <Box className="vx-card divide-y divide-slate-100 text-xs">
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.25 }}>
          <Typography component="span" sx={{ color: "#64748b" }}>Selling Price</Typography>
          <Box component="strong" sx={{ color: "#0f172a", fontWeight: 700 }}>{money(sellingPrice)}</Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.25 }}>
          <Typography component="span" sx={{ color: "#64748b" }}>Cost Price</Typography>
          <Box component="strong" sx={{ color: "#0f172a", fontWeight: 700 }}>{money(costPrice)}</Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.25 }}>
          <Typography component="span" sx={{ color: "#64748b" }}>Stock</Typography>
          <Box
            component="span"
            sx={{
              fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75,
              color: stock > minStock ? "#059669" : "#e11d48",
            }}
          >
            <Box
              component="span"
              sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: stock > minStock ? "#10b981" : "#f43f5e" }}
            />
            {Number(stock).toLocaleString("en-IN")} PCS
          </Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.25 }}>
          <Typography component="span" sx={{ color: "#64748b" }}>Min. Stock Level</Typography>
          <Typography component="span" sx={{ fontWeight: 500, color: "#1e293b" }}>
            {Number(minStock).toLocaleString("en-IN")} PCS
          </Typography>
        </Box>
        {hsn && (
          <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.25 }}>
            <Typography component="span" sx={{ color: "#64748b" }}>HSN Code</Typography>
            <Typography component="span" sx={{ fontFamily: "monospace", color: "#1e293b" }}>{hsn}</Typography>
          </Box>
        )}
        {category && (
          <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.25 }}>
            <Typography component="span" sx={{ color: "#64748b" }}>Category</Typography>
            <Typography component="span" sx={{ fontWeight: 500, color: "#1e293b" }}>{category}</Typography>
          </Box>
        )}
      </Box>

      {/* Edit CTA */}
      <Box
        component="button"
        type="button"
        onClick={onBack}
        sx={{
          width: "100%", py: 1.75, borderRadius: "12px", bgcolor: "#4f46e5", fontSize: 12, fontWeight: 700, color: "#fff",
          boxShadow: "0 10px 15px -3px rgba(99,102,241,0.3)", transition: "all 0.15s",
          "&:hover": { bgcolor: "#4338ca" }, "&:active": { transform: "scale(0.98)" },
        }}
      >
        Edit Product
      </Box>
    </Box>
  );
}
