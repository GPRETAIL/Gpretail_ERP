import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Pencil, PlusCircle, Save, Search, Trash2, Upload } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import UploadImportButton from "../../components/UploadImportButton";
import ConfirmDialog from "../../components/ConfirmDialog";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";
import useStoreNameMap from "../../hooks/useStoreNameMap";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_PROXY_TARGET ||
  "http://localhost:8080";

const ITEM_IMPORT_CONFIG = {
  aliases: {
    itemcode: "item_code", code: "item_code",
    sellingname: "selling_name", name: "selling_name",
    printingname: "printing_name",
    product: "product_id", productname: "product_id",
    brand: "brand_id", brandname: "brand_id",
    type: "type_id", style: "style_id", size: "size_id",
    color: "color_id", colour: "color_id",
    pattern: "pattern_id", material: "material_id", fit: "fit_id", sleeve: "sleeve_id",
    reordermin: "reorder_min", reordermax: "reorder_max",
    autopomin: "auto_po_min", autopomax: "auto_po_max",
    stockage: "stock_age", podays: "po_days",
    itemlevelpricing: "item_level_pricing",
    disablepo: "disable_po",
    purrate: "pur_rate", purchaserate: "pur_rate",
    dealerprice: "dealer_price",
    salerate: "sale_rate",
    mrp: "mrp",
    billrate: "bill_rate",
    minrate: "min_rate",
    showinlist: "show_in_list",
    touchpos: "touch_pos",
    glnuangs1: "gln_uan_gs1",
    glnuangs1value: "gln_uan_gs1_value",
    expiryvalue: "expiry_value",
    discountscheme: "discount_scheme",
    discountschemevalue: "discount_scheme_value",
    active: "active", isactive: "active",
  },
  required: ["selling_name"],
  boolFields: [
    "active", "item_level_pricing", "disable_po", "show_in_list",
    "touch_pos", "gln_uan_gs1", "expiry", "discount_scheme",
  ],
  sampleFileName: "item_sample.xlsx",
  sampleHeaders: [
    "item_code", "selling_name", "printing_name", "product", "brand",
    "type", "style", "size", "color", "pattern", "material", "fit", "sleeve",
    "reorder_min", "reorder_max", "auto_po_min", "auto_po_max",
    "stock_age", "po_days", "item_level_pricing", "disable_po",
    "pur_rate", "dealer_price", "sale_rate", "mrp", "bill_rate", "min_rate",
    "show_in_list", "touch_pos", "gln_uan_gs1", "gln_uan_gs1_value",
    "expiry", "expiry_value", "discount_scheme", "discount_scheme_value", "active",
  ],
};

const normalizeItemRow = (item = {}) => ({
  ...item,
  id: item.id,
  product_id: item.product_id ?? item.productId ?? "",
  item_code: item.item_code ?? item.itemCode ?? "",
  design: item.design ?? "",
  selling_name: item.selling_name ?? item.sellingName ?? "",
  printing_name: item.printing_name ?? item.printingName ?? "",
  brand_id: item.brand_id ?? item.brandId ?? "",
  type_id: item.type_id ?? item.typeId ?? "",
  style_id: item.style_id ?? item.styleId ?? "",
  size_id: item.size_id ?? item.sizeId ?? "",
  color_id: item.color_id ?? item.colorId ?? "",
  pattern_id: item.pattern_id ?? item.patternId ?? "",
  material_id: item.material_id ?? item.materialId ?? "",
  fit_id: item.fit_id ?? item.fitId ?? "",
  sleeve_id: item.sleeve_id ?? item.sleeveId ?? "",
  reorder_min: item.reorder_min ?? item.reorderMin ?? "",
  reorder_max: item.reorder_max ?? item.reorderMax ?? "",
  auto_po_min: item.auto_po_min ?? item.autoPoMin ?? "",
  auto_po_max: item.auto_po_max ?? item.autoPoMax ?? "",
  stock_age: item.stock_age ?? item.stockAge ?? "",
  po_days: item.po_days ?? item.poDays ?? "",
  item_level_pricing: item.item_level_pricing ?? item.itemLevelPricing ?? false,
  disable_po: item.disable_po ?? item.disablePo ?? false,
  pur_rate: item.pur_rate ?? item.purRate ?? "",
  dealer_price: item.dealer_price ?? item.dealerPrice ?? "",
  sale_rate: item.sale_rate ?? item.saleRate ?? "",
  mrp: item.mrp ?? "",
  bill_rate: item.bill_rate ?? item.billRate ?? "",
  min_rate: item.min_rate ?? item.minRate ?? "",
  show_in_list: item.show_in_list ?? item.showInList ?? false,
  touch_pos: item.touch_pos ?? item.touchPos ?? false,
  gln_uan_gs1: item.gln_uan_gs1 ?? item.glnUanGs1 ?? false,
  gln_uan_gs1_value: item.gln_uan_gs1_value ?? item.glnUanGs1Value ?? "",
  expiry: item.expiry ?? false,
  expiry_value: item.expiry_value ?? item.expiryValue ?? "",
  discount_scheme: item.discount_scheme ?? item.discountScheme ?? false,
  discount_scheme_value: item.discount_scheme_value ?? item.discountSchemeValue ?? "",
  active: item.active ?? false,
  image: item.image ?? null,
});

