import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import api from "../../api/axios";
import StoreFilterSelect from "../../components/StoreFilterSelect";
import FilterableDataTable from "../../components/FilterableDataTable";
import Breadcrumbs from "../../components/Breadcrumbs";
import { toast } from "react-toastify";
import { muiFieldSx } from "../../theme/formControlSizes";

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

const fmt = (val) => {
  const n = Number(val);
  if (isNaN(n)) return val ?? "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtInt = (val) => {
  const n = Number(val);
  if (isNaN(n)) return val ?? "";
  return n.toLocaleString("en-IN");
};

const formatShortDate = (val) => {
  if (!val) return "";
  const [year, month, day] = String(val).split("-").map(Number);
  if (!year || !month || !day) return "";
  return `${day}/${month}/${String(year).slice(-2)}`;
};

const formatRangeText = (fromDate, toDate) => {
  const from = formatShortDate(fromDate);
  const to = formatShortDate(toDate);
  if (!from && !to) return "";
  return `${from || "..."}-${to || "..."}`;
};

const numericCell = (val, sx = {}) => (
  <Box component="span" sx={{ display: "block", textAlign: "right", fontVariantNumeric: "tabular-nums", ...sx }}>{val}</Box>
);

const percentCell = (val) => {
  const n = Number(val);
  return numericCell(`${fmt(val)}%`, { fontWeight: 500, color: n >= 0 ? "success.main" : "error.main" });
};

