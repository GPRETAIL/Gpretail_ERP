import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import FilterableDataTable from "../../components/FilterableDataTable";
import UploadImportButton from "../../components/UploadImportButton";

const PRODUCT_IMPORT_CONFIG = {
  aliases: {
    code: "code", name: "name",
    productgroupid: "product_group_id", productgroup: "product_group_id",
    productgroupname: "product_group_id",
    productgroupcode: "product_group_id",
    brandid: "brand_id", brand: "brand_id",
    brandname: "brand_id",
    companyid: "company_id", company: "company_id",
    companyname: "company_id",
    salestax: "sales_tax_id", salestaxid: "sales_tax_id", salestaxpercentage: "sales_tax_id",
    purchasetax: "purchase_tax_id", purchasetaxid: "purchase_tax_id", purchasetaxpercentage: "purchase_tax_id",
    sizegroup: "size_group_id", sizegroupid: "size_group_id",
    size: "size_group_id", sizes: "size_group_id",
    barcodeid: "barcode_id",
    barcodeattr: "barcode_id", barcodeattribute: "barcode_id",
    barcodesource: "barcode_source", barcodemode: "barcode_mode",
    discountmode: "discount_mode", discountvalue: "discount_mode_value", discountmodevalue: "discount_mode_value",
    marginmin: "margin_min", marginmax: "margin_max",
    stockholdingperiod: "stock_holding_period",
    purchaseplanmode: "purchase_plan_mode",
    expectedgender: "expected_gender",
    active: "active", isactive: "active",
    createdby: "created_by", created_by: "created_by",
    updatedby: "updated_by", updated_by: "updated_by",
  },
  required: ["name"],
  boolFields: ["active", "dumping", "cess", "daily_price", "is_core", "exclude_reward", "auto_po"],
  sampleFileName: "product_sample.xlsx",
  sampleHeaders: [
    "code", "name", "product_group", "brand", "sales_tax", "purchase_tax",
    "size_group", "hsn", "type", "barcode_mode", "barcode_source", "barcode_attr",
    "uom", "selling_mode", "discount_mode", "discount_mode_value", "margin_min", "margin_max",
    "stock_holding_period", "purchase_plan_mode", "expected_gender", "section",
    "company", "dumping", "dumping_value", "cess", "cess_value", "daily_price",
    "daily_price_value", "is_core", "is_core_value", "exclude_reward", "auto_po",
    "auto_po_value", "active", "created_by",
  ],
};

const BARCODE_MODE_OPTIONS = [
  { label: "Unique", value: "Unique" },
  { label: "CAPS and Number", value: "CAPS and Number" },
  { label: "Only Number", value: "Only Number" },
  { label: "UAN", value: "UAN" },
  { label: "PACK / SERIAL", value: "PACK / SERIAL" },
  { label: "IEMI", value: "IEMI" },
];

const DISCOUNT_MODE_OPTIONS = [
  { label: "Allow Discount On Bill", value: "Allow Discount On Bill" },
  { label: "Layolty Discount", value: "Layolty Discount" },
  { label: "No Addln.Discount On Bill", value: "No Addln.Discount On Bill" },
  { label: "Fixed Discount By Percentage", value: "Fixed Discount By Percentage" },
];

const BARCODE_SOURCE_OPTIONS = [
  { label: "STOCK GENERATION", value: "STOCK GENERATION" },
  { label: "ITEM-GLN/UAN/GS1", value: "ITEM-GLN/UAN/GS1" },
  { label: "PURCHASE-IMEI", value: "PURCHASE-IMEI" },
  { label: "PRODUCT CODE", value: "PRODUCT CODE" },
];

const PURCHASE_PLAN_MODE_OPTIONS = [
  { label: "SUPPLIER VS PRICE", value: "SUPPLIER VS PRICE" },
  { label: "BRAND VS SIZE", value: "BRAND VS SIZE" },
  { label: "SIZE VS PRICE", value: "SIZE VS PRICE" },
  { label: "MATERIAL VS PRICE", value: "MATERIAL VS PRICE" },
  { label: "TYPE VS PRICE", value: "TYPE VS PRICE" },
  { label: "SIZE VS FIT VS SLEEVE", value: "SIZE VS FIT VS SLEEVE" },
];

const EXPECTED_GENDER_OPTIONS = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Boy", value: "Boy" },
  { label: "Girl", value: "Girl" },
];

