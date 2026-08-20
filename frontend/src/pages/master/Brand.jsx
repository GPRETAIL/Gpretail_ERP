import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, PlusCircle, Save, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";
import useStoreNameMap from "../../hooks/useStoreNameMap";

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

const BRAND_IMPORT_CONFIG = {
  aliases: {
    code: "code", name: "name",
    printingname: "printing_name",
    minmargin: "min_margin",
    maxmargin: "max_margin",
    brandtype: "brand_type",
    discounttype: "discount_type",
    discountvalue: "discount_value",
    productid: "product_ids",
    productids: "product_ids",
    productmargin: "product_margins",
    isactive: "is_active", active: "is_active",
  },
  required: ["name"],
  boolFields: ["is_active"],
  sampleFileName: "brand_sample.xlsx",
  sampleHeaders: [
    "code", "name", "printing_name", "min_margin", "max_margin",
    "brand_type", "discount_type", "discount_value", "is_active",
  ],
};

// ─── Helpers defined OUTSIDE component to prevent remount on render ───────────
const TextInput = ({ label, required = false, type = "text", value, onChange, placeholder = "" }) => (
  <div className="flex items-center">
    <label className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300">
      {required && <span className="text-red-500 mr-1">*</span>}
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ml-3"
    />
  </div>
);

