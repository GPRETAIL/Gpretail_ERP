import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, PlusCircle, Save, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Card, Typography, Button, TextField, MenuItem, Checkbox, Table, TableBody, TableRow, TableCell, IconButton, alpha } from "@mui/material";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import { createGroupFetchers } from "../../utils/serverGrouping";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";
import ConfirmDialog from "../../components/ConfirmDialog";
import PageHeader from "../../components/PageHeader";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";
import useStoreNameMap from "../../hooks/useStoreNameMap";
import { normalizeFormSignature } from "../../utils/formSignature";

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

// Matches config('pagination.resources.brands.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchBrandGroupSummaries, onFetchGroupRows: fetchBrandGroupRows } =
  createGroupFetchers("/brands", { is_active: "is_active" }, buildActiveColumnFilters);

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
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "33.33%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}
      {label}
    </Typography>
    <TextField
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      size="small"
      fullWidth
      sx={{ ml: 1.5, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
    />
  </Stack>
);

const SelectInput = ({ label, required = false, options, value, onChange }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "33.33%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}
      {label}
    </Typography>
    <TextField
      select
      value={value}
      onChange={onChange}
      size="small"
      fullWidth
      sx={{ ml: 1.5, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
    >
      <MenuItem value="">{`Select ${label}`}</MenuItem>
      {options.map((option, index) => (
        <MenuItem key={index} value={option.value || option.label}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  </Stack>
);

const brandTypeOptions = [
  { label: "Premium", value: "Premium" },
  { label: "Standard", value: "Standard" },
];
const discountOptions = [
  { label: "Discount", value: "Discount" },
  { label: "Value", value: "Value" },
];

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
  const [storeId, setStoreId] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [currentId, setCurrentId] = useState(null);
  const initialFormRef = useRef({ id: null, sig: null });

  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState("");
  const [margin, setMargin] = useState("");
  const [productList, setProductList] = useState([]);

  const [showSearchPage, setShowSearchPage] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [rawPagination, setRawPagination] = useState(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [forceFetchAll, setForceFetchAll] = useState(false);

  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const storeMap = useStoreNameMap();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get("/products", { params: { all: "true" } });
        setProducts(
          (res.data.data || []).map((p) => ({
            value: String(p.id),
            label: `${p.code ? `${p.code} - ` : ""}${p.name}`,
            name: p.name,
          }))
        );
      } catch (err) {
        console.error("Failed to load products for brand margin list", err);
      }
    };
    fetchProducts();
  }, []);

  const handleAddProduct = () => {
    if (!product || !margin) {
      toast.warn("Please select a product and enter margin");
      return;
    }
    const found = products.find((p) => p.value === product);
    const item = {
      product,
      productLabel: found?.label || product,
      margin: parseFloat(margin) || 0,
    };
    setProductList((prev) => [...prev, item]);
    setProduct("");
    setMargin("");
  };

  const handleRemoveProduct = (index) => {
    setProductList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNew = () => {
    setCode("");
    setName("");
    setPrintingName("");
    setMinMargin("");
    setMaxMargin("");
    setBrandType("");
    setDiscountType("");
    setDiscountValue("");
    setIsActive(true);
    setStoreId("");
    setProductList([]);
    setCurrentId(null);
    initialFormRef.current = { id: null, sig: null };
    setShowSearchPage(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.warn("Name is required"); return; }
    if (!printingName.trim()) { toast.warn("Printing Name is required"); return; }

    const currentState = {
      code, name, printingName, minMargin, maxMargin,
      brandType, discountType, discountValue, isActive, storeId,
      productList,
    };
    if (currentId && initialFormRef.current.id === currentId
        && buildBrandSig(currentState) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    const product_ids = productList.map((p) => Number(p.product));
    const product_margins = {};
    productList.forEach((p) => {
      product_margins[String(p.product)] = Number(p.margin);
    });

    const payload = {
      code: code.trim() || null,
      name: name.trim(),
      printing_name: printingName.trim(),
      min_margin: minMargin ? parseFloat(minMargin) : null,
      max_margin: maxMargin ? parseFloat(maxMargin) : null,
      brand_type: brandType || null,
      discount_type: discountType || null,
      discount_value: discountValue ? parseFloat(discountValue) : null,
      is_active: isActive,
      product_ids,
      product_margins,
      ...(storeId ? { company_id: Number(storeId) } : {}),
    };

    try {
      if (currentId) {
        await api.put(`/brands/${currentId}`, payload);
        initialFormRef.current = { id: currentId, sig: buildBrandSig(currentState) };
        toast.success("Brand updated successfully");
      } else {
        const res = await api.post("/brands", payload);
        const newId = res.data.data.id;
        setCurrentId(newId);
        initialFormRef.current = { id: newId, sig: buildBrandSig(currentState) };
        toast.success("Brand created successfully");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const fetchBrands = async (queryOverride = tableSearch, cursorToken = null) => {
    setSearchLoading(true);
    try {
      const query = String(queryOverride || "").trim();
      const params = (query || forceFetchAll)
        ? { all: "true", search: query || undefined, field: tableSearchField !== "all" ? tableSearchField : undefined }
        : { ...(cursorToken ? { cursor: cursorToken } : { page }), limit };
      const res = await api.get("/brands", { params });
      const rows = res.data?.data || [];
      setSearchResults(rows);
      if (query) {
        setPagination({ total: rows.length, totalPages: 1 });
        setRawPagination(null);
      } else {
        const p = res.data?.pagination || {};
        const total = Number(p.total ?? res.data?.total ?? rows.length) || 0;
        const totalPages = Math.max(
          Number(p.totalPages ?? res.data?.totalPages ?? Math.ceil(total / Math.max(limit, 1))) || 1,
          1
        );
        setPagination({ total, totalPages });
        setRawPagination(res.data?.pagination || null);
      }
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBrandsNextCursor = (cursor) => fetchBrands(tableSearch, cursor);
  const handleBrandsPreviousCursor = (cursor) => fetchBrands(tableSearch, cursor);

  const handleSearchClick = () => {
    setShowSearchPage(true);
    fetchBrands();
  };

  useEffect(() => {
    if (showSearchPage) fetchBrands();
  }, [showSearchPage, page, limit, tableSearch, forceFetchAll]);

  const handleServerSearch = useCallback(({ query, field, fetchAll }) => {
    setTableSearch(query);
    setTableSearchField(field || "all");
    setForceFetchAll(!!fetchAll);
    setPage(1);
  }, []);

  const handleEditFromSearch = (row) => {
    setCurrentId(row.id);
    setCode(row.code || "");
    setName(row.name || "");
    setPrintingName(row.printing_name || "");
    setMinMargin(row.min_margin != null ? String(row.min_margin) : "");
    setMaxMargin(row.max_margin != null ? String(row.max_margin) : "");
    setBrandType(row.brand_type || "");
    setDiscountType(row.discount_type || "");
    setDiscountValue(row.discount_value != null ? String(row.discount_value) : "");
    setIsActive(row.is_active !== false);
    setStoreId(row.company_id != null ? String(row.company_id) : "");

    const pIds = row.product_ids || [];
    const pMargins = row.product_margins || {};
    const loadedList = pIds.map((pid) => {
      const found = products.find((p) => p.value === String(pid));
      return {
        product: String(pid),
        productLabel: found?.label || String(pid),
        margin: pMargins[String(pid)] ?? 0,
      };
    });
    setProductList(loadedList);
    initialFormRef.current = {
      id: row.id,
      sig: buildBrandSig({
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
        productList: loadedList,
      }),
    };
    setShowSearchPage(false);
  };

  const handleDeleteConfirmed = async () => {
    const { id, name: delName } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(`/brands/${id}`);
      toast.success(`"${delName}" deleted successfully`);
      setSearchResults((prev) => prev.filter((r) => r.id !== id));
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

  const brandTableColumns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "printing_name", label: "Printing Name" },
    { key: "brand_type", label: "Brand Type" },
    { key: "discount_type", label: "Discount Type" },
    {
      key: "discount_value",
      label: "Discount Value",
      render: (value) => (value != null ? value : "—"),
      searchValue: (row) => row.discount_value,
    },
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
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete brand "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
      />
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />

      <PageHeader
        title={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Typography
              component="button"
              type="button"
              onClick={() => navigate("/masters")}
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: "primary.main",
                background: "none",
                border: "none",
                p: 0,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Master
            </Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>/</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Brand</Typography>
          </Stack>
        }
        onBack={() => navigate(-1)}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              onClick={handleNew}
              className="topbar-action-btn topbar-action-new"
              startIcon={<PlusCircle size={12} />}
              size="small"
            >
              New
            </Button>
            <Typography sx={{ color: "text.secondary" }}>|</Typography>
            <UploadImportButton
              endpoint="/brands/bulk"
              fieldConfig={BRAND_IMPORT_CONFIG}
              onDone={() => {
                setShowSearchPage(true);
                if (page === 1) fetchBrands();
                else setPage(1);
              }}
            />
            {showSearchPage && (
              <>
                <Typography sx={{ color: "text.secondary" }}>|</Typography>
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
            <Typography sx={{ color: "text.secondary" }}>|</Typography>
            {!showSearchPage && (
              <>
                <Button
                  className="glass-btn glass-btn-success"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={<Save size={12} />}
                  size="small"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Typography sx={{ color: "text.secondary" }}>|</Typography>
              </>
            )}
            <Button
              className="glass-btn glass-btn-primary"
              onClick={handleSearchClick}
              startIcon={<Search size={12} />}
              size="small"
            >
              Search
            </Button>
          </Stack>
        }
      />

      <Box sx={{ p: 1.5, flex: 1, minHeight: 0 }}>
        {!showSearchPage ? (
          <Card
            variant="outlined"
            sx={{ p: 2, height: { lg: "100%" } }}
            data-enter-scope="true"
            onKeyDownCapture={handleEnterKeyNavigation}
          >
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" }, gap: 3 }}>
              {/* Left Section - Primary Details */}
              <Box sx={{ gridColumn: { xs: "span 12", lg: "span 6" }, display: "flex", flexDirection: "column", gap: 2, pr: 2 }}>
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

                <Stack direction="row" sx={{ alignItems: "center" }}>
                  <Typography component="label" sx={{ width: "33.33%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Margin</Typography>
                  <Stack direction="row" sx={{ flex: 1, alignItems: "center", gap: 1.5, ml: 1.5 }}>
                    <TextField
                      type="number"
                      value={minMargin}
                      onChange={(e) => setMinMargin(e.target.value)}
                      placeholder="Min Margin"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                    />
                    <TextField
                      type="number"
                      value={maxMargin}
                      onChange={(e) => setMaxMargin(e.target.value)}
                      placeholder="Max Margin"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                    />
                  </Stack>
                </Stack>

                <SelectInput
                  label="Brand Type"
                  options={brandTypeOptions}
                  value={brandType}
                  onChange={(e) => setBrandType(e.target.value)}
                />

                <Stack direction="row" sx={{ alignItems: "center" }}>
                  <Typography component="label" sx={{ width: "33.33%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
                    Discount / Value
                  </Typography>
                  <Stack direction="row" sx={{ flex: 1, alignItems: "center", gap: 1.5, ml: 1.5 }}>
                    <TextField
                      select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                    >
                      <MenuItem value="">Select</MenuItem>
                      {discountOptions.map((option, index) => (
                        <MenuItem key={index} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="Value"
                      size="small"
                      sx={{ width: 80, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                    />
                  </Stack>
                </Stack>

                <Stack direction="row" sx={{ alignItems: "center" }}>
                  <Typography component="label" sx={{ width: "33.33%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
                    Logo
                  </Typography>
                  <Stack direction="row" sx={{ flex: 1, alignItems: "center", gap: 1, ml: 1.5 }}>
                    <Typography
                      component="label"
                      htmlFor="logoUpload"
                      sx={{ cursor: "pointer", px: 1.5, py: 0.75, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.12), border: 1, borderColor: (theme) => alpha(theme.palette.primary.main, 0.4), borderRadius: "3.5px", color: "primary.main", fontSize: 12.25, "&:hover": { bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.32 : 0.2) } }}
                    >
                      📁 Choose Image
                    </Typography>
                    <Box
                      component="input"
                      id="logoUpload"
                      type="file"
                      accept="image/*"
                      sx={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          console.log("Selected file:", file.name);
                        }
                      }}
                    />
                    <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary", fontStyle: "italic" }}>No file selected</Typography>
                  </Stack>
                </Stack>

                <Stack direction="row" sx={{ alignItems: "center", pt: 1 }}>
                  <Typography component="label" sx={{ width: "33.33%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
                    Active
                  </Typography>
                  <Stack direction="row" sx={{ flex: 1, alignItems: "center", ml: 1.5 }}>
                    <Checkbox
                      id="active"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      size="small"
                      sx={{ p: 0 }}
                    />
                  </Stack>
                </Stack>
              </Box>

              {/* Right Section - Product Margin List */}
              <Box sx={{ gridColumn: { xs: "span 12", lg: "span 6" }, borderLeft: 1, borderColor: "divider", pl: 2 }}>
                <Typography component="h2" sx={{ fontSize: 15, fontWeight: 700, mb: 1.5, pb: 1, borderBottom: 1, borderColor: "divider" }}>
                  Product Margin - B2B
                </Typography>
                <Box sx={{ border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden" }}>
                  <Stack direction="row" sx={{ bgcolor: "action.hover", borderBottom: 1, borderColor: "divider", p: 1, fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>
                    <Box sx={{ width: "50%", px: 0.5 }}>Product</Box>
                    <Box sx={{ width: "33.33%", px: 0.5 }}>Margin (%)</Box>
                    <Box sx={{ width: "16.66%", px: 0.5, textAlign: "right" }}>Action</Box>
                  </Stack>

                  <Stack direction="row" sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", p: 1, gap: 1 }}>
                    <TextField
                      select
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      size="small"
                      sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                    >
                      <MenuItem value="">Select Product</MenuItem>
                      {products.map((p, idx) => (
                        <MenuItem key={idx} value={p.value}>
                          {p.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      type="number"
                      placeholder="Margin"
                      value={margin}
                      onChange={(e) => setMargin(e.target.value)}
                      size="small"
                      sx={{ width: "33.33%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                    />
                    <Button
                      onClick={handleAddProduct}
                      className="glass-btn glass-btn-primary"
                      startIcon={<PlusCircle size={16} />}
                      sx={{ width: "16.66%" }}
                    >
                      Add
                    </Button>
                  </Stack>

                  <Box sx={{ fontSize: 12.25 }}>
                    {productList.length === 0 ? (
                      <Box sx={{ color: "text.secondary", fontStyle: "italic", p: 1.5, textAlign: "center" }}>
                        No products added
                      </Box>
                    ) : (
                      <Table sx={{ width: "100%" }} size="small">
                        <TableBody>
                          {productList.map((item, index) => (
                            <TableRow
                              key={index}
                              hover
                            >
                              <TableCell sx={{ width: "50%" }}>{item.productLabel || item.product}</TableCell>
                              <TableCell sx={{ width: "33.33%" }}>{item.margin}%</TableCell>
                              <TableCell sx={{ width: "16.66%", textAlign: "right" }}>
                                <IconButton
                                  onClick={() => handleRemoveProduct(index)}
                                  size="small"
                                  sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Card>
        ) : (
          <Card variant="outlined" sx={{ px: 1.5, pt: 1.5, pb: 0.5, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>
              Search Brands
            </Typography>
            <FilterableDataTable
              rows={searchResults}
              columns={brandTableColumns}
              loading={searchLoading}
              searchPlaceholder="Search in brand fields..."
              searchButtonClassName="glass-btn glass-btn-primary"
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
              pagination={rawPagination}
              onPageChange={setPage}
              onNextCursor={handleBrandsNextCursor}
              onPreviousCursor={handleBrandsPreviousCursor}
              onFetchGroupSummaries={fetchBrandGroupSummaries}
              onFetchGroupRows={fetchBrandGroupRows}
              onLimitChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
              onRowClick={handleEditFromSearch}
              paginationMode="server"
              enableVirtualization
              enableSelection
              enableKeyboardNav
              selectedRows={selectedRows}
              onSelectionChange={setSelectedRows}
              onBulkDelete={handleBulkDelete}
              fillHeight
              compact
              renderActions={(row, { selectedCount } = {}) => (
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleEditFromSearch(row)}
                    title="Edit"
                    disabled={selectedCount > 1}
                    className="glass-btn glass-btn-primary"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ open: true, id: row.id, name: row.name })}
                    title="Delete"
                    className="glass-btn glass-btn-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </Stack>
              )}
            />
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default Brand;