const SalesVsPurchase = () => {
  const navigate = useNavigate();
  const [activeField, setActiveField] = useState("brand");
  const [purchaseFromDate, setPurchaseFromDate] = useState("");
  const [purchaseToDate, setPurchaseToDate] = useState("");
  const [saleFromDate, setSaleFromDate] = useState("");
  const [saleToDate, setSaleToDate] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openRangePicker, setOpenRangePicker] = useState(null);
  const purchaseRangeRef = useRef(null);
  const saleRangeRef = useRef(null);

  const fetchData = useCallback(async (field) => {
    setLoading(true);
    try {
      const params = {
        groupBy: field,
        ...(saleFromDate ? { saleFromDate } : {}),
        ...(saleToDate ? { saleToDate } : {}),
        ...(purchaseFromDate ? { purchaseFromDate } : {}),
        ...(purchaseToDate ? { purchaseToDate } : {}),
        ...(storeFilter ? { company_id: storeFilter } : {}),
      };
      const res = await api.get("/sales-vs-purchase", { params });
      setData(res.data?.data || []);
      setTotals(res.data?.totals || null);
      setNotice(res.data?.notice || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load sales vs purchase");
      setData([]);
      setTotals(null);
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }, [purchaseFromDate, purchaseToDate, saleFromDate, saleToDate, storeFilter]);

  useEffect(() => {
    fetchData(activeField);
  }, [activeField, purchaseFromDate, purchaseToDate, saleFromDate, saleToDate, storeFilter, fetchData]);

  useEffect(() => {
    const handler = (e) => {
      if (
        openRangePicker === "purchase" &&
        purchaseRangeRef.current &&
        !purchaseRangeRef.current.contains(e.target)
      ) {
        setOpenRangePicker(null);
      }
      if (
        openRangePicker === "sale" &&
        saleRangeRef.current &&
        !saleRangeRef.current.contains(e.target)
      ) {
        setOpenRangePicker(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openRangePicker]);

  const handleFieldClick = (key) => setActiveField(key);

  const visibleFields = useMemo(() => {
    if (!fieldSearch.trim()) return COMPARER_FIELDS;
    const q = fieldSearch.toLowerCase().trim();
    return COMPARER_FIELDS.filter((f) => f.label.toLowerCase().includes(q));
  }, [fieldSearch]);

  const activeLabel = COMPARER_FIELDS.find((f) => f.key === activeField)?.label || activeField;
  const purchaseRangeText = formatRangeText(purchaseFromDate, purchaseToDate);
  const saleRangeText = formatRangeText(saleFromDate, saleToDate);
  const handleBackClick = () => navigate("/analytical");

  const columns = useMemo(() => [
    { key: "description", label: activeLabel },
    { key: "qty_sold", label: "Qty Sold", render: (v) => numericCell(fmtInt(v)) },
    { key: "qty_returned", label: "Returned", render: (v) => numericCell(fmtInt(v), { color: "error.main" }) },
    { key: "net_qty", label: "Net Qty", render: (v) => numericCell(fmtInt(v), { fontWeight: 500 }) },
    { key: "sale_amount", label: "Sale Amt", render: (v) => numericCell(fmt(v)) },
    { key: "purchase_amount", label: "Purchase Amt", render: (v) => numericCell(fmt(v)) },
    { key: "sale_price", label: "Sale Price", render: (v) => numericCell(fmt(v), { color: "primary.main" }) },
    { key: "purchase_price", label: "Purchase Price", render: (v) => numericCell(fmt(v), { color: "#9333ea" }) },
    { key: "margin_perc", label: "Margin %", render: (v) => percentCell(v) },
    { key: "markup_perc", label: "Mark Up %", render: (v) => percentCell(v) },
  ], [activeLabel]);

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
              { label: "Sales Vs Purchase" },
            ]}
          />
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
              <Box ref={purchaseRangeRef} sx={{ position: "relative" }}>
                <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                  Purchase Date
                </Typography>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setOpenRangePicker((prev) => (prev === "purchase" ? null : "purchase"))}
                  sx={{
                    display: "block", width: "100%", px: 1, py: 0.75, fontSize: 10.5, textAlign: "left",
                    border: "1px solid", borderColor: "divider", borderRadius: "5.25px", bgcolor: "background.paper",
                    color: "text.primary", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {purchaseRangeText || "dd/mm/yyyy-dd/mm/yyyy"}
                </Box>
                {openRangePicker === "purchase" && (
                  <Box
                    sx={{
                      position: "absolute", zIndex: 20, mt: 0.5, width: "100%", p: 1, bgcolor: "background.paper",
                      border: "1px solid", borderColor: "divider", borderRadius: "5.25px", boxShadow: 4,
                    }}
                  >
                    <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>From</Typography>
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { mb: 1 }]}
                      value={purchaseFromDate}
                      onChange={(e) => setPurchaseFromDate(e.target.value)}
                    />
                    <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>To</Typography>
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      sx={muiFieldSx}
                      value={purchaseToDate}
                      onChange={(e) => setPurchaseToDate(e.target.value)}
                    />
                    <Stack direction="row" sx={{ mt: 1, alignItems: "center", justifyContent: "space-between" }}>
                      <Button
                        type="button"
                        variant="text"
                        onClick={() => {
                          setPurchaseFromDate("");
                          setPurchaseToDate("");
                        }}
                        sx={{ minWidth: "auto", p: 0, fontSize: 11 }}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        variant="contained"
                        size="small"
                        onClick={() => setOpenRangePicker(null)}
                        sx={{ fontSize: 11, bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
                      >
                        Done
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Box>

              <Box ref={saleRangeRef} sx={{ position: "relative" }}>
                <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                  Sale Date
                </Typography>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setOpenRangePicker((prev) => (prev === "sale" ? null : "sale"))}
                  sx={{
                    display: "block", width: "100%", px: 1, py: 0.75, fontSize: 10.5, textAlign: "left",
                    border: "1px solid", borderColor: "divider", borderRadius: "5.25px", bgcolor: "background.paper",
                    color: "text.primary", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {saleRangeText || "dd/mm/yyyy-dd/mm/yyyy"}
                </Box>
                {openRangePicker === "sale" && (
                  <Box
                    sx={{
                      position: "absolute", zIndex: 20, mt: 0.5, width: "100%", p: 1, bgcolor: "background.paper",
                      border: "1px solid", borderColor: "divider", borderRadius: "5.25px", boxShadow: 4,
                    }}
                  >
                    <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>From</Typography>
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { mb: 1 }]}
                      value={saleFromDate}
                      onChange={(e) => setSaleFromDate(e.target.value)}
                    />
                    <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>To</Typography>
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      sx={muiFieldSx}
                      value={saleToDate}
                      onChange={(e) => setSaleToDate(e.target.value)}
                    />
                    <Stack direction="row" sx={{ mt: 1, alignItems: "center", justifyContent: "space-between" }}>
                      <Button
                        type="button"
                        variant="text"
                        onClick={() => {
                          setSaleFromDate("");
                          setSaleToDate("");
                        }}
                        sx={{ minWidth: "auto", p: 0, fontSize: 11 }}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        variant="contained"
                        size="small"
                        onClick={() => setOpenRangePicker(null)}
                        sx={{ fontSize: 11, bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
                      >
                        Done
                      </Button>
                    </Stack>
                  </Box>
                )}
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
              sx={muiFieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <Box sx={{ color: "text.disabled", display: "inline-flex", mr: 0.5 }}>
                      <MagnifyingGlassIcon style={{ width: 16, height: 16 }} />
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
              <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>Sales Vs Purchase</Typography>
              <Typography sx={{ fontSize: 10.5, color: "text.secondary", mt: 0.25 }}>
                Grouped by: <Box component="span" sx={{ fontWeight: 500, color: "#6366f1" }}>{activeLabel}</Box>
                {purchaseRangeText ? (
                  <Box component="span">
                    {" "}• Purchase Range: <Box component="span" sx={{ fontWeight: 500, color: "#6366f1" }}>{purchaseRangeText}</Box>
                  </Box>
                ) : null}
                {saleRangeText ? (
                  <Box component="span">
                    {" "}• Sale Range: <Box component="span" sx={{ fontWeight: 500, color: "#6366f1" }}>{saleRangeText}</Box>
                  </Box>
                ) : null}
                {" "}— {data.length} record{data.length !== 1 ? "s" : ""}
              </Typography>
            </Box>
            <Button
              onClick={() => fetchData(activeField)}
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
              <Box component="span">Qty Sold: {fmtInt(totals.qty_sold)}</Box>
              <Box component="span" sx={{ color: "error.main" }}>Returned: {fmtInt(totals.qty_returned)}</Box>
              <Box component="span">Net Qty: {fmtInt(totals.net_qty)}</Box>
              <Box component="span">Sale Amt: {fmt(totals.sale_amount)}</Box>
              <Box component="span">Purchase Amt: {fmt(totals.purchase_amount)}</Box>
              <Box component="span" sx={{ color: "primary.main" }}>Sale Price: {fmt(totals.sale_price)}</Box>
              <Box component="span" sx={{ color: "#9333ea" }}>Purchase Price: {fmt(totals.purchase_price)}</Box>
              <Box component="span" sx={{ color: "success.main" }}>Margin: {fmt(totals.margin_perc)}%</Box>
              <Box component="span" sx={{ color: "success.main" }}>Mark Up: {fmt(totals.markup_perc)}%</Box>
            </Stack>
          )}

          <FilterableDataTable
            rows={data}
            columns={columns}
            rowKey="description"
            loading={loading}
            searchPlaceholder={`Search in ${activeLabel.toLowerCase()}...`}
            emptyText={notice || `No data found for ${activeLabel}`}
            tablePreferenceKey="analytical.sales-vs-purchase"
            onExportRows={async () => data}
            exportFileName="sales-vs-purchase"
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

export default SalesVsPurchase;
