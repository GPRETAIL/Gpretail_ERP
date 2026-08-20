import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import PageSkeleton from "../../components/PageSkeleton";

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
        render: (value) => <span className="font-mono text-[11px]">{value || "-"}</span>,
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
        render: (value) => <div className="text-right">{toNum(value)}</div>,
      },
      {
        key: "stock",
        label: "Stock",
        render: (value) => <div className="text-right">{toNum(value)}</div>,
      },
      {
        key: "cost",
        label: "Cost",
        render: (value) => <div className="text-right">{toNum(value).toFixed(2)}</div>,
      },
      {
        key: "sale",
        label: "Sale",
        render: (value) => <div className="text-right">{toNum(value).toFixed(2)}</div>,
      },
      {
        key: "net",
        label: "Net",
        render: (value) => <div className="text-right">{toNum(value).toFixed(2)}</div>,
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/warehouse")}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
            >
              Warehouse
            </button>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-800 dark:text-gray-100">Item Locator</span>
          </h1>
        </div>
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
      </div>

      <div className="p-4 space-y-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-300 dark:border-gray-600">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Search Filters</div>
            <button
              type="button"
              onClick={() => setFiltersCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {filtersCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {filtersCollapsed ? "Expand" : "Collapse"}
            </button>
          </div>

          {!filtersCollapsed && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode</label>
                <div className="flex flex-wrap items-center gap-4">
                  {modeOptions.map((option) => (
                    <label key={option.value} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="radio"
                        name="locator-mode"
                        checked={filters.mode === option.value}
                        onChange={() => updateFilter("mode", option.value)}
                        className="h-4 w-4 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Barcode</label>
                <div className="flex gap-2">
                  <input
                    value={filters.barcode}
                    onChange={(e) => updateFilter("barcode", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={onSearch}
                    disabled={searching}
                    className="glass-btn glass-btn-primary min-w-[72px] inline-flex items-center justify-center disabled:opacity-60"
                  >
                    Go
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product</label>
                <select
                  value={filters.product}
                  onChange={(e) => updateFilter("product", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select product</option>
                  {dropdownOptions.product.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Style</label>
                <select
                  value={filters.style}
                  onChange={(e) => updateFilter("style", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select style</option>
                  {dropdownOptions.style.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Size</label>
                <select
                  value={filters.size}
                  onChange={(e) => updateFilter("size", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select size</option>
                  {dropdownOptions.size.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
                <select
                  value={filters.supplier}
                  onChange={(e) => updateFilter("supplier", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select supplier</option>
                  {dropdownOptions.supplier.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Mobile No</label>
                <input
                  value={filters.customerMobile}
                  onChange={(e) => updateFilter("customerMobile", e.target.value)}
                  onKeyDown={handleFilterKeyDown}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bill No/Date</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={filters.billNo}
                    onChange={(e) => updateFilter("billNo", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Bill no"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={filters.billDate}
                    onChange={(e) => updateFilter("billDate", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bill Value Range / Price Range</label>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <input
                    value={filters.billValueMin}
                    onChange={(e) => updateFilter("billValueMin", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Bill min"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    value={filters.billValueMax}
                    onChange={(e) => updateFilter("billValueMax", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Bill max"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    value={filters.priceMin}
                    onChange={(e) => updateFilter("priceMin", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Price min"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    value={filters.priceMax}
                    onChange={(e) => updateFilter("priceMax", e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    placeholder="Price max"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Brand / Design</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={filters.brand}
                    onChange={(e) => updateFilter("brand", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select brand</option>
                    {dropdownOptions.brand.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.design}
                    onChange={(e) => updateFilter("design", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select design</option>
                    {dropdownOptions.design.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pattern/Color</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={filters.pattern}
                    onChange={(e) => updateFilter("pattern", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select pattern</option>
                    {dropdownOptions.pattern.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.color}
                    onChange={(e) => updateFilter("color", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select color</option>
                    {dropdownOptions.color.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Material/Type</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={filters.material}
                    onChange={(e) => updateFilter("material", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select material</option>
                    {dropdownOptions.material.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.type}
                    onChange={(e) => updateFilter("type", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select type</option>
                    {dropdownOptions.type.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={onSearch}
              disabled={searching}
              className="glass-btn glass-btn-primary inline-flex items-center justify-center disabled:opacity-60"
            >
              <Search className="w-4 h-4 mr-1" /> Search
            </button>
            <button
              onClick={onClear}
              disabled={searching}
              className="glass-btn glass-btn-secondary disabled:opacity-60"
            >
              Clear
            </button>
            <button
              onClick={onRefreshAndSearch}
              disabled={searching}
              className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden p-3">
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
        </div>
      </div>

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default ItemLocator;