const SelectInput = ({ label, required = false, options, value, onChange }) => (
  <div className="flex items-center">
    <label className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300">
      {required && <span className="text-red-500 mr-1">*</span>}
      {label}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ml-3"
    >
      <option value="">{`Select ${label}`}</option>
      {options.map((option, index) => (
        <option key={index} value={option.value || option.label}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeFormSignature } from "../../utils/formSignature";

const brandTypeOptions = [
  { label: "Premium", value: "Premium" },
  { label: "Standard", value: "Standard" },
];
const discountOptions = [
  { label: "Discount", value: "Discount" },
  { label: "Value", value: "Value" },
];

// Full editable-state signature (main fields + the product-margin sub-table)
// so an unchanged edit save reports "No changes detected".
const buildBrandSig = (v) =>
  normalizeFormSignature({
    code: v.code,
    name: v.name,
    printingName: v.printingName,
    minMargin: v.minMargin,
    maxMargin: v.maxMargin,
    brandType: v.brandType,
    discountType: v.discountType,
    discountValue: v.discountValue,
    isActive: v.isActive,
    storeId: v.storeId || "",
    productList: v.productList,
  });

const Brand = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [printingName, setPrintingName] = useState("");
  const [minMargin, setMinMargin] = useState("");
  const [maxMargin, setMaxMargin] = useState("");
  const [brandType, setBrandType] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  // Owning store — every brand belongs to one, but it is never picked here: a store user is
  // scoped server-side, and a super admin's active store rides along on every request from the
  // Navbar switcher. Only carried so an edit keeps the store the row is already filed under.
  const [storeId, setStoreId] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard
  const [currentId, setCurrentId] = useState(null);
  const storeMap = useStoreNameMap();
  const initialFormRef = useRef({ id: null, sig: null });

  // Product Margin list
  const [product, setProduct] = useState("");
  const [margin, setMargin] = useState("");
  const [productList, setProductList] = useState([]);

  // Products dropdown (from API)
  const [products, setProducts] = useState([]);

  // Search page
  const [showSearchPage, setShowSearchPage] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [tableColumnFilters, setTableColumnFilters] = useState({});
  const [forceFetchAll, setForceFetchAll] = useState(false);

  // Load products for dropdown on mount
  useEffect(() => {
    api
      .get("/products", { params: { limit: 200 } })
      .then((res) => {
        const rows = (res.data?.data || []).map((p) => ({
          label: p.name,
          value: String(p.id),
        }));
        setProducts(rows);
      })
      .catch(() => {/* silent — products dropdown is optional */});
  }, []);

  // Load search results when search page opens or query changes
  useEffect(() => {
    if (!showSearchPage) return;
    fetchBrands();
  }, [showSearchPage, page, limit, tableSearch, tableSearchField, tableColumnFilters, forceFetchAll]);

  const fetchBrands = async (queryOverride = tableSearch, filtersOverride = tableColumnFilters) => {
    try {
      setSearchLoading(true);
      const query = String(queryOverride || "").trim();
      const activeColumnFilters = buildActiveColumnFilters(filtersOverride);
      const hasColumnFilters = activeColumnFilters.length > 0;
      const params = {
        page,
        limit,
        search: query || undefined,
        field: query && tableSearchField !== "all" ? tableSearchField : undefined,
        column_filters: hasColumnFilters ? JSON.stringify(activeColumnFilters) : undefined,
        ...(forceFetchAll ? { all: "true" } : {}),
      };
      const res = await api.get("/brands", { params });
      const rows = res.data?.data || [];
      setSearchResults(rows);

      const total = Number(res.data?.total ?? res.data?.pagination?.total ?? rows.length) || 0;
      const totalPages = Math.max(
        Number(
          res.data?.totalPages ??
          res.data?.pagination?.totalPages ??
          Math.ceil(total / Math.max(limit, 1))
        ) || 1,
        1
      );
      setPagination({ total, totalPages });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load brands");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleServerSearch = useCallback(({ query, field, fetchAll, columnFilters }) => {
    setTableSearch(query);
    setTableSearchField(field || "all");
    setTableColumnFilters(columnFilters || {});
    const hasColumnFilters = buildActiveColumnFilters(columnFilters || {}).length > 0;
    setForceFetchAll(!!fetchAll || hasColumnFilters);
    setPage(1);
  }, []);

  const loadBrandProducts = async (brandId) => {
    try {
      const res = await api.get("/products", { params: { limit: 500 } });
      const linked = (res.data?.data || [])
        .filter((p) => Number(p.brand_id) === Number(brandId))
        .map((p) => ({
          product: String(p.id),
          productLabel: p.name,
          margin: p.margin_min != null ? String(p.margin_min) : "",
        }));
      setProductList(linked);
      return linked;
    } catch {
      setProductList([]);
      toast.error("Failed to load linked products for this brand");
      return [];
    }
  };

  // Add product to the margin list
  const handleAddProduct = () => {
    if (!product || !margin)
      return alert("Please select a product and enter a margin!");
    if (productList.some((item) => item.product === product))
      return alert("Product already added!");
    const label = products.find((p) => p.value === product)?.label || product;
    setProductList([...productList, { product, productLabel: label, margin }]);
    setProduct("");
    setMargin("");
  };

  const handleRemoveProduct = (index) => {
    setProductList(productList.filter((_, i) => i !== index));
  };

  const handleSearchClick = () => setShowSearchPage(true);
  const handleBackClick = () => {
    if (showSearchPage) {
      navigate("/masters");
    } else {
      setShowSearchPage(true);
    }
  };

  const handleNew = () => {
    setCode(""); setName(""); setPrintingName(""); setMinMargin(""); setMaxMargin("");
    setBrandType(""); setDiscountType(""); setDiscountValue(""); setIsActive(true);
    setStoreId("");
    setProductList([]);
    setCurrentId(null);
    initialFormRef.current = { id: null, sig: null };
    setShowSearchPage(false);
  };

  const handleEditFromSearch = async (row) => {
    setCurrentId(row.id);
    const values = {
      code: row.code || "",
      name: row.name || "",
      printingName: row.printing_name || "",
      minMargin: row.min_margin != null ? String(row.min_margin) : "",
      maxMargin: row.max_margin != null ? String(row.max_margin) : "",
      brandType: row.brand_type || "",
      discountType: row.discount_type || "",
      discountValue: row.discount_value != null ? String(row.discount_value) : "",
      isActive: row.is_active !== false,
      storeId: row.company_id != null ? String(row.company_id) : "",
    };
    setCode(values.code);
    setName(values.name);
    setPrintingName(values.printingName);
    setMinMargin(values.minMargin);
    setMaxMargin(values.maxMargin);
    setBrandType(values.brandType);
    setDiscountType(values.discountType);
    setDiscountValue(values.discountValue);
    setIsActive(values.isActive);
    setStoreId(values.storeId);
    const linked = await loadBrandProducts(row.id);
    // Baseline captured after the product sub-table has loaded so a sub-table-only
    // edit is still detected as a change.
    initialFormRef.current = {
      id: row.id,
      sig: buildBrandSig({ ...values, productList: linked }),
    };
    setShowSearchPage(false);
  };

  const handleDeleteConfirmed = async () => {
    const { id } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(`/brands/${id}`);
      toast.success("Brand deleted successfully");
      setSearchResults((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete brand");
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/brands/${id}`)));
      toast.success(`${keys.length} record(s) deleted`);
      setSelectedRows([]);
      fetchBrands();
    } catch {
      toast.error("Failed to delete some records");
    }
  };

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error("Code and Name are required");
      return;
    }
    if (currentId && initialFormRef.current.id === currentId
        && buildBrandSig({
          code, name, printingName, minMargin, maxMargin,
          brandType, discountType, discountValue, isActive, storeId, productList,
        }) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }
    try {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      const payload = {
        code: code.trim(),
        name: name.trim(),
        printing_name: printingName.trim() || undefined,
        min_margin: minMargin !== "" ? minMargin : undefined,
        max_margin: maxMargin !== "" ? maxMargin : undefined,
        brand_type: brandType || undefined,
        discount_type: discountType || undefined,
        discount_value: discountValue !== "" ? discountValue : undefined,
        is_active: isActive,
        ...(storeId ? { company_id: Number(storeId) } : {}),
        product_ids: productList.map((item) => Number(item.product)),
        product_margins: productList.map((item) => ({
          product_id: Number(item.product),
          margin: item.margin !== "" ? Number(item.margin) : null,
        })),
      };
      if (currentId) {
        await api.put(`/brands/${currentId}`, payload);
        toast.success("Brand updated successfully");
      } else {
        await api.post("/brands", payload);
        toast.success("Brand saved successfully");
      }
      handleNew();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save brand");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const brandTableColumns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "printing_name", label: "Printing Name" },
    { key: "min_margin", label: "Min Margin" },
    { key: "max_margin", label: "Max Margin" },
    { key: "brand_type", label: "Brand Type" },
    { key: "discount_type", label: "Discount Type" },
    { key: "discount_value", label: "Discount Value" },
    {
      key: "is_active",
      label: "Active",
      render: (value) => (value ? "Yes" : "No"),
      searchValue: (row) => (row.is_active ? "yes" : "no"),
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
      {/* Header (No change needed) */}
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">

            <button
              onClick={handleBackClick}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              type="button"
              aria-label="Back to Entry Form"
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
            <span>Brand</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          <button className="topbar-action-btn topbar-action-new" onClick={handleNew}>
            <PlusCircle className="w-4 h-4 mr-1" /> New
          </button>
          <span>|</span>
          <UploadImportButton
            endpoint="/brands/bulk"
            fieldConfig={BRAND_IMPORT_CONFIG}
            onDone={() => {
              if (page === 1) fetchBrands();
              else setPage(1);
            }}
          />
          {showSearchPage && (
            <>
              <span>|</span>
              <ExportBottomSheet
                columns={brandTableColumns}
                rows={searchResults}
                selectedRowKeys={selectedRows}
                onExportRows={async () => {
                  const res = await api.get("/brands", { params: { all: "true" } });
                  return res.data?.data || [];
                }}
                fileName="brands"
                buttonClassName="topbar-action-btn topbar-action-export"
              />
            </>
          )}
          <span>|</span>
          {!showSearchPage && (
            <>
              <button
                className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
              </button>
              <span>|</span>
            </>
          )}
          <button
            className="glass-btn glass-btn-primary flex items-center"
            onClick={handleSearchClick}
          >
            <Search className="w-4 h-4 mr-1" /> Search
          </button>
        </div>
      </div>
      {/* --- END Header --- */}

      {/* Content */}
      <div className="p-4 flex-1 min-h-0">
        {!showSearchPage ? (
          <div
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-4 lg:h-full"
            data-enter-scope="true"
            onKeyDownCapture={handleEnterKeyNavigation}
          >
            <div className="grid grid-cols-12 gap-6">
              {/* Left Section - Primary Details */}
              <div className="col-span-12 lg:col-span-6 space-y-4 pr-4">
                {/* All fields now use the horizontal TextInput/SelectInput components */}
                <TextInput
                  label="Code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />

                <TextInput
                  label="Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <TextInput
                  label="Printing Name"
                  required
                  value={printingName}
                  onChange={(e) => setPrintingName(e.target.value)}
                />

                {/* Margin Min/Max - Requires custom structure for dual input */}
                <div className="flex items-center">
                    <label className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300">Margin</label>
                    <div className="flex flex-1 items-center gap-3 ml-3">
                        <input
                            type="number"
                            value={minMargin}
                            onChange={(e) => setMinMargin(e.target.value)}
                            placeholder="Min Margin"
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                            type="number"
                            value={maxMargin}
                            onChange={(e) => setMaxMargin(e.target.value)}
                            placeholder="Max Margin"
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <SelectInput
                  label="Brand Type"
                  options={brandTypeOptions}
                  value={brandType}
                  onChange={(e) => setBrandType(e.target.value)}
                />

                {/* Discount / Discount Value - Requires custom structure for dual input */}
                <div className="flex items-center">
                    <label className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Discount / Value
                    </label>
                    <div className="flex flex-1 items-center gap-3 ml-3">
                        <select
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value)}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select</option>
                            {discountOptions.map((option, index) => (
                                <option key={index} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            placeholder="Value"
                            className="w-20 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Logo Section - Custom structure for horizontal label */}
                <div className="flex items-center">
                    <label className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Logo
                    </label>
                    <div className="flex flex-1 items-center gap-2 ml-3">
                        <label
                            htmlFor="logoUpload"
                            className="cursor-pointer px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-800 rounded-sm text-blue-600 dark:text-blue-400 text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                        >
                            📁 Choose Image
                        </label>
                        <input
                            id="logoUpload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    console.log("Selected file:", file.name);
                                }
                            }}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400 italic">No file selected</span>
                    </div>
                </div>

                {/* Active Checkbox - Custom structure for horizontal label */}
                <div className="flex items-center pt-2">
                    <label className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Active
                    </label>
                    <div className="flex-1 flex items-center ml-3">
                        <input
                            id="active"
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500"
                        />
                        <label
                            htmlFor="active"
                            className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                            // Label text moved next to the checkbox if desired, or left blank if the main label is enough.
                        ></label>
                    </div>
                </div>
              </div>

              {/* Right Section - Product Margin List (No layout change needed here) */}
              <div className="col-span-12 lg:col-span-6 border-l pl-4 border-gray-100 dark:border-gray-700">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3 border-b dark:border-gray-700 pb-2">
                  Product Margin - B2B
                </h2>
                <div className="border rounded-sm overflow-hidden border-gray-300 dark:border-gray-600">
                  {/* Header Row */}
                  <div className="flex bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 p-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <div className="w-1/2 px-1">Product</div>
                    <div className="w-1/3 px-1">Margin (%)</div>
                    <div className="w-1/6 px-1 text-right">Action</div>
                  </div>

                  {/* Input Row */}
                  <div className="flex items-center border-b dark:border-gray-700 p-2 space-x-2">
                    <select
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select Product</option>
                      {products.map((p, idx) => (
                        <option key={idx} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Margin"
                      value={margin}
                      onChange={(e) => setMargin(e.target.value)}
                      className="w-1/3 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <button
                      onClick={handleAddProduct}
                      className="glass-btn glass-btn-primary w-1/6 flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" /> Add
                    </button>
                  </div>

                  {/* Table Body */}
                  <div className="text-sm">
                    {productList.length === 0 ? (
                      <div className="text-gray-500 dark:text-gray-400 italic p-3 text-center">
                        No products added
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {productList.map((item, index) => (
                            <tr
                              key={index}
                              className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                            >
                              <td className="p-2 w-1/2">{item.productLabel || item.product}</td>
                              <td className="p-2 w-1/3">{item.margin}%</td>
                              <td className="p-2 w-1/6 text-right">
                                <button
                                  onClick={() => handleRemoveProduct(index)}
                                  className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Search Page
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col min-h-0 px-3 pt-3 pb-0.5">
            <h2 className="text-base font-bold mb-1.5">Search Brands</h2>
            <FilterableDataTable
              rows={searchResults}
              columns={brandTableColumns}
              loading={searchLoading}
              searchPlaceholder="Search in brand fields..."
              searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
              showExport={false}
              enableColumnResize
              tablePreferenceKey="masters.brands.list"
              onRefresh={() => fetchBrands()}
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
              onRowClick={handleEditFromSearch}
              paginationMode="server"
              enableSelection
              enableKeyboardNav
              selectedRows={selectedRows}
              onSelectionChange={setSelectedRows}
              onBulkDelete={handleBulkDelete}
              fillHeight
              compact
              renderActions={(row, { selectedCount } = {}) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditFromSearch(row)}
                    title="Edit"
                    disabled={selectedCount > 1}
                    className="glass-btn glass-btn-primary rounded p-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ open: true, id: row.id, name: row.name })}
                    title="Delete"
                    className="glass-btn glass-btn-danger rounded p-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default Brand;