// ─── Reusable field components ────────────────────────────────────────────────
const Label = ({ text, required }) => (
  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
    {required && <span className="text-red-500 mr-1">*</span>}
    {text}
  </span>
);

const Row = ({ label, required, children }) => (
  <div className="flex items-center min-h-[28px]">
    <div className="w-36 shrink-0">
      <Label text={label} required={required} />
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

const TInput = ({ value, onChange, disabled, placeholder = "", type = "text" }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    disabled={disabled}
    placeholder={placeholder}
    className={`w-full border dark:border-gray-600 rounded-sm px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
      disabled
        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
        : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
    }`}
  />
);

const TSelect = ({ value, onChange, options, disabled }) => (
  <select
    value={value}
    onChange={onChange}
    disabled={disabled}
    className={`w-full border dark:border-gray-600 rounded-sm px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
      disabled
        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
        : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
    }`}
  >
    <option value="">-- Select --</option>
    {options.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

const TCheckbox = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 accent-blue-600"
    />
    {label}
  </label>
);

// ─── Inline checkbox row (checkbox + optional text input on the same row) ─────
const ToggleRow = ({ label, checked, onCheck, value, onValue, placeholder = "" }) => (
  <div className="flex items-center gap-3">
    <TCheckbox label={label} checked={checked} onChange={onCheck} />
    {checked && (
      <input
        type="text"
        value={value}
        onChange={onValue}
        placeholder={placeholder}
        className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500"
      />
    )}
  </div>
);

// ─── Pair row (label | input | label | input) in the right panel ──────────────
const PairRow = ({ label1, val1, onChange1, label2, val2, onChange2, disabled }) => (
  <div className="grid grid-cols-2 gap-2">
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap w-24 shrink-0">{label1}</span>
      <TInput value={val1} onChange={onChange1} disabled={disabled} />
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap w-28 shrink-0">{label2}</span>
      <TInput value={val2} onChange={onChange2} disabled={disabled} />
    </div>
  </div>
);

// ─── Initial form state ────────────────────────────────────────────────────────
const INIT = {
  product_id: "", item_code: "", design: "",
  selling_name: "", printing_name: "",
  brand_id: "", type_id: "", style_id: "", size_id: "",
  color_id: "", pattern_id: "", material_id: "", fit_id: "", sleeve_id: "",
  reorder_min: "", reorder_max: "",
  auto_po_min: "", auto_po_max: "",
  stock_age: "", po_days: "",
  item_level_pricing: false, disable_po: false,
  pur_rate: "", dealer_price: "", sale_rate: "", mrp: "", bill_rate: "", min_rate: "",
  show_in_list: true, touch_pos: false,
  gln_uan_gs1: false, gln_uan_gs1_value: "",
  expiry: true, expiry_value: "",
  discount_scheme: true, discount_scheme_value: "",
  active: true,
};

// Full editable-state signature (all form fields + a proxy for a newly picked
// image file) so an unchanged edit save reports "No changes detected".
const buildItemSig = (form, imageFile) =>
  JSON.stringify({
    form,
    image: imageFile ? `${imageFile.name}:${imageFile.size}` : null,
  });

// ─── Main component ────────────────────────────────────────────────────────────
export default function Item() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ ...INIT });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard
  const [editingId, setEditingId] = useState(null);
  const initialFormRef = useRef({ id: null, sig: null });
  const storeMap = useStoreNameMap();

  // Dropdown data
  const [products, setProducts]   = useState([]);
  const [brands, setBrands]       = useState([]);
  const [sizes, setSizes]         = useState([]);
  const [types, setTypes]         = useState([]);
  const [styles, setStyles]       = useState([]);
  const [colours, setColours]     = useState([]);
  const [patterns, setPatterns]   = useState([]);
  const [materials, setMaterials] = useState([]);
  const [fits, setFits]           = useState([]);
  const [sleeves, setSleeves]     = useState([]);

  // Search UI
  const [showSearch, setShowSearch]           = useState(true);
  const [searchResults, setSearchResults]     = useState([]);
  const [searchLoading, setSearchLoading]     = useState(true);
  const [selectedRows, setSelectedRows]       = useState([]);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [forceFetchAll, setForceFetchAll] = useState(false);

  // ─── Load all dropdown data on mount ─────────────────────────────────────
  useEffect(() => {
    const load = (url, setter, transform) =>
      api.get(url).then((r) => setter((r.data?.data || []).map(transform))).catch(() => {});

    load("/products?limit=500", setProducts, (p) => ({ value: String(p.id), label: p.name }));
    load("/brands?limit=500", setBrands,  (b) => ({ value: String(b.id), label: b.name }));
    load("/sizes",             setSizes,   (s) => ({ value: String(s.id), label: s.size_name }));
    load("/attributes/type",     setTypes,    (a) => ({ value: String(a.id), label: a.name }));
    load("/attributes/style",    setStyles,   (a) => ({ value: String(a.id), label: a.name }));
    load("/attributes/colour",   setColours,  (a) => ({ value: String(a.id), label: a.name }));
    load("/attributes/pattern",  setPatterns, (a) => ({ value: String(a.id), label: a.name }));
    load("/attributes/material", setMaterials,(a) => ({ value: String(a.id), label: a.name }));
    load("/attributes/fit",      setFits,     (a) => ({ value: String(a.id), label: a.name }));
    load("/attributes/sleeve",   setSleeves,  (a) => ({ value: String(a.id), label: a.name }));
  }, []);

  // ─── Field helpers ────────────────────────────────────────────────────────
  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));
  const setCheck = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.checked }));

  // ─── Image selection ──────────────────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // ─── Reset form ───────────────────────────────────────────────────────────
  const handleNew = () => {
    setForm({ ...INIT });
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
    setShowSearch(false);
  };

  // ─── Load item into form for editing ──────────────────────────────────────
  const handleEdit = (item) => {
    const loadedForm = {
      product_id:            item.product_id  || "",
      item_code:             item.item_code   || "",
      design:                item.design      || "",
      selling_name:          item.selling_name,
      printing_name:         item.printing_name,
      brand_id:              item.brand_id    || "",
      type_id:               item.type_id     || "",
      style_id:              item.style_id    || "",
      size_id:               item.size_id     || "",
      color_id:              item.color_id    || "",
      pattern_id:            item.pattern_id  || "",
      material_id:           item.material_id || "",
      fit_id:                item.fit_id      || "",
      sleeve_id:             item.sleeve_id   || "",
      reorder_min:           item.reorder_min ?? "",
      reorder_max:           item.reorder_max ?? "",
      auto_po_min:           item.auto_po_min ?? "",
      auto_po_max:           item.auto_po_max ?? "",
      stock_age:             item.stock_age   ?? "",
      po_days:               item.po_days     ?? "",
      item_level_pricing:    item.item_level_pricing,
      disable_po:            item.disable_po,
      pur_rate:              item.pur_rate     ?? "",
      dealer_price:          item.dealer_price ?? "",
      sale_rate:             item.sale_rate    ?? "",
      mrp:                   item.mrp          ?? "",
      bill_rate:             item.bill_rate    ?? "",
      min_rate:              item.min_rate     ?? "",
      show_in_list:          item.show_in_list,
      touch_pos:             item.touch_pos,
      gln_uan_gs1:           item.gln_uan_gs1,
      gln_uan_gs1_value:     item.gln_uan_gs1_value    || "",
      expiry:                item.expiry,
      expiry_value:          item.expiry_value          || "",
      discount_scheme:       item.discount_scheme,
      discount_scheme_value: item.discount_scheme_value || "",
      active:                item.active,
    };
    setForm(loadedForm);
    if (item.image) setImagePreview(`${API_BASE_URL}${item.image}`);
    setImageFile(null);
    setEditingId(item.id);
    // Baseline snapshot (image starts unchanged on edit).
    initialFormRef.current = { id: item.id, sig: buildItemSig(loadedForm, null) };
    setShowSearch(false);
  };

  // ─── Fetch items for search ────────────────────────────────────────────────
  const fetchItems = useCallback(async (queryOverride = tableSearch) => {
    try {
      setSearchLoading(true);
      const query = String(queryOverride || "").trim();
      const params = (query || forceFetchAll)
        ? { page: 1, limit: 100000, search: query || undefined, field: tableSearchField !== "all" ? tableSearchField : undefined }
        : { page, limit };
      const res = await api.get("/items", { params });
      const rows = (res.data?.data || []).map(normalizeItemRow);
      setSearchResults(rows);
      if (query || forceFetchAll || !res.data?.pagination) {
        setPagination({ total: rows.length, totalPages: 1 });
      } else {
        const total = Number(res.data?.pagination?.total ?? res.data?.total ?? rows.length) || 0;
        const totalPages = Math.max(
          Number(
            res.data?.pagination?.totalPages ??
            res.data?.totalPages ??
            Math.ceil(total / Math.max(limit, 1))
          ) || 1,
          1
        );
        setPagination({ total, totalPages });
      }
    } catch {
      toast.error("Failed to load items");
    } finally {
      setSearchLoading(false);
    }
  }, [page, limit, tableSearch, forceFetchAll]);

  useEffect(() => {
    if (showSearch) fetchItems();
  }, [showSearch, page, limit, tableSearch, forceFetchAll, fetchItems]);

  const handleServerSearch = useCallback(({ query, field, fetchAll }) => {
    setTableSearch(query);
    setTableSearchField(field || "all");
    setForceFetchAll(!!fetchAll);
    setPage(1);
  }, []);

  const itemTableColumns = [
    { key: "item_code", label: "Code" },
    { key: "selling_name", label: "Selling Name" },
    { key: "printing_name", label: "Printing Name" },
    {
      key: "product",
      label: "Product",
      render: (_, row) => row.product?.name || "—",
      searchValue: (row) => row.product?.name || "",
    },
    {
      key: "brand",
      label: "Brand",
      render: (_, row) => row.brand?.name || "—",
      searchValue: (row) => row.brand?.name || "",
    },
    {
      key: "size",
      label: "Size",
      render: (_, row) => row.size?.size_name || "—",
      searchValue: (row) => row.size?.size_name || "",
    },
    {
      key: "pur_rate",
      label: "Purchase Rate",
    },
    {
      key: "sale_rate",
      label: "Sale Rate",
    },
    {
      key: "mrp",
      label: "MRP",
    },
    {
      key: "active",
      label: "Active",
      render: (value) => (value ? "Yes" : "No"),
      searchValue: (row) => (row.active ? "yes" : "no"),
    },
    {
      key: "created_by",
      label: "Created By",
      render: (value) => value || "—",
      searchValue: (row) => row.created_by || "",
    },
    {
      key: "company_id",
      label: "Store/Warehouse",
      render: (value) => storeMap[String(value)] ?? "—",
      searchValue: (row) => storeMap[String(row.company_id)] ?? "",
    },
  ];

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDeleteConfirmed = async () => {
    const { id } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(`/items/${id}`);
      toast.success("Item deleted");
      setSearchResults((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete item");
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/items/${id}`)));
      toast.success(`${keys.length} record(s) deleted`);
      setSelectedRows([]);
      fetchItems();
    } catch {
      toast.error("Failed to delete some records");
    }
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.selling_name.trim()) { toast.error("Selling Name is required"); return; }
    if (!form.printing_name.trim()) { toast.error("Printing Name is required"); return; }
    if (!form.brand_id) { toast.error("Brand Name is required"); return; }

    if (editingId && initialFormRef.current.id === editingId
        && buildItemSig(form, imageFile) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }

    try {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      const fd = new FormData();
      // Append all text/boolean fields
      Object.entries(form).forEach(([k, v]) => {
        if (v !== "" && v !== undefined) fd.append(k, v);
      });
      if (imageFile) fd.append("image", imageFile);

      if (editingId) {
        await api.put(`/items/${editingId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Item updated successfully");
      } else {
        await api.post("/items", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Item saved successfully");
      }
      handleNew();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // ─── Search page ─────────────────────────────────────────────────────────
  if (showSearch) {
    return (
      <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
        <ConfirmDialog
          open={confirm.open}
          message={`Are you sure you want to delete "${confirm.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirm({ open: false, id: null, name: "" })}
        />
        <ConfirmDialog
          open={bulkConfirm.open}
          message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
          onConfirm={handleBulkDeleteConfirmed}
          onCancel={() => setBulkConfirm({ open: false, keys: [] })}
        />
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/masters")} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
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
              <span>Item</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-gray-700 dark:text-gray-300">
            <button onClick={handleNew} className="topbar-action-btn topbar-action-new">
              <PlusCircle className="w-4 h-4 mr-1" /> New
            </button>
            <span>|</span>
            <UploadImportButton endpoint="/items/bulk" fieldConfig={ITEM_IMPORT_CONFIG} onDone={fetchItems} />
            <span>|</span>
            <ExportBottomSheet
              columns={itemTableColumns}
              rows={searchResults}
              selectedRowKeys={selectedRows}
              onExportRows={async () => {
                const res = await api.get("/items", { params: { page: 1, limit: 100000 } });
                return (res.data?.data || []).map(normalizeItemRow);
              }}
              fileName="items"
              buttonClassName="topbar-action-btn topbar-action-export"
            />
          </div>
        </div>

        <div className="p-4 flex-1 min-h-0">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col min-h-0 px-3 pt-3 pb-0.5">
            <h2 className="text-base font-bold mb-1.5">Item Search</h2>
            <FilterableDataTable
              rows={searchResults}
              columns={itemTableColumns}
              loading={searchLoading}
              searchPlaceholder="Search in item fields..."
              searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
              showExport={false}
              tablePreferenceKey="masters.items.list"
              enableColumnResize
              onRefresh={fetchItems}
              refreshDisabled={searchLoading}
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
              onRowClick={handleEdit}
              enableSelection
              enableKeyboardNav
              selectedRows={selectedRows}
              onSelectionChange={setSelectedRows}
              onBulkDelete={handleBulkDelete}
              fillHeight
              renderActions={(row, { selectedCount } = {}) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(row)}
                    title="Edit"
                    disabled={selectedCount > 1}
                    className="glass-btn glass-btn-primary rounded p-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ open: true, id: row.id, name: row.selling_name })}
                    title="Delete"
                    className="glass-btn glass-btn-danger rounded p-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── Entry form ───────────────────────────────────────────────────────────
  const ilp = form.item_level_pricing; // shorthand

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      {/* ── Header ── */}
      <div className="flex justify-between items-center px-4 py-1.5 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch(true)} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
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
            <span>Item</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button onClick={handleNew} className="topbar-action-btn topbar-action-new">
            <PlusCircle className="w-4 h-4 mr-1" /> New
          </button>
          <span>|</span>
          <UploadImportButton endpoint="/items/bulk" fieldConfig={ITEM_IMPORT_CONFIG} onDone={fetchItems} />
          <span>|</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save"}
          </button>
          <span>|</span>
          <button onClick={() => setShowSearch(true)} className="glass-btn glass-btn-primary flex items-center">
            <Search className="w-4 h-4 mr-1" /> Search
          </button>
        </div>
      </div>

      {/* ── Body: two-column grid ── */}
      <div
        className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0"
        data-enter-scope="true"
        onKeyDownCapture={handleEnterKeyNavigation}
      >

        {/* ════ LEFT PANEL ════ */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-sm p-3 flex flex-col gap-2 lg:h-full">
          {/* Product */}
          <Row label="Product" required>
            <TSelect value={form.product_id} onChange={set("product_id")} options={products} />
          </Row>

          {/* Item Code + Design on same row */}
          <div className="flex items-center min-h-[28px]">
            <div className="w-36 shrink-0">
              <Label text="Item Code" />
            </div>
            <div className="flex gap-2 flex-1">
              <TInput value={form.item_code} onChange={set("item_code")} placeholder="Auto" />
              <span className="flex items-center text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Design</span>
              <TInput value={form.design} onChange={set("design")} />
            </div>
          </div>

          <Row label="Selling Name" required>
            <TInput value={form.selling_name} onChange={set("selling_name")} />
          </Row>
          <Row label="Printing Name" required>
            <TInput value={form.printing_name} onChange={set("printing_name")} />
          </Row>
          <Row label="Brand Name" required>
            <TSelect value={form.brand_id} onChange={set("brand_id")} options={brands} />
          </Row>
          <Row label="Type">
            <TSelect value={form.type_id} onChange={set("type_id")} options={types} />
          </Row>
          <Row label="Style">
            <TSelect value={form.style_id} onChange={set("style_id")} options={styles} />
          </Row>
          <Row label="Size">
            <TSelect value={form.size_id} onChange={set("size_id")} options={sizes} />
          </Row>
          <Row label="Color">
            <TSelect value={form.color_id} onChange={set("color_id")} options={colours} />
          </Row>
          <Row label="Pattern">
            <TSelect value={form.pattern_id} onChange={set("pattern_id")} options={patterns} />
          </Row>
          <Row label="Material">
            <TSelect value={form.material_id} onChange={set("material_id")} options={materials} />
          </Row>
          <Row label="Fit">
            <TSelect value={form.fit_id} onChange={set("fit_id")} options={fits} />
          </Row>
          <Row label="Sleeve">
            <TSelect value={form.sleeve_id} onChange={set("sleeve_id")} options={sleeves} />
          </Row>
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-sm p-3 flex flex-col gap-2.5 lg:h-full">

          {/* Re-Order */}
          <PairRow
            label1="Re-Order Min" val1={form.reorder_min} onChange1={set("reorder_min")}
            label2="Max"          val2={form.reorder_max} onChange2={set("reorder_max")}
          />
          {/* Auto PO */}
          <PairRow
            label1="Auto PO Min" val1={form.auto_po_min} onChange1={set("auto_po_min")}
            label2="Max"         val2={form.auto_po_max} onChange2={set("auto_po_max")}
          />
          {/* Stock + PO days */}
          <PairRow
            label1="Stock(Age)" val1={form.stock_age} onChange1={set("stock_age")}
            label2="PO(Days)"   val2={form.po_days}   onChange2={set("po_days")}
          />

          {/* Flags row */}
          <div className="grid grid-cols-2 gap-2">
            <TCheckbox label="Item level pricing" checked={form.item_level_pricing} onChange={setCheck("item_level_pricing")} />
            <TCheckbox label="Disable PO"         checked={form.disable_po}         onChange={setCheck("disable_po")} />
          </div>

          {/* Pricing (greyed when item_level_pricing false) */}
          <PairRow
            label1="Pur.Rate"     val1={form.pur_rate}     onChange1={set("pur_rate")}
            label2="Dealer Price" val2={form.dealer_price} onChange2={set("dealer_price")}
            disabled={!ilp}
          />
          <PairRow
            label1="Sale Rate" val1={form.sale_rate} onChange1={set("sale_rate")}
            label2="MRP"       val2={form.mrp}       onChange2={set("mrp")}
            disabled={!ilp}
          />
          <PairRow
            label1="Bill Rate" val1={form.bill_rate} onChange1={set("bill_rate")}
            label2="Min.Rate"  val2={form.min_rate}  onChange2={set("min_rate")}
            disabled={!ilp}
          />

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Show / Touch POS */}
          <div className="grid grid-cols-2 gap-2">
            <TCheckbox label="Show in List" checked={form.show_in_list} onChange={setCheck("show_in_list")} />
            <TCheckbox label="Touch POS"   checked={form.touch_pos}    onChange={setCheck("touch_pos")} />
          </div>

          {/* Toggle rows */}
          <ToggleRow
            label="GLN/UAN/GS1"
            checked={form.gln_uan_gs1}
            onCheck={setCheck("gln_uan_gs1")}
            value={form.gln_uan_gs1_value}
            onValue={set("gln_uan_gs1_value")}
            placeholder="Enter GLN / UAN / GS1"
          />
          <ToggleRow
            label="Expiry"
            checked={form.expiry}
            onCheck={setCheck("expiry")}
            value={form.expiry_value}
            onValue={set("expiry_value")}
            placeholder="Expiry details"
          />
          <ToggleRow
            label="Discount Scheme"
            checked={form.discount_scheme}
            onCheck={setCheck("discount_scheme")}
            value={form.discount_scheme_value}
            onValue={set("discount_scheme_value")}
            placeholder="Scheme name / code"
          />

          <TCheckbox label="Active" checked={form.active} onChange={setCheck("active")} />

          {/* Image upload */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12">Image</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="glass-btn glass-btn-success flex items-center gap-1"
            >
              <Upload className="w-3 h-3" /> Upload
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            {imagePreview && (
              <img src={imagePreview} alt="preview" className="h-12 w-12 object-cover rounded border border-gray-300 dark:border-gray-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
