import React, { useState, useEffect, useCallback } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import api from "../../api/axios";
import StoreFilterSelect from "../../components/StoreFilterSelect";
import PivotTable from "../../components/PivotTable";
import { toast } from "react-toastify";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 10.5 } };
const labelSx = { display: "block", fontSize: 11, fontWeight: 500, color: "text.secondary", mb: 0.5 };

const ROW_BY_OPTIONS = [
  { value: "product", label: "Product (rows) × Supplier (columns)" },
  { value: "supplier", label: "Supplier (rows) × Product (columns)" },
];
const MEASURE_OPTIONS = [
  { value: "amount", label: "Purchase Amount" },
  { value: "qty", label: "Quantity" },
];

const SupplierProductAnalyzer = () => {
  const navigate = useNavigate();
  const [rowBy, setRowBy] = useState("product");
  const [measure, setMeasure] = useState("amount");
  const [storeFilter, setStoreFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pivot, setPivot] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/supplier-product-analytics", {
        params: {
          row_by: rowBy,
          measure,
          ...(storeFilter ? { company_id: storeFilter } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        },
      });
      if (res.data?.success) {
        setPivot(res.data);
      } else {
        toast.error(res.data?.message || "Failed to load supplier/product analytics");
        setPivot(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load supplier/product analytics");
      setPivot(null);
    } finally {
      setLoading(false);
    }
  }, [rowBy, measure, storeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBackClick = () => navigate("/analytical");
  const rowLabel = rowBy === "product" ? "Product" : "Supplier";
  const measureLabel = MEASURE_OPTIONS.find((m) => m.value === measure)?.label || measure;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton size="small" onClick={handleBackClick} sx={{ color: "text.secondary" }} aria-label="Back to analytical">
            <ArrowLeft size={16} />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 13, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={handleBackClick} sx={{ minWidth: "auto", p: 0, fontSize: 13, fontWeight: 600 }}>
              Analytical
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">360° Purchase Analyzer</Box>
          </Stack>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0, p: 2 }}>
        {/* ─── LEFT PANEL: Pivot controls ───────────────────────────────── */}
        <Stack
          spacing={1.5}
          sx={{
            width: 224, flexShrink: 0, minHeight: 0, bgcolor: "background.paper", borderRadius: "7px",
            border: "1px solid", borderColor: "divider", boxShadow: 1, px: 1.5, py: 1.25, overflowY: "auto",
          }}
        >
          <Box>
            <Typography component="label" sx={labelSx}>Store</Typography>
            <StoreFilterSelect value={storeFilter} onChange={setStoreFilter} />
          </Box>
          <Box>
            <Typography component="label" sx={labelSx}>View</Typography>
            <TextField select size="small" fullWidth sx={fieldSx} value={rowBy} onChange={(e) => setRowBy(e.target.value)}>
              {ROW_BY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box>
            <Typography component="label" sx={labelSx}>Measure</Typography>
            <TextField select size="small" fullWidth sx={fieldSx} value={measure} onChange={(e) => setMeasure(e.target.value)}>
              {MEASURE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box>
            <Typography component="label" sx={labelSx}>Purchase From</Typography>
            <TextField type="date" size="small" fullWidth sx={fieldSx} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Box>
          <Box>
            <Typography component="label" sx={labelSx}>Purchase To</Typography>
            <TextField type="date" size="small" fullWidth sx={fieldSx} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Box>
          <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.6, pt: 1, borderTop: 1, borderColor: "divider" }}>
            Sourced from Direct Purchases + Purchase Invoices. GRNs are not included to avoid
            double-counting the same receipt.
          </Typography>
          <Button
            onClick={fetchData}
            disabled={loading}
            startIcon={<ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            sx={{
              fontSize: 12.25, fontWeight: 500, borderRadius: "5.25px", color: "#6366f1",
              bgcolor: (theme) => alpha("#6366f1", theme.palette.mode === "dark" ? 0.2 : 0.08),
              "&:hover": { bgcolor: (theme) => alpha("#6366f1", theme.palette.mode === "dark" ? 0.3 : 0.16) },
            }}
          >
            Refresh
          </Button>
        </Stack>

        {/* ─── RIGHT PANEL: Pivot grid ──────────────────────────────────── */}
        <PivotTable
          title="Supplier × Product Purchase Summary"
          rowLabel={rowLabel}
          measureLabel={measureLabel}
          rows={pivot?.rows || []}
          columns={pivot?.columns || []}
          cells={pivot?.cells || {}}
          rowTotals={pivot?.rowTotals || {}}
          colTotals={pivot?.colTotals || {}}
          grandTotal={pivot?.grandTotal || 0}
          loading={loading}
          exportFileName="supplier-product-analytics"
        />
      </Stack>
    </Box>
  );
};

export default SupplierProductAnalyzer;
