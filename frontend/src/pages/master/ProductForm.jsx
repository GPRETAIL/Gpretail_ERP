import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, PlusCircle, Save, Search } from "lucide-react";
import { Box, Stack, Card, Typography, Button, Checkbox } from "@mui/material";
import {
  DualTextInput,
  SelectTextInput,
  SelectInput,
  AsyncSelectInput,
  CheckboxInput,
  CheckboxSelectInput,
  TextInput,
} from "../../components/CustomInputs";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";

const mapTaxOption = (t) => ({
  id: String(t.id),
  value: t.id,
  name: `${t.name} (${t.tax_percentage}%)`,
  label: `${t.name} (${t.tax_percentage}%)`,
});
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";
import SearchableSelect from "../../components/SearchableSelect";

const buildProductPayload = (formData, attributes) => ({
  name: formData.name,
  code: formData.code || undefined,
  product_group_id: formData.productGroup || null,
  brand_id: formData.brand || null,
  sales_tax_id: formData.salesTax || null,
  purchase_tax_id: formData.purchaseTax || null,
  size_group_id: formData.sizeGroup || null,
  barcode_id: formData.barcodeID || null,
  hsn: formData.hsn,
  type: formData.type,
  barcode_mode: formData.barcodeMode,
  barcode_source: formData.barcodeSource,
  uom: formData.uom,
  selling_mode: formData.sellingMode,
  discount_mode: formData.discountMode,
  discount_mode_value: formData.discountModeValue,
  margin_min: formData.marginMin,
  margin_max: formData.marginMax,
  stock_holding_period: formData.stockHoldingPeriod,
  purchase_plan_mode: formData.purchasePlanMode,
  expected_gender: formData.expectedGender,
  section: formData.section,
  company_id: formData.company || null,
  dumping: formData.dumping,
  dumping_value: formData.dumpingValue,
  cess: formData.cess,
  cess_value: formData.cessValue,
  daily_price: formData.dailyPrice,
  daily_price_value: formData.dailyPriceValue,
  is_core: formData.isCore,
  is_core_value: formData.isCoreValue,
  exclude_reward: formData.excludeReward,
  auto_po: formData.autoPO,
  auto_po_value: formData.autoPOValue,
  active: formData.active,
  purchase_entry_attributes: attributes,
});

const buildPayloadSignature = (payload) => {
  const normalized = {};
  const keys = Object.keys(payload || {}).sort();

  keys.forEach((key) => {
    let value = payload[key];
    if (value === undefined) return;

    if (typeof value === "string") value = value.trim();

    if (key === "purchase_entry_attributes") {
      const safeRows = Array.isArray(value) ? value : [];
      value = safeRows
        .map((row) => ({
          id: row?.id ?? null,
          name: String(row?.name || ""),
          man: !!row?.man,
          show: !!row?.show,
          rol: !!row?.rol,
        }))
        .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    }

    normalized[key] = value;
  });

  return JSON.stringify(normalized);
};

const getApiErrorMessage = (err, fallback = "Save failed") => {
  const fieldError = err?.response?.data?.errors?.[0]?.message;
  return fieldError || err?.response?.data?.message || fallback;
};

