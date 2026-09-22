import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { Box, Button, Card, Stack, Typography, TextField, MenuItem, IconButton, alpha } from "@mui/material";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import ConfirmDialog from "../../components/ConfirmDialog";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import FilterableDataTable from "../../components/FilterableDataTable";
import UploadImportButton from "../../components/UploadImportButton";
import { createGroupFetchers } from "../../utils/serverGrouping";

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

// Matches config('pagination.resources.products.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchProductGroupSummaries, onFetchGroupRows: fetchProductGroupRows } =
  createGroupFetchers("/products", { active: "is_active", brand: "brand_id" }, buildActiveColumnFilters);

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
  const [rawPagination, setRawPagination] = useState(null);
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
    filtersOverride = tableColumnFilters,
    cursorToken = null,
    appendMode = false
  ) => {
    try {
      setLoading(true);
      const query = String(queryOverride || "").trim();
      const activeColumnFilters = buildActiveColumnFilters(filtersOverride);
      const hasColumnFilters = activeColumnFilters.length > 0;
      const params = {
        ...(cursorToken ? { cursor: cursorToken } : { page: pageToLoad }),
        limit: limitToLoad,
        search: query || undefined,
        field: query && tableSearchField !== "all" ? tableSearchField : undefined,
        column_filters: hasColumnFilters ? JSON.stringify(activeColumnFilters) : undefined,
        ...(forceFetchAll ? { all: "true" } : {}),
      };
      const res = await api.get("/products", { params });
      const rows = (res.data?.data || []).map(mapProductRow);
      // "Load More" (cursorToken + appendMode) grows the list instead of replacing it -- every
      // other call site (initial load, search, filter, page-size change) still replaces, since
      // appendMode defaults to false.
      setProducts((prev) => (cursorToken && appendMode ? [...prev, ...rows] : rows));

      const total = Number(res.data?.total ?? res.data?.pagination?.total ?? rows.length) || 0;
      const totalPages = Math.max(
        Number(res.data?.totalPages ?? res.data?.pagination?.last_page ?? Math.ceil(total / Math.max(limitToLoad, 1))) || 1,
        1
      );
      setPagination({ total, totalPages });
      setRawPagination(res.data?.pagination || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, limit, tableSearch, tableSearchField, tableColumnFilters, forceFetchAll]);

  const handleNextCursor = useCallback(
    (cursor) => fetchProducts(page, limit, tableSearch, tableColumnFilters, cursor, true),
    [fetchProducts, page, limit, tableSearch, tableColumnFilters]
  );
  const handlePreviousCursor = useCallback(
    (cursor) => fetchProducts(page, limit, tableSearch, tableColumnFilters, cursor),
    [fetchProducts, page, limit, tableSearch, tableColumnFilters]
  );

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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", bgcolor: "background.default", color: "text.primary" }}>
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
      <PageHeader
        title={
          <Breadcrumbs
            items={[
              { label: "Master", onClick: () => navigate("/masters") },
              { label: "Products" },
            ]}
          />
        }
        onBack={() => navigate(-1)}
        actions={
          <Stack direction="row" sx={{ alignItems: "center" }} spacing={1.5}>
            <Button
              variant="text"
              onClick={handleNew}
              className="topbar-action-btn topbar-action-new"
              startIcon={<PlusCircle size={12} />}
              size="small"
            >
              New
            </Button>
            <Typography variant="body2" component="span" sx={{ color: "text.disabled" }}>|</Typography>
            <UploadImportButton
              endpoint="/products/bulk"
              fieldConfig={PRODUCT_IMPORT_CONFIG}
              onDone={() => {
                if (page === 1) fetchProducts(1, limit, tableSearch);
                else setPage(1);
              }}
            />
            <Typography variant="body2" component="span" sx={{ color: "text.disabled" }}>|</Typography>
            <ExportBottomSheet
              columns={PRODUCT_COLUMNS}
              rows={products}
              selectedRowKeys={selectedRows}
              rowKey="rowKey"
              onExportRows={handleExportRows}
              fileName="products"
              buttonClassName="topbar-action-btn topbar-action-export"
            />
          </Stack>
        }
      />

      <Box sx={{ p: 1.5, flex: 1, minHeight: 0 }}>
        <Card
          variant="outlined"
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            p: 1.5,
            pb: 0.5,
          }}
        >
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1, fontSize: "1rem" }}>
            Product Search
          </Typography>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 1.5, flex: 1, minHeight: 0 }}>
            {showBulkEditPanel && (
              <Box sx={{ width: { xs: "100%", lg: "448px" }, flexShrink: 0, border: 1, borderColor: (theme) => alpha(theme.palette.primary.main, 0.3), bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.06), borderRadius: "5.25px", p: 1.5, overflowY: "auto", maxHeight: { xs: 420, lg: "100%" } }}>
                <Typography component="h3" sx={{ fontSize: 11, fontWeight: 600, color: "primary.main", mb: 1 }}>
                  Bulk Edit ({selectedRows.length} selected)
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { sm: "1fr 1fr" }, gap: 1, fontSize: 11 }}>
                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Brand</Typography>
                    <TextField
                      select
                      value={bulkEditForm.brandId}
                      onChange={(e) => handleBulkFieldChange("brandId", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Brand</MenuItem>
                      {bulkBrandOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Purchase Tax</Typography>
                    <TextField
                      select
                      value={bulkEditForm.purchaseTaxId}
                      onChange={(e) => handleBulkFieldChange("purchaseTaxId", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Purchase Tax</MenuItem>
                      {bulkTaxOptions.map((opt) => (
                        <MenuItem key={`p-${opt.value}`} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Sales Tax</Typography>
                    <TextField
                      select
                      value={bulkEditForm.salesTaxId}
                      onChange={(e) => handleBulkFieldChange("salesTaxId", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Sales Tax</MenuItem>
                      {bulkTaxOptions.map((opt) => (
                        <MenuItem key={`s-${opt.value}`} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Selling Mode</Typography>
                    <TextField
                      select
                      value={bulkEditForm.sellingMode}
                      onChange={(e) => handleBulkFieldChange("sellingMode", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Selling Mode</MenuItem>
                      {SELLING_MODE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Barcode Mode</Typography>
                    <TextField
                      select
                      value={bulkEditForm.barcodeMode}
                      onChange={(e) => handleBulkFieldChange("barcodeMode", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Barcode Mode</MenuItem>
                      {BARCODE_MODE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Barcode Source</Typography>
                    <TextField
                      select
                      value={bulkEditForm.barcodeSource}
                      onChange={(e) => handleBulkFieldChange("barcodeSource", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Barcode Source</MenuItem>
                      {BARCODE_SOURCE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Discount Mode</Typography>
                    <TextField
                      select
                      value={bulkEditForm.discountMode}
                      onChange={(e) => handleBulkFieldChange("discountMode", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Discount Mode</MenuItem>
                      {DISCOUNT_MODE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Purchase Plan Mode</Typography>
                    <TextField
                      select
                      value={bulkEditForm.purchasePlanMode}
                      onChange={(e) => handleBulkFieldChange("purchasePlanMode", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Purchase Plan Mode</MenuItem>
                      {PURCHASE_PLAN_MODE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Expected Gender</Typography>
                    <TextField
                      select
                      value={bulkEditForm.expectedGender}
                      onChange={(e) => handleBulkFieldChange("expectedGender", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Expected Gender</MenuItem>
                      {EXPECTED_GENDER_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Size Group</Typography>
                    <TextField
                      select
                      value={bulkEditForm.sizeGroupId}
                      onChange={(e) => handleBulkFieldChange("sizeGroupId", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Size Group</MenuItem>
                      {bulkSizeGroupOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Type</Typography>
                    <TextField
                      select
                      value={bulkEditForm.type}
                      onChange={(e) => handleBulkFieldChange("type", e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    >
                      <MenuItem value="">Select Type</MenuItem>
                      {TYPE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change Section</Typography>
                    <TextField
                      type="text"
                      value={bulkEditForm.section}
                      onChange={(e) => handleBulkFieldChange("section", e.target.value)}
                      placeholder="Section"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    />
                  </Box>

                  <Box>
                    <Typography component="label" sx={{ display: "block", color: "text.secondary", mb: 0.25 }}>Change HSN</Typography>
                    <TextField
                      type="text"
                      value={bulkEditForm.hsn}
                      onChange={(e) => handleBulkFieldChange("hsn", e.target.value)}
                      placeholder="HSN"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                    />
                  </Box>
                </Box>

                <Stack direction="row" sx={{ mt: 1.5, alignItems: "center", gap: 1 }}>
                  <Button
                    type="button"
                    onClick={handleBulkUpdate}
                    disabled={bulkUpdating}
                    className="glass-btn glass-btn-primary"
                  >
                    {bulkUpdating ? "Updating..." : "Update Selected"}
                  </Button>
                  <Button
                    type="button"
                    onClick={resetBulkEditForm}
                    disabled={bulkUpdating}
                    variant="outlined"
                    sx={{ fontSize: 11, color: "text.secondary", borderColor: "grey.300" }}
                  >
                    Reset
                  </Button>
                </Stack>
              </Box>
            )}

            <Box sx={{ flex: showBulkEditPanel ? { lg: "0 0 62%" } : 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
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
                pagination={rawPagination}
                onPageChange={setPage}
                onNextCursor={handleNextCursor}
                onPreviousCursor={handlePreviousCursor}
                cursorLoadMode="append"
                onFetchGroupSummaries={fetchProductGroupSummaries}
                onFetchGroupRows={fetchProductGroupRows}
                onLimitChange={(value) => {
                  setLimit(value);
                  setPage(1);
                }}
                paginationMode="server"
                enableVirtualization
                enableSelection
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
                onBulkDelete={handleBulkDelete}
                rowKey={(row) => row.rowKey}
                onRowClick={handleEdit}
                fillHeight
                renderActions={(product, { selectedCount } = {}) => (
                  <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
                    <IconButton
                      type="button"
                      onClick={() => handleEdit(product)}
                      title="Edit"
                      disabled={selectedCount > 1}
                      className="glass-btn glass-btn-primary"
                      sx={{ borderRadius: "3.5px", p: 0.75 }}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      type="button"
                      onClick={() =>
                        setConfirm({ open: true, code: product.code, name: product.name, company_id: product.company_id })
                      }
                      className="glass-btn glass-btn-danger"
                      sx={{ borderRadius: "3.5px", p: 0.75 }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Stack>
                )}
              />
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default Product;
