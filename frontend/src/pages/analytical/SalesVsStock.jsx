import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import api from "../../api/axios";
import StoreFilterSelect from "../../components/StoreFilterSelect";
import FilterableDataTable from "../../components/FilterableDataTable";
import { toast } from "react-toastify";

// ─── Left panel fields (matches backend FIELD_CONFIG keys) ─────────────────
const COMPARER_FIELDS = [
  { key: "agent", label: "AGENT" },
  { key: "barcode", label: "BARCODE" },
  { key: "barcode_group", label: "BARCODE GROUP" },
  { key: "barcoded_on", label: "BARCODED ON" },
  { key: "brand", label: "BRAND" },
  { key: "colour", label: "COLOUR" },
  { key: "company", label: "COMPANY" },
  { key: "customer", label: "CUSTOMER" },
  { key: "dealer_rate", label: "DEALER RATE" },
  { key: "dealer_rate_range", label: "DEALER RATE RANGE" },
  { key: "design", label: "DESIGN" },
  { key: "discount_rate", label: "DISCOUNT RATE" },
  { key: "discount_rate_range", label: "DISCOUNT RATE RANGE" },
  { key: "fit", label: "FIT" },
  { key: "gln_no", label: "GLN NO" },
  { key: "hsn_code", label: "HSN CODE" },
  { key: "invoice_date", label: "INVOICE DATE" },
  { key: "invoice_no", label: "INVOICE NO" },
  { key: "item", label: "ITEM" },
  { key: "job_worker", label: "JOB WORKER" },
  { key: "lr_entry_no", label: "LR ENTRY NO" },
  { key: "material", label: "MATERIAL" },
  { key: "pattern", label: "PATTERN" },
  { key: "price_tag", label: "PRICE TAG" },
  { key: "product", label: "PRODUCT" },
  { key: "product_code", label: "PRODUCT CODE" },
  { key: "product_group", label: "PRODUCT GROUP" },
  { key: "purchase_date", label: "PURCHASE DATE" },
  { key: "purchase_month", label: "PURCHASE MONTH" },
  { key: "purchase_rate", label: "PURCHASE RATE" },
  { key: "purchase_rate_range", label: "PURCHASE RATE RANGE" },
  { key: "purchase_tax", label: "PURCHASE TAX" },
  { key: "purchase_year", label: "PURCHASE YEAR" },
  { key: "retail_margin_range", label: "RETAIL MARGIN RANGE" },
  { key: "sale_date", label: "SALE DATE" },
  { key: "sale_margin_range", label: "SALE MARGIN RANGE" },
  { key: "sale_month", label: "SALE MONTH" },
  { key: "sale_rate", label: "SALE RATE" },
  { key: "sale_rate_range", label: "SALE RATE RANGE" },
  { key: "sale_type", label: "SALE TYPE" },
  { key: "sale_year", label: "SALE YEAR" },
  { key: "sales_tax", label: "SALES TAX" },
  { key: "section", label: "SECTION" },
  { key: "size", label: "SIZE" },
  { key: "sleeve", label: "SLEEVE" },
  { key: "source_supplier", label: "SOURCE SUPPLIER" },
  { key: "stock_location", label: "STOCK LOCATION" },
  { key: "style", label: "STYLE" },
  { key: "supplier", label: "SUPPLIER" },
  { key: "supplier_city", label: "SUPPLIER CITY" },
  { key: "tax_percentage", label: "TAX PERCENTAGE" },
  { key: "type", label: "TYPE" },
];

const fmtInt = (val) => {
  const n = Number(val);
  if (isNaN(n)) return val ?? "";
  return n.toLocaleString("en-IN");
};

const numericCell = (val, sx = {}) => (
  <Box component="span" sx={{ display: "block", textAlign: "right", fontVariantNumeric: "tabular-nums", ...sx }}>{val}</Box>
);

