import PageHeader from "../../components/PageHeader";
import useAsyncQuery from "../../hooks/useAsyncQuery";
import React, { useState, useEffect, useCallback } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { useNavigate } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import api from "../../api/axios";
import StoreFilterSelect from "../../components/StoreFilterSelect";
import PivotTable from "../../components/PivotTable";
import Breadcrumbs from "../../components/Breadcrumbs";
import { toast } from "react-toastify";
import { muiFieldSx } from "../../theme/formControlSizes";

const fieldSx = muiFieldSx;
const labelSx = { display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 };

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
  const fetchPivot = useCallback(async ({ signal }) => {
      const res = await api.get("/supplier-product-analytics", { signal,
        params: {
          row_by: rowBy,
          measure,
          ...(storeFilter ? { company_id: storeFilter } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        },
      });
    if (!res.data?.success) throw new Error(res.data?.message || "Failed to load supplier/product analytics");
    return res.data;
  }, [rowBy, measure, storeFilter, dateFrom, dateTo]);
  const { data: pivot, loading, error, reload: fetchData } = useAsyncQuery(fetchPivot);
  useEffect(() => {
    if (error) toast.error(error.response?.data?.message || error.message || "Failed to load supplier/product analytics");
  }, [error]);

  const handleBackClick = () => navigate("/analytical");
  const rowLabel = rowBy === "product" ? "Product" : "Supplier";
  const measureLabel = MEASURE_OPTIONS.find((m) => m.value === measure)?.label || measure;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <PageHeader
        onBack={handleBackClick}
        backLabel="Back to analytical"
        title={<>
          <Breadcrumbs
            items={[
              { label: "Analytical", onClick: handleBackClick },
              { label: "360° Purchase Analyzer" },
            ]}
          />
        </>}
      />

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
