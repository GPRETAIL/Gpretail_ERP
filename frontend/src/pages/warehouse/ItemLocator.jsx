import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import PageSkeleton from "../../components/PageSkeleton";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Radio } from "@mui/material";

const filterRowSx = { display: "grid", gridTemplateColumns: "160px minmax(0, 1fr)", alignItems: "center", gap: 1 };

const normalize = (val) => String(val ?? "").trim().toLowerCase();
const toNum = (val) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
};
const modeOptions = [
  { value: "all_sales", label: "All Sales" },
  { value: "sales", label: "Sales" },
  { value: "stock", label: "Stock" },
  { value: "image", label: "Image" },
  { value: "estimate", label: "Estimate" },
];

const createInitialFilters = () => ({
  mode: "all_sales",
  barcode: "",
  product: "",
  style: "",
  size: "",
  supplier: "",
  customerMobile: "",
  billNo: "",
  billDate: "",
  billValueMin: "",
  billValueMax: "",
  priceMin: "",
  priceMax: "",
  brand: "",
  design: "",
  pattern: "",
  color: "",
  material: "",
  type: "",
});

const hasText = (value) => String(value ?? "").trim() !== "";
const matchesIncludes = (value, query) => !hasText(query) || normalize(value).includes(normalize(query));
const matchesExact = (value, query) => !hasText(query) || normalize(value) === normalize(query);
const inRange = (value, min, max) => {
  const number = toNum(value);
  const hasMin = hasText(min);
  const hasMax = hasText(max);
  if (hasMin && number < toNum(min)) return false;
  if (hasMax && number > toNum(max)) return false;
  return true;
};

const applyFilters = (rows, filters) =>
  rows.filter((row) => {
    if (filters.mode !== "all_sales" && normalize(row.mode) !== normalize(filters.mode)) return false;
    if (!matchesIncludes(row.barcode, filters.barcode)) return false;
    if (!matchesExact(row.product, filters.product)) return false;
    if (!matchesExact(row.style, filters.style)) return false;
    if (!matchesExact(row.size, filters.size)) return false;
    if (!matchesExact(row.supplier, filters.supplier)) return false;
    if (!matchesIncludes(row.customerMobile, filters.customerMobile)) return false;
    if (!matchesIncludes(row.billNo, filters.billNo)) return false;
    if (!matchesExact(row.billDate, filters.billDate)) return false;
    if (!inRange(row.billValue, filters.billValueMin, filters.billValueMax)) return false;
    if (!inRange(row.price, filters.priceMin, filters.priceMax)) return false;
    if (!matchesExact(row.brand, filters.brand)) return false;
    if (!matchesExact(row.design, filters.design)) return false;
    if (!matchesExact(row.pattern, filters.pattern)) return false;
    if (!matchesExact(row.colour, filters.color)) return false;
    if (!matchesExact(row.material, filters.material)) return false;
    if (!matchesExact(row.type, filters.type)) return false;
    return true;
  });