const TYPE_OPTIONS = [
  { label: "FMCG Products", value: "FMCG Products" },
  { label: "Groceries", value: "Groceries" },
  { label: "Textile", value: "Textile" },
  { label: "Vegitable/Fruites", value: "Vegitable/Fruites" },
  { label: "Foods", value: "Foods" },
  { label: "Mobile", value: "Mobile" },
  { label: "Accessories", value: "Accessories" },
  { label: "Jewellery", value: "Jewellery" },
  { label: "Consumables", value: "Consumables" },
];

const SELLING_MODE_OPTIONS = [
  { label: "Piece", value: "Piece" },
  { label: "Pack", value: "Pack" },
  { label: "Cut", value: "Cut" },
];

const BULK_EDIT_INITIAL = {
  brandId: "",
  purchaseTaxId: "",
  salesTaxId: "",
  sellingMode: "",
  barcodeMode: "",
  barcodeSource: "",
  discountMode: "",
  purchasePlanMode: "",
  expectedGender: "",
  section: "",
  sizeGroupId: "",
  type: "",
  hsn: "",
};

const PRODUCT_COLUMNS = [
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "productGroup", label: "Product Group" },
  { key: "brand", label: "Brand" },
  { key: "company", label: "Store/Warehouse" },
  { key: "hsn", label: "HSN" },
  { key: "type", label: "Type" },
  { key: "uom", label: "UOM" },
  { key: "section", label: "Section" },
  { key: "sellingMode", label: "Selling Mode" },
  { key: "salesTax", label: "Sales Tax" },
  { key: "purchaseTax", label: "Purchase Tax" },
  { key: "sizeGroup", label: "Size Group" },
  { key: "barcodeMode", label: "Barcode Mode" },
  { key: "barcodeSource", label: "Barcode Source" },
  { key: "barcodeId", label: "Barcode ID" },
  { key: "discountMode", label: "Discount Mode" },
  { key: "discountModeValue", label: "Discount Value" },
  { key: "marginMin", label: "Margin Min" },
  { key: "marginMax", label: "Margin Max" },
  { key: "stockHoldingPeriod", label: "Stock Holding Period" },
  { key: "purchasePlanMode", label: "Purchase Plan Mode" },
  { key: "expectedGender", label: "Expected Gender" },
  { key: "dumping", label: "Dumping" },
  { key: "dumpingValue", label: "Dumping Value" },
  { key: "cess", label: "Cess" },
  { key: "cessValue", label: "Cess Value" },
  { key: "dailyPrice", label: "Daily Price" },
  { key: "dailyPriceValue", label: "Daily Price Value" },
  { key: "isCore", label: "Is Core" },
  { key: "isCoreValue", label: "Is Core Value" },
  { key: "excludeReward", label: "Exclude Reward" },
  { key: "autoPo", label: "Auto PO" },
  { key: "autoPoValue", label: "Auto PO Value" },
  { key: "createdBy", label: "Created By" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedBy", label: "Updated By" },
  { key: "updatedAt", label: "Updated At" },
  { key: "purchaseEntryAttrs", label: "Purchase Entry Attributes" },
  { key: "active", label: "Active" },
];

const FILTER_DEFAULT = { operator: "contains", value: "" };

const isColumnFilterActive = (filter) => {
  if (!filter) return false;
  if (filter.operator === "blank" || filter.operator === "not_blank") return true;
  return String(filter.value || "").trim() !== "";
};

const buildActiveColumnFilters = (filters = {}) =>
  Object.entries(filters)
    .filter(([, filter]) => isColumnFilterActive(filter))
    .map(([field, filter]) => ({
      field,
      operator: filter?.operator || FILTER_DEFAULT.operator,
      value: String(filter?.value || ""),
    }));

const toText = (value, fallback = "--") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
};