const initialFormData = {
  // Col 1
  productGroup: "",
  code: "",
  name: "",
  salesTax: "",
  barcodeMode: "Only Number",
  marginMin: "",
  marginMax: "",
  discountMode: "Allow Discount On Bill",
  discountModeValue: 0,
  barcodeSource: "",
  stockHoldingPeriod: "",
  purchasePlanMode: "",
  expectedGender: "",
  uom: "",
  section: "",
  company: "",
  // Col 2
  type: "Textile",
  hsn: "",
  purchaseTax: "",
  sellingMode: "Piece",
  dumping: false,
  dumpingValue: "",
  cess: false,
  cessValue: "",
  dailyPrice: false,
  dailyPriceValue: "",
  isCore: false,
  isCoreValue: "",
  excludeReward: false, // Changed to simple boolean
  sizeGroup: "",
  barcodeID: "",
  autoPO: false,
  autoPOValue: "",
  active: true,
};
const purchaseEntryAttr = [
  { id: 1, name: "BRAND" },
  { id: 2, name: "MATERIAL" },
  { id: 3, name: "PATTERN" },
  { id: 4, name: "STYLE" },
  { id: 5, name: "TYPE" },
  { id: 6, name: "COLOUR" },
  { id: 7, name: "SIZE" },
  { id: 8, name: "DESIGN" },
  { id: 9, name: "PURCHASE ORDER" },
  { id: 10, name: "SERIAL NO" },
  { id: 11, name: "BATCH AND EXPIRY" },
  { id: 12, name: "ITEM" },
  { id: 13, name: "COLOUR/OPTION" },
  { id: 14, name: "MULTIPLE PRICE" },
  { id: 15, name: "UPLOAD BARCODE" },
  { id: 16, name: "FIT" },
  { id: 17, name: "SLEEVE" },
  { id: 18, name: "WEIGHT" },
  { id: 19, name: "WASTAGE" },
  { id: 20, name: "WORKING CHARGE" },
];
const barcodeModeOptions = [
  { label: "Unique", value: "Unique" },
  { label: "CAPS and Number", value: "CAPS and Number" },
  { label: "Only Number", value: "Only Number" },
  { label: "UAN", value: "UAN" },
  { label: "PACK / SERIAL", value: "PACK / SERIAL" },
  { label: "IEMI", value: "IEMI" },
];
const discountModeOptions = [
  {
    label: "Select an Discount Mode",
    value: "",
  },
  { label: "Allow Discount On Bill", value: "Allow Discount On Bill" },
  { label: "Layolty Discount", value: "Layolty Discount" },
  { label: "No Addln.Discount On Bill", value: "No Addln.Discount On Bill" },
  {
    label: "Fixed Discount By Percentage",
    value: "Fixed Discount By Percentage",
  },
];
const barcodeSourceOptions = [
  { label: "STOCK GENERATION", value: "STOCK GENERATION" },
  { label: "ITEM-GLN/UAN/GS1", value: "ITEM-GLN/UAN/GS1" },
  { label: "PURCHASE-IMEI", value: "PURCHASE-IMEI" },
  { label: "PRODUCT CODE", value: "PRODUCT CODE" },
];

const purchasePlanModeOptions = [
  { label: "SUPPLIER VS PRICE", value: "SUPPLIER VS PRICE" },
  { label: "BRAND VS SIZE", value: "BRAND VS SIZE" },
  { label: "SIZE VS PRICE", value: "SIZE VS PRICE" },
  { label: "MATERIAL VS PRICE", value: "MATERIAL VS PRICE" },
  { label: "TYPE VS PRICE", value: "TYPE VS PRICE" },
  { label: "SIZE VS FIT VS SLEEVE", value: "SIZE VS FIT VS SLEEVE" },
];
const expectedGenderOptions = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Boy", value: "Boy" },
  { label: "Girl", value: "Girl" },
];
const uomOptions = [
  { label: "Piece", value: "Piece" },
  { label: "Meter", value: "Meter" },
  { label: "Gram", value: "Gram" },
  { label: "Kg", value: "Kg" },
  { label: "Ml", value: "Ml" },
  { label: "Litter", value: "Litter" },
  { label: "Qty", value: "Qty" },
];
// typeOptions removed — now loaded dynamically from companytype attribute
const sellingModeOptions = [
  { label: "Piece", value: "Piece" },
  { label: "Pack", value: "Pack" },
  { label: "Cut", value: "Cut" },
];

const ProductForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: editCode } = useParams();
  const isEdit = !!editCode;
  const editCompanyId = new URLSearchParams(location.search).get("company_id");
  const [formData, setFormData] = useState(initialFormData);
  const [attributes, setAttributes] = useState(purchaseEntryAttr);
  const [selectAllAttributes, setSelectAllAttributes] = useState(false);
  const [initialPayloadSignature, setInitialPayloadSignature] = useState(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard

  // ─── Dynamic dropdown state ────────────────────────────────────────────────
  const [taxOptions, setTaxOptions] = useState([]);

  const handleAsyncTaxSearch = async (query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];
    try {
      const res = await api.get("/taxes", { params: { search: trimmed, limit: 50 } });
      const mapped = (res.data?.data || []).map(mapTaxOption);
      if (mapped.length) {
        setTaxOptions((prev) => {
          const existing = new Set(prev.map((t) => String(t.value)));
          const newOnes = mapped.filter((t) => !existing.has(String(t.value)));
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      }
      return mapped;
    } catch {
      return [];
    }
  };
  const [productGroupOptions, setProductGroupOptions] = useState([]);
  const [sizeGroupOptions, setSizeGroupOptions] = useState([]);
  const [barcodeIdOptions, setBarcodeIdOptions] = useState([]);
  const [companyTypeOptions, setCompanyTypeOptions] = useState([]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [taxRes, sizeGrpRes, productGrpRes, barcodeRes, companyTypeRes] = await Promise.all([
          api.get("/taxes"),
          api.get("/size-groups"),
          api.get("/attributes/productgroups"),
          api.get("/attributes/barcodeid"),
          api.get("/attributes/companytype"),
        ]);
        // Was api.get("/taxes") with no params (default ~50 rows), no way to search beyond it --
        // taxes now has real async search (handleAsyncTaxSearch below) covering the real table.
        setTaxOptions((taxRes.data?.data || []).map(mapTaxOption));
        setSizeGroupOptions(
          (sizeGrpRes.data?.data || []).map((g) => ({ label: g.group_name, value: g.id }))
        );
        setProductGroupOptions(
          (productGrpRes.data?.data || []).map((a) => ({ label: a.name, value: a.id }))
        );
        setBarcodeIdOptions(
          (barcodeRes.data?.data || []).map((a) => ({ label: a.name, value: a.id }))
        );
        setCompanyTypeOptions(
          (companyTypeRes.data?.data || []).map((a) => ({ label: a.name, value: a.name }))
        );
      } catch (err) {
        console.error("Failed to load dropdowns", err);
      }
    };
    loadDropdowns();
  }, []);

  // Load product data when editing
  useEffect(() => {
    if (!editCode) return;
    const loadProduct = async () => {
      try {
        const res = await api.get(`/products/${encodeURIComponent(editCode)}`, {
          params: editCompanyId ? { company_id: editCompanyId } : undefined,
        });
        const p = res.data.data;
        if (!p) return;
        const loadedFormData = {
          productGroup: p.product_group_id || "",
          code: p.code || "",
          name: p.name || "",
          salesTax: p.sales_tax_id || "",
          barcodeMode: p.barcode_mode || "",
          marginMin: p.margin_min ?? "",
          marginMax: p.margin_max ?? "",
          discountMode: p.discount_mode || "",
          discountModeValue: p.discount_mode_value || 0,
          barcodeSource: p.barcode_source || "",
          stockHoldingPeriod: p.stock_holding_period ?? "",
          purchasePlanMode: p.purchase_plan_mode || "",
          expectedGender: p.expected_gender || "",
          uom: p.uom || "",
          section: p.section || "",
          company: p.company_id || "",
          type: p.type || "",
          hsn: p.hsn || "",
          purchaseTax: p.purchase_tax_id || "",
          sellingMode: p.selling_mode || "",
          dumping: p.dumping || false,
          dumpingValue: p.dumping_value || "",
          cess: p.cess || false,
          cessValue: p.cess_value || "",
          dailyPrice: p.daily_price || false,
          dailyPriceValue: p.daily_price_value || "",
          isCore: p.is_core || false,
          isCoreValue: p.is_core_value || "",
          excludeReward: p.exclude_reward || false,
          sizeGroup: p.size_group_id || "",
          barcodeID: p.barcode_id || "",
          autoPO: p.auto_po || false,
          autoPOValue: p.auto_po_value || "",
          active: p.active ?? true,
        };
        const loadedAttributes =
          p.purchase_entry_attributes && Array.isArray(p.purchase_entry_attributes) && p.purchase_entry_attributes.length > 0
            ? p.purchase_entry_attributes
            : purchaseEntryAttr;

        setFormData(loadedFormData);
        setAttributes(loadedAttributes);
        // Auto-enable configure mode if any attribute has man/show/rol checked
        const hasAnyConfig = loadedAttributes.some((a) => a.man || a.show || a.rol);
        setSelectAllAttributes(hasAnyConfig);
        setInitialPayloadSignature(
          buildPayloadSignature(buildProductPayload(loadedFormData, loadedAttributes))
        );
      } catch (err) {
        console.error("Failed to load product:", err);
        toast.error("Failed to load product data");
        setInitialPayloadSignature(null);
      }
    };
    loadProduct();
  }, [editCode, editCompanyId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const handleAttributeChange = (index, field) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = !newAttributes[index][field];
    setAttributes(newAttributes);
    // console.log(attributes);
  };
  const handleSelectAllAttributes = (e) => {
    const { checked } = e.target;
    setSelectAllAttributes(checked);
  };

  const handleNew = () => {
    setFormData(initialFormData);
    setSelectAllAttributes(false);
    setAttributes(purchaseEntryAttr);
    setInitialPayloadSignature(null);
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!String(formData.hsn || "").trim()) {
      toast.error("HSN is required");
      return;
    }
    if (!formData.salesTax) {
      toast.error("Sales tax is required");
      return;
    }
    if (!formData.purchaseTax) {
      toast.error("Purchase tax is required");
      return;
    }
    if (savingRef.current) return; // a save is already in flight — ignore repeated clicks
    const payload = buildProductPayload(formData, attributes);
    const nextSignature = buildPayloadSignature(payload);

    savingRef.current = true;
    setSaving(true);
    try {
      if (isEdit) {
        if (initialPayloadSignature && nextSignature === initialPayloadSignature) {
          toast.info("No changes detected.");
          return;
        }
        await api.put(
          `/products/${encodeURIComponent(editCode)}`,
          editCompanyId ? { ...payload, company_id: editCompanyId } : payload,
          { params: editCompanyId ? { company_id: editCompanyId } : undefined }
        );
        toast.success("Product updated successfully!");
        setInitialPayloadSignature(nextSignature);
      } else {
        await api.post("/products", payload);
        toast.success("Product saved successfully!");
        handleNew();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <PageHeader
        title={
          <Breadcrumbs
            items={[
              { label: "Master", onClick: () => navigate("/masters") },
              { label: `Products ${isEdit ? `(Edit: ${editCode})` : ""}` },
            ]}
          />
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
            <Button
              onClick={handleSave}
              disabled={saving}
              className="glass-btn glass-btn-success"
              startIcon={<Save size={12} />}
              size="small"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </Stack>
        }
      />

      <Box sx={{ p: 1.5, flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Card
          variant="outlined"
          sx={{ p: 1.5 }}
          data-enter-scope="true"
          onKeyDownCapture={handleEnterKeyNavigation}
        >
          {/* Reduced inner padding */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" }, gap: 1.5 }}>
            {/* Reduced gap */} {/* --- Column 1: Left --- */}
            <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, display: "flex", flexDirection: "column", gap: 1 }}>
              {/* Reduced vertical space */}
              <SelectInput
                label="Product Group"
                name="productGroup"
                value={formData.productGroup}
                onChange={handleChange}
                options={productGroupOptions}
              />
              <TextInput
                label="Code"
                name="code"
                value={formData.code}
                onChange={handleChange}
              />
              <TextInput
                label="Name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
              />
              <AsyncSelectInput
                label="Sales Tax"
                name="salesTax"
                required
                value={formData.salesTax}
                onChange={handleChange}
                options={taxOptions}
                onAsyncSearch={handleAsyncTaxSearch}
              />
              <SelectInput
                label="Barcode Mode"
                name="barcodeMode"
                value={formData.barcodeMode}
                onChange={handleChange}
                options={barcodeModeOptions}
              />
              <DualTextInput
                label="Margin (Min/Max)"
                name1="marginMin"
                value1={formData.marginMin}
                name2="marginMax"
                value2={formData.marginMax}
                onChange={handleChange}
              />
              <SelectTextInput
                label="Discount Mode"
                selectName="discountMode"
                selectValue={formData.discountMode}
                options={discountModeOptions}
                inputName="discountModeValue"
                inputValue={formData.discountModeValue}
                onChange={handleChange}
              />
              <SelectInput
                label="Barcode Source"
                name="barcodeSource"
                value={formData.barcodeSource}
                onChange={handleChange}
                options={barcodeSourceOptions}
              />
              <TextInput
                label="Stock Holding Period(in days)"
                name="stockHoldingPeriod"
                value={formData.stockHoldingPeriod}
                onChange={handleChange}
              />
              <SelectInput
                label="Purchase Plan Mode"
                name="purchasePlanMode"
                value={formData.purchasePlanMode}
                onChange={handleChange}
                options={purchasePlanModeOptions}
              />
              <SelectInput
                label="Expected Gender"
                name="expectedGender"
                value={formData.expectedGender}
                onChange={handleChange}
                options={expectedGenderOptions}
              />
              <SelectInput
                label="UOM"
                name="uom"
                value={formData.uom}
                onChange={handleChange}
                options={uomOptions}
              />
              <SelectInput
                label="Section"
                name="section"
                value={formData.section}
                onChange={handleChange}
              />
            </Box>
            {/* --- Column 2: Middle --- */}
            <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, display: "flex", flexDirection: "column", gap: 1, borderLeft: 1, borderRight: 1, borderColor: "divider", px: 1.5 }}>
              {/* Reduced vertical space and horizontal padding */}
              <SearchableSelect
                label="Company Type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                options={companyTypeOptions}
                creatable
              />
              <TextInput
                label="HSN"
                required
                name="hsn"
                value={formData.hsn}
                onChange={handleChange}
              />
              <AsyncSelectInput
                label="Purchase Tax"
                name="purchaseTax"
                value={formData.purchaseTax}
                onChange={handleChange}
                options={taxOptions}
                onAsyncSearch={handleAsyncTaxSearch}
              />
              <SelectInput
                label="Selling Mode"
                name="sellingMode"
                value={formData.sellingMode}
                onChange={handleChange}
                options={sellingModeOptions}
              />
              {/* Checkbox + Select Fields */}
              <CheckboxSelectInput
                label="Dumping"
                checkName="dumping"
                checkValue={formData.dumping}
                selectName="dumpingValue"
                selectValue={formData.dumpingValue}
                onChange={handleChange}
              />
              <CheckboxSelectInput
                label="Cess"
                checkName="cess"
                checkValue={formData.cess}
                selectName="cessValue"
                selectValue={formData.cessValue}
                onChange={handleChange}
              />
              <CheckboxSelectInput
                label="Daily Price"
                checkName="dailyPrice"
                checkValue={formData.dailyPrice}
                selectName="dailyPriceValue"
                selectValue={formData.dailyPriceValue}
                onChange={handleChange}
              />
              <CheckboxSelectInput
                label="Is Core"
                checkName="isCore"
                checkValue={formData.isCore}
                selectName="isCoreValue"
                selectValue={formData.isCoreValue}
                onChange={handleChange}
              />
              <CheckboxInput
                label="Exclude Reward"
                name="excludeReward"
                checked={formData.excludeReward}
                onChange={handleChange}
              />
              <SelectInput
                label="Size Group"
                name="sizeGroup"
                value={formData.sizeGroup}
                onChange={handleChange}
                options={sizeGroupOptions}
              />
              <SelectInput
                label="Barcode ID"
                name="barcodeID"
                value={formData.barcodeID}
                onChange={handleChange}
                options={barcodeIdOptions}
              />
              <CheckboxSelectInput
                label="Auto PO"
                checkName="autoPO"
                checkValue={formData.autoPO}
                selectName="autoPOValue"
                selectValue={formData.autoPOValue}
                onChange={handleChange}
              />
              <CheckboxInput
                label="Active"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
            </Box>
            {/* --- Column 3: Right (Attributes Table) --- */}
            <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, pl: 1.5 }}>
              {/* Reduced horizontal padding */} {/* Header with Checkbox */}
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                {/* Reduced vertical margin */}
                <Typography component="h3" sx={{ fontSize: 10.5, fontWeight: 600, color: "text.primary" }}>
                  Purchase Entry Attributes (Configure)
                </Typography>
                <Stack component="label" direction="row" sx={{ alignItems: "center", gap: 0.5, fontSize: 8.75, color: "text.secondary", cursor: "pointer", userSelect: "none" }}>
                  <Checkbox
                    title="Enable Configure Mode"
                    checked={selectAllAttributes}
                    onChange={handleSelectAllAttributes}
                    size="small"
                    sx={{ p: 0 }}
                  />
                  Configure
                </Stack>
              </Stack>
              <Box sx={{ border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden", height: { xs: 320, md: 380, xl: 450 }, display: "flex", flexDirection: "column" }}>
                {/* Slight height adjustment */} {/* Table Header */}
                <Stack direction="row" sx={{ bgcolor: "action.hover", fontSize: 10.5, fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: "divider" }}>
                  <Box sx={{ width: "75%", px: 1, py: 0.5 }}>Name</Box>
                  <Box sx={{ width: "8.33%", px: 1, py: 0.5, textAlign: "center" }}>Man</Box>
                  <Box sx={{ width: "8.33%", px: 1, py: 0.5, textAlign: "center" }}>Show</Box>
                  <Box sx={{ width: "8.33%", px: 1, py: 0.5, textAlign: "center" }}>ROL</Box>
                </Stack>
                {/* Table Body - Scrollable */}
                <Box sx={{ flex: 1, overflowY: "auto" }}>
                  {attributes.map((attr, index) => (
                    <Stack
                      direction="row"
                      key={attr.id}
                      sx={{ alignItems: "center", borderTop: 1, borderColor: "divider", fontSize: 10.5, "&:hover": { bgcolor: "action.hover" } }}
                    >
                      <Box sx={{ width: "75%", px: 1, py: 0.5 }}>{attr.name}</Box>
                      <Box sx={{ width: "8.33%", px: 1, py: 0.5, display: "flex", justifyContent: "center" }}>
                        <Checkbox
                          checked={!!attr.man}
                          onChange={() => handleAttributeChange(index, "man")}
                          disabled={!selectAllAttributes}
                          size="small"
                          sx={{ p: 0 }}
                        />
                      </Box>
                      <Box sx={{ width: "8.33%", px: 1, py: 0.5, display: "flex", justifyContent: "center" }}>
                        <Checkbox
                          checked={!!attr.show}
                          onChange={() => handleAttributeChange(index, "show")}
                          disabled={!selectAllAttributes}
                          size="small"
                          sx={{ p: 0 }}
                        />
                      </Box>
                      <Box sx={{ width: "8.33%", px: 1, py: 0.5, display: "flex", justifyContent: "center" }}>
                        <Checkbox
                          checked={!!attr.rol}
                          onChange={() => handleAttributeChange(index, "rol")}
                          disabled={!selectAllAttributes}
                          size="small"
                          sx={{ p: 0 }}
                        />
                      </Box>
                    </Stack>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default ProductForm;