const ItemLocator = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });

  const [filters, setFilters] = useState(createInitialFilters);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [rawRows, setRawRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const dropdownOptions = useMemo(() => {
    const buildFieldOptions = (field) =>
      [...new Set(rawRows.map((row) => row[field]).filter((v) => v && v !== "-"))]
        .sort((a, b) => String(a).localeCompare(String(b)))
        .map((v) => ({ value: String(v), label: String(v) }));

    return {
      product: buildFieldOptions("product"),
      style: buildFieldOptions("style"),
      size: buildFieldOptions("size"),
      supplier: buildFieldOptions("supplier"),
      brand: buildFieldOptions("brand"),
      design: buildFieldOptions("design"),
      pattern: buildFieldOptions("pattern"),
      color: buildFieldOptions("colour"),
      material: buildFieldOptions("material"),
      type: buildFieldOptions("type"),
    };
  }, [rawRows]);

  const itemLocatorColumns = useMemo(
    () => [
      {
        key: "barcode",
        label: "Barcode",
        render: (value) => (
          <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11 }}>
            {value || "-"}
          </Box>
        ),
      },
      { key: "batch", label: "Batch" },
      { key: "source", label: "Source" },
      { key: "company", label: "Company" },
      { key: "supplier", label: "Supplier" },
      { key: "product", label: "Product" },
      { key: "brand", label: "Brand" },
      { key: "colour", label: "Colour" },
      { key: "material", label: "Material" },
      { key: "pattern", label: "Pattern" },
      { key: "style", label: "Style" },
      { key: "sleeve", label: "Sleeve" },
      { key: "fit", label: "Fit" },
      { key: "type", label: "Type" },
      { key: "size", label: "Size" },
      { key: "section", label: "Section" },
      { key: "design", label: "Design" },
      { key: "hsn", label: "HSN" },
      { key: "invoiceNo", label: "Invoice No" },
      { key: "lrNo", label: "LR No" },
      {
        key: "qty",
        label: "Qty",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNum(value)}</Box>,
      },
      {
        key: "stock",
        label: "Stock",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNum(value)}</Box>,
      },
      {
        key: "cost",
        label: "Cost",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNum(value).toFixed(2)}</Box>,
      },
      {
        key: "sale",
        label: "Sale",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNum(value).toFixed(2)}</Box>,
      },
      {
        key: "net",
        label: "Net",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNum(value).toFixed(2)}</Box>,
      },
    ],
    []
  );

  const pagination = useMemo(() => {
    const total = rows.length;
    const totalPages = Math.max(Math.ceil(total / Math.max(limit, 1)), 1);
    return { total, totalPages };
  }, [rows.length, limit]);

  const loadData = async () => {
    const getAll = async (url) => {
      try {
        return await api.get(url, { params: { all: "true" } });
      } catch {
        return api.get(url);
      }
    };

    const [barcodesRes, transportRes, inventoryRes, directPurchaseRes, invoicesRes] =
      await Promise.all([
        getAll("/barcodes"),
        api.get("/transport-entries", { params: { all: "true" } }),
        getAll("/inventory-entries"),
        getAll("/direct-purchases"),
        getAll("/invoices"),
      ]);

    const barcodes = barcodesRes.data?.data || [];
    const transports = transportRes.data?.data || [];
    const inventoryEntries = inventoryRes.data?.data || [];
    const directPurchases = directPurchaseRes.data?.data || [];
    const invoices = invoicesRes.data?.data || [];

    const completedTransportMap = new Map(
      transports.filter((t) => t.status === "completed").map((t) => [t.id, t])
    );
    const directPurchaseMap = new Map(directPurchases.map((dp) => [dp.id, dp]));
    const invoiceMap = new Map();
    invoices.forEach((inv) => {
      if (!invoiceMap.has(inv.transport_entry_id)) {
        invoiceMap.set(inv.transport_entry_id, inv);
      }
    });

    const inventoryMap = new Map();
    for (const entry of inventoryEntries) {
      const itemMap = new Map((entry.items || []).map((item) => [item.id, item]));
      inventoryMap.set(entry.id, { ...entry, _itemMap: itemMap });
    }

    const mappedRows = barcodes
      .filter((b) => toNum(b.qty) > 0)
      .filter((b) => {
        const fromTransport = !!b.transport_entry_id && completedTransportMap.has(b.transport_entry_id);
        const fromDirectPurchase = !!b.direct_purchase_id && directPurchaseMap.has(b.direct_purchase_id);
        return fromTransport || fromDirectPurchase;
      })
      .map((barcodeRow) => {
        const transport = completedTransportMap.get(barcodeRow.transport_entry_id);
        const directPurchase = directPurchaseMap.get(barcodeRow.direct_purchase_id);
        const invoice = barcodeRow.transport_entry_id
          ? invoiceMap.get(barcodeRow.transport_entry_id)
          : null;
        const invEntry = inventoryMap.get(barcodeRow.inventory_entry_id);
        const invItem = invEntry?._itemMap?.get(barcodeRow.inventory_item_id);

        return {
          id: barcodeRow.id,
          mode: "stock",
          barcode: barcodeRow.barcode || "-",
          batch: barcodeRow.batch_id || "-",
          source: barcodeRow.direct_purchase_id ? "Direct Purchase" : "Transport",
          company: transport?.company?.name || directPurchase?.company?.name || "-",
          supplier:
            transport?.supplier?.name ||
            directPurchase?.supplier?.name ||
            invEntry?.supplier?.name ||
            "-",
          product: barcodeRow.product_name || invEntry?.product?.name || "-",
          brand: invEntry?.brand?.name || "-",
          colour: invEntry?.color?.name || "-",
          material: invEntry?.material?.name || "-",
          pattern: invEntry?.pattern?.name || "-",
          style: invEntry?.style?.name || "-",
          sleeve: invEntry?.sleeve?.name || "-",
          fit: invEntry?.fit?.name || "-",
          type: invEntry?.type?.name || "-",
          size: barcodeRow.size || invItem?.size || "-",
          section: transport?.section || directPurchase?.retail_location || "Direct Purchase",
          design: barcodeRow.design_no || invItem?.design_no || "-",
          hsn: invEntry?.hsn_code || "-",
          customerMobile: "-",
          billNo: invoice?.invoice_no || directPurchase?.invoice_no || "-",
          billDate: invoice?.invoice_date || directPurchase?.invoice_date || "-",
          billValue: toNum(invoice?.bill_value || directPurchase?.bill_value),
          price: toNum(barcodeRow.final_price || barcodeRow.selling_price),
          invoiceNo: invoice?.invoice_no || directPurchase?.invoice_no || "-",
          lrNo: transport?.lr_no || directPurchase?.lr_no || "-",
          qty: toNum(barcodeRow.qty),
          stock: toNum(barcodeRow.qty),
          cost: toNum(barcodeRow.cost),
          sale: toNum(barcodeRow.selling_price),
          net: toNum(barcodeRow.final_price),
        };
      })
      .sort((a, b) => String(b.id).localeCompare(String(a.id)));

    setRawRows(mappedRows);
    setRows(mappedRows);
    return mappedRows;
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadData();
      } catch (err) {
        console.error("Failed to load item locator data:", err);
        setToast({
          open: true,
          type: "error",
          message: "Failed to load item locator data",
        });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const main = document.querySelector('main[data-enter-scope="true"]');
    const contentWrapper = main?.parentElement;
    const shell = contentWrapper?.parentElement;
    if (!main || !contentWrapper || !shell) return undefined;

    const previousMainOverflow = main.style.overflow;
    const previousMainMinHeight = main.style.minHeight;
    const previousContentOverflow = contentWrapper.style.overflow;
    const previousShellHeight = shell.style.height;
    const previousShellMinHeight = shell.style.minHeight;
    const previousShellOverflow = shell.style.overflow;

    main.style.overflow = "visible";
    main.style.minHeight = "auto";
    contentWrapper.style.overflow = "visible";
    shell.style.height = "auto";
    shell.style.minHeight = "100vh";
    shell.style.overflow = "visible";

    return () => {
      main.style.overflow = previousMainOverflow;
      main.style.minHeight = previousMainMinHeight;
      contentWrapper.style.overflow = previousContentOverflow;
      shell.style.height = previousShellHeight;
      shell.style.minHeight = previousShellMinHeight;
      shell.style.overflow = previousShellOverflow;
    };
  }, []);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFilterKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onSearch();
  };

  const onSearch = async () => {
    setSearching(true);
    try {
      const filtered = applyFilters(rawRows, filters);
      setRows(filtered);
      setPage(1);
      setFiltersCollapsed(true);
      setToast({
        open: true,
        type: "success",
        message: `Showing ${filtered.length} item(s)`,
      });
    } finally {
      setSearching(false);
    }
  };

  const onRefreshAndSearch = async () => {
    setSearching(true);
    try {
      const latestRows = await loadData();
      const filtered = applyFilters(latestRows || [], filters);
      setRows(filtered);
      setPage(1);
      setFiltersCollapsed(true);
    } catch (err) {
      console.error("Failed to refresh item locator:", err);
      setToast({
        open: true,
        type: "error",
        message: "Failed to refresh data",
      });
    } finally {
      setSearching(false);
    }
  };

  const onClear = () => {
    const nextFilters = createInitialFilters();
    setFilters(nextFilters);
    setRows(rawRows);
    setPage(1);
    setFiltersCollapsed(false);
  };

  if (loading) {
    return <PageSkeleton variant="table" rows={8} cols={10} />;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ mr: 1.5, color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={() => navigate("/warehouse")} sx={{ minWidth: "auto", p: 0, fontSize: 12.25, fontWeight: 600 }}>
              Warehouse
            </Button>
            <Box component="span" sx={{ color: "text.disabled" }}>/</Box>
            <Box component="span" sx={{ color: "text.primary" }}>Item Locator</Box>
          </Stack>
        </Stack>
        <ExportBottomSheet
          columns={itemLocatorColumns}
          rows={rows}
          onExportRows={async () => {
            const latestRows = await loadData();
            return applyFilters(latestRows || [], filters);
          }}
          fileName="item_locator"
          buttonClassName="topbar-action-btn topbar-action-export"
        />
      </Stack>

      <Stack spacing={1.5} sx={{ p: 2 }}>
        <Box sx={{ bgcolor: "background.paper", p: 2, borderRadius: "7px", boxShadow: 3, border: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Search Filters</Typography>
            <Button
              type="button"
              onClick={() => setFiltersCollapsed((prev) => !prev)}
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={filtersCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              sx={{ borderRadius: "3.5px", fontSize: 10.5, fontWeight: 500 }}
            >
              {filtersCollapsed ? "Expand" : "Collapse"}
            </Button>
          </Stack>

          {!filtersCollapsed && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2, 1fr)" }, gap: 2 }}>
            <Stack spacing={1.5}>
              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Mode</Typography>
                <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                  {modeOptions.map((option) => (
                    <Stack key={option.value} component="label" direction="row" spacing={0.75} sx={{ alignItems: "center", fontSize: 12.25, color: "text.secondary" }}>
                      <Radio
                        name="locator-mode"
                        checked={filters.mode === option.value}
                        onChange={() => updateFilter("mode", option.value)}
                        size="small"
                        sx={{ p: 0.5 }}
                      />
                      <Box component="span">{option.label}</Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Barcode</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    value={filters.barcode}
                    onChange={(e) => updateFilter("barcode", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                  />
                  <Button onClick={onSearch} disabled={searching} className="glass-btn glass-btn-primary" sx={{ minWidth: 72, opacity: searching ? 0.6 : 1 }}>
                    Go
                  </Button>
                </Stack>
              </Box>

              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Product</Typography>
                <TextField select value={filters.product} onChange={(e) => updateFilter("product", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                  <MenuItem value="">Select product</MenuItem>
                  {dropdownOptions.product.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Style</Typography>
                <TextField select value={filters.style} onChange={(e) => updateFilter("style", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                  <MenuItem value="">Select style</MenuItem>
                  {dropdownOptions.style.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Size</Typography>
                <TextField select value={filters.size} onChange={(e) => updateFilter("size", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                  <MenuItem value="">Select size</MenuItem>
                  {dropdownOptions.size.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Supplier</Typography>
                <TextField select value={filters.supplier} onChange={(e) => updateFilter("supplier", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                  <MenuItem value="">Select supplier</MenuItem>
                  {dropdownOptions.supplier.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Stack>

            <Stack spacing={1.5}>
              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Customer Mobile No</Typography>
                <TextField
                  value={filters.customerMobile}
                  onChange={(e) => updateFilter("customerMobile", e.target.value)}
                  onKeyDown={handleFilterKeyDown}
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                />
              </Box>

              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Bill No/Date</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1 }}>
                  <TextField
                    value={filters.billNo}
                    onChange={(e) => updateFilter("billNo", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Bill no"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                  />
                  <TextField
                    type="date"
                    value={filters.billDate}
                    onChange={(e) => updateFilter("billDate", e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                  />
                </Box>
              </Box>

              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Bill Value Range / Price Range</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 1 }}>
                  <TextField
                    value={filters.billValueMin}
                    onChange={(e) => updateFilter("billValueMin", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Bill min"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                  />
                  <TextField
                    value={filters.billValueMax}
                    onChange={(e) => updateFilter("billValueMax", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Bill max"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                  />
                  <TextField
                    value={filters.priceMin}
                    onChange={(e) => updateFilter("priceMin", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Price min"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                  />
                  <TextField
                    value={filters.priceMax}
                    onChange={(e) => updateFilter("priceMax", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Price max"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                  />
                </Box>
              </Box>

              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Brand / Design</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1 }}>
                  <TextField select value={filters.brand} onChange={(e) => updateFilter("brand", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                    <MenuItem value="">Select brand</MenuItem>
                    {dropdownOptions.brand.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField select value={filters.design} onChange={(e) => updateFilter("design", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                    <MenuItem value="">Select design</MenuItem>
                    {dropdownOptions.design.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>

              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Pattern/Color</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1 }}>
                  <TextField select value={filters.pattern} onChange={(e) => updateFilter("pattern", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                    <MenuItem value="">Select pattern</MenuItem>
                    {dropdownOptions.pattern.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField select value={filters.color} onChange={(e) => updateFilter("color", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                    <MenuItem value="">Select color</MenuItem>
                    {dropdownOptions.color.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>

              <Box sx={filterRowSx}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Material/Type</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1 }}>
                  <TextField select value={filters.material} onChange={(e) => updateFilter("material", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                    <MenuItem value="">Select material</MenuItem>
                    {dropdownOptions.material.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField select value={filters.type} onChange={(e) => updateFilter("type", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                    <MenuItem value="">Select type</MenuItem>
                    {dropdownOptions.type.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>
            </Stack>
            </Box>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", alignItems: "center" }}>
            <Button onClick={onSearch} disabled={searching} className="glass-btn glass-btn-primary" startIcon={<Search size={16} />} sx={{ opacity: searching ? 0.6 : 1 }}>
              Search
            </Button>
            <Button onClick={onClear} disabled={searching} className="glass-btn glass-btn-secondary" sx={{ opacity: searching ? 0.6 : 1 }}>
              Clear
            </Button>
            <Button
              onClick={onRefreshAndSearch}
              disabled={searching}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: "3.5px", fontSize: 10.5, px: 1.5, py: 1, opacity: searching ? 0.6 : 1 }}
            >
              Refresh
            </Button>
          </Stack>
        </Box>
      </Stack>

      <Box sx={{ p: 2, pt: 0 }}>
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflow: "hidden", p: 1.5 }}>
          <FilterableDataTable
            rows={rows}
            columns={itemLocatorColumns}
            loading={loading}
            loadingText="Loading item locator..."
            emptyText="No items found for this search."
            searchPlaceholder="Search in item locator fields..."
            showExport={false}
            tablePreferenceKey="warehouse.item_locator.list"
            enableColumnResize
            onRefresh={onRefreshAndSearch}
            refreshDisabled={searching}
            page={page}
            limit={limit}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
            paginationMode="client"
            enableVirtualization
          />
        </Box>
      </Box>

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
};

export default ItemLocator;
