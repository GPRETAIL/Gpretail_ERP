import React, { useState, useEffect, useCallback } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import api from "../../api/axios";
import StoreFilterSelect from "../../components/StoreFilterSelect";
import PivotTable from "../../components/PivotTable";
import Breadcrumbs from "../../components/Breadcrumbs";
import { toast } from "react-toastify";
import { muiFieldSx } from "../../theme/formControlSizes";

const fieldSx = muiFieldSx;
const labelSx = { display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 };

const DIMENSION_OPTIONS = [
  { value: "store", label: "Store" },
  { value: "month", label: "Month" },
  { value: "payment_mode", label: "Payment Mode" },
];
const MEASURE_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "qty", label: "Qty" },
  { value: "bills", label: "Bills" },
];

const SalesPivotAnalyzer = () => {
  const navigate = useNavigate();
  const [rowBy, setRowBy] = useState("store");
  const [columnBy, setColumnBy] = useState("month");
  const [measure, setMeasure] = useState("revenue");
  const [storeFilter, setStoreFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pivot, setPivot] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (rowBy === columnBy) return;
    setLoading(true);
    try {
      const res = await api.get("/sales-pivot", {
        params: {
          row_by: rowBy,
          column_by: columnBy,
          measure,
          ...(storeFilter ? { company_id: storeFilter } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        },
      });
      if (res.data?.success) {
        setPivot(res.data);
      } else {
        toast.error(res.data?.message || "Failed to load sales pivot");
        setPivot(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load sales pivot");
      setPivot(null);
    } finally {
      setLoading(false);
    }
  }, [rowBy, columnBy, measure, storeFilter, dateFrom, dateTo]);

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
            <ArrowLeft size={16} />
          </IconButton>
          <Breadcrumbs
            sx={{ fontSize: 13, fontWeight: 600 }}
            items={[
              { label: "Analytical", onClick: handleBackClick },
              { label: "360° Sales Analyzer" },
            ]}
          />
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
          <Box>
            <Typography component="label" sx={labelSx}>Sale From</Typography>
            <TextField type="date" size="small" fullWidth sx={fieldSx} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Box>
          <Box>
            <Typography component="label" sx={labelSx}>Sale To</Typography>
            <TextField type="date" size="small" fullWidth sx={fieldSx} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Box>
          <Button
            onClick={fetchData}
            disabled={loading || sameDimension}
            startIcon={<ArrowPathIcon style={{ width: 14, height: 14, ...(loading ? { animation: "app-spin 1s linear infinite" } : {}) }} />}
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
          title="Sales Cross-Tab"
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
          exportFileName="sales-pivot"
        />
      </Stack>
    </Box>
  );
};

export default SalesPivotAnalyzer;