const formatDateTime = (value) => {
  if (!value) return "--";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return toText(value);
  return dt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// rowKey is a synthesized composite key, not the numeric id -- delete/update act on
// (code, company_id) pairs (see parseSelectedProductKey below and the backend's
// /products/{code}?company_id=... contract), and code alone is only unique per store.
const mapProductRow = (p) => ({
  id: p.id,
  company_id: p.company_id || p.companyRef?.id || null,
  rowKey: `${p.company_id || p.companyRef?.id || 0}:${toText(p.code)}`,
  code: toText(p.code),
  name: toText(p.name),
  productGroup: toText(p.productGroup?.name || p.category?.name),
  brand: toText(p.brand?.name),
  company: p.companyRef?.name || p.company || "--",
  hsn: toText(p.hsn || p.hsn_code),
  type: toText(p.type),
  uom: toText(p.uom || p.unit),
  section: toText(p.section),
  sellingMode: toText(p.selling_mode),
  salesTax: (p.salesTax || p.tax)
    ? `${toText((p.salesTax || p.tax).name)} (${toText((p.salesTax || p.tax).tax_percentage ?? (p.salesTax || p.tax).rate, "0")}%)`
    : "--",
  purchaseTax: p.purchaseTax
    ? `${toText(p.purchaseTax.name)} (${toText(p.purchaseTax.tax_percentage, "0")}%)`
    : "--",
  sizeGroup: toText(p.sizeGroup?.group_name || p.size_group?.group_name),
  barcodeMode: toText(p.barcode_mode),
  barcodeSource: toText(p.barcode_source),
  barcodeId: toText(p.barcode_id || p.barcode),
  discountMode: toText(p.discount_mode),
  discountModeValue: toText(p.discount_mode_value),
  marginMin: toText(p.margin_min),
  marginMax: toText(p.margin_max),
  stockHoldingPeriod: toText(p.stock_holding_period),
  purchasePlanMode: toText(p.purchase_plan_mode),
  expectedGender: toText(p.expected_gender),
  dumping: p.dumping ? "Yes" : "No",
  dumpingValue: toText(p.dumping_value),
  cess: p.cess ? "Yes" : "No",
  cessValue: toText(p.cess_value),
  dailyPrice: p.daily_price ? "Yes" : "No",
  dailyPriceValue: toText(p.daily_price_value),
  isCore: p.is_core ? "Yes" : "No",
  isCoreValue: toText(p.is_core_value),
  excludeReward: p.exclude_reward ? "Yes" : "No",
  autoPo: p.auto_po ? "Yes" : "No",
  autoPoValue: toText(p.auto_po_value),
  createdBy: toText(p.created_by || p.createdByName),
  createdAt: formatDateTime(p.created_at || p.createdAt),
  updatedBy: toText(p.updated_by || p.updatedByName),
  updatedAt: formatDateTime(p.updated_at || p.updatedAt),
  purchaseEntryAttrs: Array.isArray(p.purchase_entry_attributes)
    ? p.purchase_entry_attributes
        .filter((a) => a && (a.selected === undefined || a.selected))
        .map((a) => a.name)
        .filter(Boolean)
        .join(", ") || "--"
    : "--",
  active: (p.active ?? p.is_active) ? "Yes" : "No",
});

const buildProductQuerySuffix = (companyId) =>
  companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";

const parseSelectedProductKey = (value) => {
  const [companyIdText, ...codeParts] = String(value || "").split(":");
  return {
    companyId: Number(companyIdText) || null,
    code: codeParts.join(":"),
  };
};

const Product = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [tableColumnFilters, setTableColumnFilters] = useState({});
  const [forceFetchAll, setForceFetchAll] = useState(false);

  const [selectedRows, setSelectedRows] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, code: null, name: "", company_id: null });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });

  const [bulkEditForm, setBulkEditForm] = useState(BULK_EDIT_INITIAL);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkBrandOptions, setBulkBrandOptions] = useState([]);
  const [bulkTaxOptions, setBulkTaxOptions] = useState([]);
  const [bulkSizeGroupOptions, setBulkSizeGroupOptions] = useState([]);

  const handleNew = () => {
    navigate(`/masters/product/new`);
  };

  const handleEdit = (product) => {
    navigate(`/masters/product/${encodeURIComponent(product.code)}${buildProductQuerySuffix(product.company_id)}`);
  };

  const fetchProducts = useCallback(async (
    pageToLoad = page,
    limitToLoad = limit,
    queryOverride = tableSearch,
    filtersOverride = tableColumnFilters
  ) => {
    try {
      setLoading(true);
      const query = String(queryOverride || "").trim();
      const activeColumnFilters = buildActiveColumnFilters(filtersOverride);
      const hasColumnFilters = activeColumnFilters.length > 0;
      const params = {
        page: pageToLoad,
        limit: limitToLoad,
        search: query || undefined,
        field: query && tableSearchField !== "all" ? tableSearchField : undefined,
        column_filters: hasColumnFilters ? JSON.stringify(activeColumnFilters) : undefined,
        ...(forceFetchAll ? { all: "true" } : {}),
      };
      const res = await api.get("/products", { params });
      const rows = (res.data?.data || []).map(mapProductRow);
      setProducts(rows);

      const total = Number(res.data?.total ?? res.data?.pagination?.total ?? rows.length) || 0;
      const totalPages = Math.max(
        Number(res.data?.totalPages ?? res.data?.pagination?.last_page ?? Math.ceil(total / Math.max(limitToLoad, 1))) || 1,
        1
      );
      setPagination({ total, totalPages });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, limit, tableSearch, tableSearchField, tableColumnFilters, forceFetchAll]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, tableSearch, tableSearchField, tableColumnFilters, forceFetchAll]);

  const handleServerSearch = useCallback(({ query, field, fetchAll, columnFilters }) => {
    setTableSearch(query);
    setTableSearchField(field || "all");
    setTableColumnFilters(columnFilters || {});
    const hasColumnFilters = buildActiveColumnFilters(columnFilters || {}).length > 0;
    setForceFetchAll(!!fetchAll || hasColumnFilters);
    setPage(1);
  }, []);

  const handleExportRows = useCallback(async ({ query, field, columnFilters } = {}) => {
    const activeColumnFilters = buildActiveColumnFilters(columnFilters || tableColumnFilters);
    const searchQuery = query !== undefined ? String(query || "").trim() : String(tableSearch || "").trim();
    const searchFieldToUse = field || tableSearchField;
    const params = {
      all: "true",
      search: searchQuery || undefined,
      field: searchQuery && searchFieldToUse !== "all" ? searchFieldToUse : undefined,
      column_filters: activeColumnFilters.length > 0 ? JSON.stringify(activeColumnFilters) : undefined,
    };
    const res = await api.get("/products", { params });
    return (res.data?.data || []).map(mapProductRow);
  }, [tableSearch, tableSearchField, tableColumnFilters]);

  const handleDeleteConfirmed = async () => {
    const { code, name, company_id } = confirm;
    setConfirm({ open: false, code: null, name: "", company_id: null });
    try {
      await api.delete(`/products/${encodeURIComponent(code)}`, {
        params: company_id ? { company_id } : undefined,
      });
      toast.success(`"${name}" deleted successfully.`);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete product");
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    // Delete each independently (not Promise.all fail-fast) so partial success is handled and
    // each failure's real reason — e.g. "still has stock. Barcode X still has N pcs." — is shown.
    const results = await Promise.all(
      keys.map((key) => {
        const { code, companyId } = parseSelectedProductKey(key);
        return api
          .delete(`/products/${encodeURIComponent(code)}`, {
            params: companyId ? { company_id: companyId } : undefined,
          })
          .then(() => ({ ok: true, code }))
          .catch((err) => ({
            ok: false,
            code,
            reason: err.response?.data?.message || "Failed to delete",
          }));
      })
    );
    const deleted = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);
    if (deleted.length > 0) toast.success(`${deleted.length} product(s) deleted`);
    failures.slice(0, 4).forEach((f) => toast.error(`${f.code}: ${f.reason}`));
    if (failures.length > 4) {
      toast.error(`+${failures.length - 4} more product(s) could not be deleted.`);
    }
    setSelectedRows([]);
    fetchProducts();
  };

  const showBulkEditPanel = selectedRows.length > 1;

  const handleBulkFieldChange = (field, value) => {
    setBulkEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetBulkEditForm = () => setBulkEditForm(BULK_EDIT_INITIAL);

  const handleBulkUpdate = async () => {
    if (selectedRows.length < 2) {
      toast.error("Select at least 2 products for bulk edit");
      return;
    }

    const payload = {};
    if (bulkEditForm.brandId) payload.brand_id = Number(bulkEditForm.brandId);
    if (bulkEditForm.purchaseTaxId) payload.purchase_tax_id = Number(bulkEditForm.purchaseTaxId);
    if (bulkEditForm.salesTaxId) payload.sales_tax_id = Number(bulkEditForm.salesTaxId);
    if (bulkEditForm.sellingMode) payload.selling_mode = bulkEditForm.sellingMode;
    if (bulkEditForm.barcodeMode) payload.barcode_mode = bulkEditForm.barcodeMode;
    if (bulkEditForm.barcodeSource) payload.barcode_source = bulkEditForm.barcodeSource;
    if (bulkEditForm.discountMode) payload.discount_mode = bulkEditForm.discountMode;
    if (bulkEditForm.purchasePlanMode) payload.purchase_plan_mode = bulkEditForm.purchasePlanMode;
    if (bulkEditForm.expectedGender) payload.expected_gender = bulkEditForm.expectedGender;
    if (bulkEditForm.sizeGroupId) payload.size_group_id = Number(bulkEditForm.sizeGroupId);
    if (String(bulkEditForm.section || "").trim()) payload.section = String(bulkEditForm.section).trim();
    if (String(bulkEditForm.type || "").trim()) payload.type = String(bulkEditForm.type).trim();
    if (String(bulkEditForm.hsn || "").trim()) payload.hsn = String(bulkEditForm.hsn).trim();

    if (Object.keys(payload).length === 0) {
      toast.info("Select at least one field to update");
      return;
    }

    setBulkUpdating(true);
    try {
      const results = await Promise.allSettled(
        selectedRows.map((key) => {
          const { code, companyId } = parseSelectedProductKey(key);
          return api.put(
            `/products/${encodeURIComponent(code)}`,
            companyId ? { ...payload, company_id: companyId } : payload,
            { params: companyId ? { company_id: companyId } : undefined }
          );
        })
      );
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`${successCount} product(s) updated`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} product(s) failed to update`);
      }

      if (successCount > 0) {
        await fetchProducts(page, limit, tableSearch);
        resetBulkEditForm();
      }
      if (failedCount === 0) {
        setSelectedRows([]);
      }
    } catch {
      toast.error("Bulk update failed");
    } finally {
      setBulkUpdating(false);
    }
  };

  useEffect(() => {
    if (selectedRows.length <= 1) {
      resetBulkEditForm();
    }
  }, [selectedRows.length]);

  useEffect(() => {
    if (!showBulkEditPanel || bulkBrandOptions.length > 0) return;
    let active = true;
    const loadBulkEditOptions = async () => {
      try {
        const [brandRes, taxRes, sizeGroupRes] = await Promise.all([
          api.get("/brands", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
          api.get("/taxes", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
          api.get("/size-groups", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
        ]);
        if (!active) return;

        setBulkBrandOptions(
          (brandRes.data?.data || []).map((row) => ({
            value: String(row.id),
            label: row.name || row.code || `Brand ${row.id}`,
          }))
        );
        setBulkTaxOptions(
          (taxRes.data?.data || []).map((row) => ({
            value: String(row.id),
            label: `${row.name || row.tax_code || `Tax ${row.id}`} (${row.tax_percentage ?? 0}%)`,
          }))
        );
        setBulkSizeGroupOptions(
          (sizeGroupRes.data?.data || []).map((row) => ({
            value: String(row.id),
            label: row.group_name || `Size Group ${row.id}`,
          }))
        );
      } catch {
        // silent
      }
    };
    loadBulkEditOptions();
    return () => {
      active = false;
    };
  }, [showBulkEditPanel, bulkBrandOptions.length]);

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, code: null, name: "", company_id: null })}
      />
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected product(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/masters")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Master
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Products</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button
            onClick={handleNew}
            className="topbar-action-btn topbar-action-new"
          >
            <PlusCircle className="w-3 h-3 mr-1" /> New
          </button>
          <span>|</span>
          <UploadImportButton
            endpoint="/products/bulk"
            fieldConfig={PRODUCT_IMPORT_CONFIG}
            onDone={() => {
              if (page === 1) fetchProducts(1, limit, tableSearch);
              else setPage(1);
            }}
          />
          <span>|</span>
          <ExportBottomSheet
            columns={PRODUCT_COLUMNS}
            rows={products}
            selectedRowKeys={selectedRows}
            rowKey="rowKey"
            onExportRows={handleExportRows}
            fileName="products"
            buttonClassName="topbar-action-btn topbar-action-export"
          />
        </div>
      </div>

      <div className="p-3 flex-1 min-h-0">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col min-h-0 px-3 pt-3 pb-0.5">
          <h2 className="text-base font-bold mb-1.5">Product Search</h2>
          <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
            {showBulkEditPanel && (
              <div className="lg:w-[28rem] w-full shrink-0 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 rounded-md p-2.5 overflow-y-auto max-h-[420px] lg:max-h-full">
                <h3 className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 mb-2">
                  Bulk Edit ({selectedRows.length} selected)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Brand</label>
                    <select
                      value={bulkEditForm.brandId}
                      onChange={(e) => handleBulkFieldChange("brandId", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Brand</option>
                      {bulkBrandOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Purchase Tax</label>
                    <select
                      value={bulkEditForm.purchaseTaxId}
                      onChange={(e) => handleBulkFieldChange("purchaseTaxId", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Purchase Tax</option>
                      {bulkTaxOptions.map((opt) => (
                        <option key={`p-${opt.value}`} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Sales Tax</label>
                    <select
                      value={bulkEditForm.salesTaxId}
                      onChange={(e) => handleBulkFieldChange("salesTaxId", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Sales Tax</option>
                      {bulkTaxOptions.map((opt) => (
                        <option key={`s-${opt.value}`} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Selling Mode</label>
                    <select
                      value={bulkEditForm.sellingMode}
                      onChange={(e) => handleBulkFieldChange("sellingMode", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Selling Mode</option>
                      {SELLING_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Barcode Mode</label>
                    <select
                      value={bulkEditForm.barcodeMode}
                      onChange={(e) => handleBulkFieldChange("barcodeMode", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Barcode Mode</option>
                      {BARCODE_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Barcode Source</label>
                    <select
                      value={bulkEditForm.barcodeSource}
                      onChange={(e) => handleBulkFieldChange("barcodeSource", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Barcode Source</option>
                      {BARCODE_SOURCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Discount Mode</label>
                    <select
                      value={bulkEditForm.discountMode}
                      onChange={(e) => handleBulkFieldChange("discountMode", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Discount Mode</option>
                      {DISCOUNT_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Purchase Plan Mode</label>
                    <select
                      value={bulkEditForm.purchasePlanMode}
                      onChange={(e) => handleBulkFieldChange("purchasePlanMode", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Purchase Plan Mode</option>
                      {PURCHASE_PLAN_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Expected Gender</label>
                    <select
                      value={bulkEditForm.expectedGender}
                      onChange={(e) => handleBulkFieldChange("expectedGender", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Expected Gender</option>
                      {EXPECTED_GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Size Group</label>
                    <select
                      value={bulkEditForm.sizeGroupId}
                      onChange={(e) => handleBulkFieldChange("sizeGroupId", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Size Group</option>
                      {bulkSizeGroupOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Type</label>
                    <select
                      value={bulkEditForm.type}
                      onChange={(e) => handleBulkFieldChange("type", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                    >
                      <option value="">Select Type</option>
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change Section</label>
                    <input
                      type="text"
                      value={bulkEditForm.section}
                      onChange={(e) => handleBulkFieldChange("section", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                      placeholder="Section"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-0.5">Change HSN</label>
                    <input
                      type="text"
                      value={bulkEditForm.hsn}
                      onChange={(e) => handleBulkFieldChange("hsn", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[11px]"
                      placeholder="HSN"
                    />
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkUpdate}
                    disabled={bulkUpdating}
                    className="glass-btn glass-btn-primary disabled:opacity-50"
                  >
                    {bulkUpdating ? "Updating..." : "Update Selected"}
                  </button>
                  <button
                    type="button"
                    onClick={resetBulkEditForm}
                    disabled={bulkUpdating}
                    className="px-2.5 py-1 border border-gray-300 dark:border-gray-600 rounded-sm text-[11px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            <div className={`${showBulkEditPanel ? "lg:flex-[0_0_62%]" : "flex-1"} min-w-0 flex flex-col min-h-0`}>
              <FilterableDataTable
                rows={products}
                columns={PRODUCT_COLUMNS}
                loading={loading}
                searchPlaceholder="Search in product fields..."
                searchButtonClassName="glass-btn glass-btn-primary flex items-center h-8 px-2.5 text-[11px] disabled:opacity-50"
                showExport={false}
                onExportRows={handleExportRows}
                enableColumnResize
                enableKeyboardNav
                tablePreferenceKey="masters.products.list"
                onRefresh={() => fetchProducts()}
                refreshDisabled={loading}
                enableServerSearch
                onServerSearch={handleServerSearch}
                page={page}
                limit={limit}
                totalPages={pagination.totalPages}
                totalRows={pagination.total}
                onPageChange={setPage}
                onLimitChange={(value) => {
                  setLimit(value);
                  setPage(1);
                }}
                paginationMode="server"
                enableSelection
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
                onBulkDelete={handleBulkDelete}
                rowKey={(row) => row.rowKey}
                onRowClick={handleEdit}
                fillHeight
                renderActions={(product, { selectedCount } = {}) => (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      title="Edit"
                      disabled={selectedCount > 1}
                      className="glass-btn glass-btn-primary rounded p-1.5"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({ open: true, code: product.code, name: product.name, company_id: product.company_id })
                      }
                      className="glass-btn glass-btn-danger rounded p-1.5"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;