const SalesVsStock = () => {
  const navigate = useNavigate();
  const [activeField, setActiveField] = useState("brand");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (field) => {
    setLoading(true);
    try {
      const params = {
        groupBy: field,
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        ...(storeFilter ? { company_id: storeFilter } : {}),
      };
      const res = await api.get("/sales-vs-stock", { params });
      setData(res.data?.data || []);
      setTotals(res.data?.totals || null);
      setNotice(res.data?.notice || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load sales vs stock");
      setData([]);
      setTotals(null);
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, storeFilter]);

  useEffect(() => {
    fetchData(activeField);
  }, [activeField, dateFrom, dateTo, storeFilter, fetchData]);

  const handleFieldClick = (key) => setActiveField(key);

  const visibleFields = useMemo(() => {
    if (!fieldSearch.trim()) return COMPARER_FIELDS;
    const q = fieldSearch.toLowerCase().trim();
    return COMPARER_FIELDS.filter((f) => f.label.toLowerCase().includes(q));
  }, [fieldSearch]);

  const activeLabel = COMPARER_FIELDS.find((f) => f.key === activeField)?.label || activeField;
  const handleBackClick = () => navigate("/analytical");

  const columns = useMemo(() => [
    { key: "description", label: activeLabel },
    { key: "sold_pieces", label: "Sold Pieces", render: (v) => numericCell(fmtInt(v)) },
    { key: "stock_pieces", label: "Available Stock Pieces", render: (v) => numericCell(fmtInt(v), { color: "#6366f1", fontWeight: 500 }) },
  ], [activeLabel]);

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
            <Box component="span">Sales Vs Stock</Box>
          </Stack>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0, p: 2 }}>
        {/* ─── LEFT PANEL: Field selector ──────────────────────────────────── */}
        <Stack
          sx={{
            width: 224, flexShrink: 0, minHeight: 0, bgcolor: "background.paper", borderRadius: "7px",
            border: "1px solid", borderColor: "divider", boxShadow: 1,
          }}
        >
          <Box sx={{ px: 1.5, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
            <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary", mb: 1 }}>
              Date Filters
            </Typography>
            <Stack spacing={1}>
              <StoreFilterSelect value={storeFilter} onChange={setStoreFilter} />
              <Box>
                <Typography component="label" sx={{ display: "block", fontSize: 11, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                  From Date
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 10.5 } }}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </Box>
              <Box>
                <Typography component="label" sx={{ display: "block", fontSize: 11, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                  To Date
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 10.5 } }}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Box>
            </Stack>
          </Box>
          <Box sx={{ px: 1.5, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
            <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary", mb: 1 }}>
              Analysis Fields
            </Typography>
            <TextField
              type="text"
              size="small"
              fullWidth
              value={fieldSearch}
              onChange={(e) => setFieldSearch(e.target.value)}
              placeholder="Search fields..."
              sx={{ "& .MuiInputBase-input": { fontSize: 10.5 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <Box sx={{ color: "text.disabled", display: "inline-flex", mr: 0.5 }}>
                      <MagnifyingGlassIcon size={16} />
                    </Box>
                  ),
                },
              }}
            />
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", py: 0.5 }}>
            {visibleFields.map((f) => (
              <Box
                component="button"
                key={f.key}
                onClick={() => handleFieldClick(f.key)}
                sx={{
                  display: "block", width: "100%", textAlign: "left", px: 1.5, py: 0.75, fontSize: 10.5, fontWeight: 500,
                  border: 0, borderLeft: "2px solid", cursor: "pointer", fontFamily: "inherit", bgcolor: "transparent",
                  ...(activeField === f.key
                    ? { borderLeftColor: "#6366f1", color: "#6366f1", bgcolor: (theme) => alpha("#6366f1", theme.palette.mode === "dark" ? 0.2 : 0.08) }
                    : { borderLeftColor: "transparent", color: "text.secondary", "&:hover": { bgcolor: "action.hover" } }),
                }}
              >
                {f.label}
              </Box>
            ))}
          </Box>
        </Stack>

        {/* ─── RIGHT PANEL: Grid ───────────────────────────────────────────── */}
        <Stack
          sx={{
            flex: 1, minWidth: 0, minHeight: 0, bgcolor: "background.paper", borderRadius: "7px",
            border: "1px solid", borderColor: "divider", boxShadow: 1, px: 1.5, pt: 1.5, pb: 0.25,
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
            <Box>
              <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>Sales Vs Stock</Typography>
              <Typography sx={{ fontSize: 10.5, color: "text.secondary", mt: 0.25 }}>
                Grouped by: <Box component="span" sx={{ fontWeight: 500, color: "#6366f1" }}>{activeLabel}</Box>
                {dateFrom || dateTo ? (
                  <Box component="span">
                    {" "}• Date Range: <Box component="span" sx={{ fontWeight: 500, color: "#6366f1" }}>{dateFrom || "Any"}</Box>
                    {" "}to <Box component="span" sx={{ fontWeight: 500, color: "#6366f1" }}>{dateTo || "Any"}</Box>
                  </Box>
                ) : null}
                {" "}— {data.length} record{data.length !== 1 ? "s" : ""}
              </Typography>
            </Box>
            <Button
              onClick={() => fetchData(activeField)}
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

          {totals && !notice && (
            <Stack
              direction="row"
              spacing={3}
              sx={{
                mb: 0.75, flexWrap: "wrap", rowGap: 0.5, px: 1.5, py: 1, fontSize: 10.5,
                bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderRadius: "5.25px",
                fontWeight: 600, color: "text.primary",
              }}
            >
              <Box component="span">TOTAL</Box>
              <Box component="span">Sold Pieces: {fmtInt(totals.sold_pieces)}</Box>
              <Box component="span" sx={{ color: "#6366f1" }}>Available Stock Pieces: {fmtInt(totals.stock_pieces)}</Box>
            </Stack>
          )}

          <FilterableDataTable
            rows={data}
            columns={columns}
            rowKey="description"
            loading={loading}
            searchPlaceholder={`Search in ${activeLabel.toLowerCase()}...`}
            emptyText={notice || `No data found for ${activeLabel}`}
            tablePreferenceKey="analytical.sales-vs-stock"
            onExportRows={async () => data}
            exportFileName="sales-vs-stock"
            onRefresh={() => fetchData(activeField)}
            refreshDisabled={loading}
            paginationMode="client"
            enableVirtualization
            enableColumnResize
            fillHeight
            compact
          />
        </Stack>
      </Stack>
    </Box>
  );
};

export default SalesVsStock;
