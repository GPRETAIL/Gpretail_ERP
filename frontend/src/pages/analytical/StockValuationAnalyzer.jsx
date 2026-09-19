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

const DIMENSION_OPTIONS = [
  { value: "store", label: "Store" },
  { value: "brand", label: "Brand" },
  { value: "category", label: "Category" },
];
const MEASURE_OPTIONS = [
  { value: "retail_value", label: "Retail Value" },
  { value: "cost_value", label: "Cost Value" },
  { value: "qty", label: "Quantity" },
];

const StockValuationAnalyzer = () => {
  const navigate = useNavigate();
  const [rowBy, setRowBy] = useState("brand");
  const [columnBy, setColumnBy] = useState("category");
  const [measure, setMeasure] = useState("retail_value");
  const [storeFilter, setStoreFilter] = useState("");
  const [pivot, setPivot] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (rowBy === columnBy) return;
    setLoading(true);
    try {
      const res = await api.get("/stock-pivot", {
        params: {
          row_by: rowBy,
          column_by: columnBy,
          measure,
          ...(storeFilter ? { company_id: storeFilter } : {}),
        },
      });
      if (res.data?.success) {
        setPivot(res.data);
      } else {
        toast.error(res.data?.message || "Failed to load stock valuation pivot");
        setPivot(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load stock valuation pivot");
      setPivot(null);
    } finally {
      setLoading(false);
    }
  }, [rowBy, columnBy, measure, storeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBackClick = () => navigate("/analytical");
  const rowLabel = DIMENSION_OPTIONS.find((d) => d.value === rowBy)?.label || rowBy;
  const measureLabel = MEASURE_OPTIONS.find((m) => m.value === measure)?.label || measure;
  const sameDimension = rowBy === columnBy;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton size="small" onClick={handleBackClick} sx={{ color: "text.secondary" }} aria-label="Back to analytical">
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 13, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={handleBackClick} sx={{ minWidth: "auto", p: 0, fontSize: 13, fontWeight: 600 }}>
              Analytical
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Stock Marker Analyzer</Box>
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
            <Typography component="label" sx={labelSx}>Store Filter</Typography>
            <StoreFilterSelect value={storeFilter} onChange={setStoreFilter} />
          </Box>
          <Box>
            <Typography component="label" sx={labelSx}>Rows</Typography>
            <TextField select size="small" fullWidth sx={fieldSx} value={rowBy} onChange={(e) => setRowBy(e.target.value)}>
              {DIMENSION_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box>
            <Typography component="label" sx={labelSx}>Columns</Typography>
            <TextField select size="small" fullWidth sx={fieldSx} value={columnBy} onChange={(e) => setColumnBy(e.target.value)}>
              {DIMENSION_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            {sameDimension && (
              <Typography sx={{ fontSize: 11, color: "error.main", mt: 0.5 }}>Rows and columns must differ.</Typography>
            )}
          </Box>
          <Box>
            <Typography component="label" sx={labelSx}>Measure</Typography>
            <TextField select size="small" fullWidth sx={fieldSx} value={measure} onChange={(e) => setMeasure(e.target.value)}>
              {MEASURE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.6, pt: 1, borderTop: 1, borderColor: "divider" }}>
            Current on-hand stock, valued at cost and retail price. A point-in-time
            snapshot -- no date range applies.
          </Typography>
          <Button
            onClick={fetchData}
            disabled={loading || sameDimension}
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
          title="Stock Valuation Cross-Tab"
          rowLabel={rowLabel}
          measureLabel={measureLabel}
          rows={pivot?.rows || []}
          columns={pivot?.columns || []}
          cells={pivot?.cells || {}}
          rowTotals={pivot?.rowTotals || {}}
          colTotals={pivot?.colTotals || {}}
          grandTotal={pivot?.grandTotal || 0}
          loading={loading}
          emptyText={sameDimension ? "Pick two different dimensions for rows and columns" : undefined}
          exportFileName="stock-valuation-pivot"
        />
      </Stack>
    </Box>
  );
};

export default StockValuationAnalyzer;
