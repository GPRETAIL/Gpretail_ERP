import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, PlusCircle, Save, Search } from "lucide-react";
import {
  DualTextInput,
  SelectInput,
  CheckboxInput,
  CheckboxSelectInput,
  TextInput,
} from "../../components/CustomInputs";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
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
        setTaxOptions(
          (taxRes.data?.data || []).map((t) => ({ label: `${t.name} (${t.tax_percentage}%)`, value: t.id }))
        );
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
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      {/* Header (Minimized) */}
      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
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
            <span>
              Products {isEdit ? `(Edit: ${editCode})` : ""}
            </span>
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="glass-btn glass-btn-success flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-3 h-3 mr-1" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {/* --- END Header --- */} {/* Content */}
      <div className="p-3 flex-1 min-h-0">
        <div
          className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3 h-auto lg:h-full lg:min-h-0 lg:overflow-y-auto"
          data-enter-scope="true"
          onKeyDownCapture={handleEnterKeyNavigation}
        >
          {/* Reduced inner padding */}
          <div className="grid grid-cols-12 gap-3">
            {/* Reduced gap */} {/* --- Column 1: Left --- */}
            <div className="col-span-12 lg:col-span-4 space-y-1.5">
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
              <SelectInput
                label="Sales Tax"
                name="salesTax"
                required
                value={formData.salesTax}
                onChange={handleChange}
                options={taxOptions}
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
              {/* Discount Mode (Select + Input) */}
              <div className="flex items-center">
                <label className="w-2/5 text-xs font-medium text-gray-700 dark:text-gray-300 text-right pr-3">
                  Discount Mode
                </label>
                <div className="flex-1 flex items-center gap-2">
                  <select
                    name="discountMode"
                    value={formData.discountMode}
                    onChange={handleChange}
                    className="w-2/3 border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {discountModeOptions.map((option, index) => (
                      <option key={index} value={option.value || option.label}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    name="discountModeValue"
                    value={formData.discountModeValue}
                    onChange={handleChange}
                    className="w-1/3 border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
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
            </div>
            {/* --- Column 2: Middle --- */}
            <div className="col-span-12 lg:col-span-4 space-y-1.5 border-l border-r border-gray-100 dark:border-gray-700 px-3">
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
              <SelectInput
                label="Purchase Tax"
                name="purchaseTax"
                value={formData.purchaseTax}
                onChange={handleChange}
                options={taxOptions}
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
            </div>
            {/* --- Column 3: Right (Attributes Table) --- */}
            <div className="col-span-12 lg:col-span-4 pl-3">
              {/* Reduced horizontal padding */} {/* Header with Checkbox */}
              <div className="flex justify-between items-center mb-1.5">
                {/* Reduced vertical margin */}
                <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  Purchase Entry Attributes (Configure)
                </h3>
                <label className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    title="Enable Configure Mode"
                    checked={selectAllAttributes}
                    onChange={handleSelectAllAttributes}
                    className="w-3 h-3 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500"
                  />
                  Configure
                </label>
              </div>
              <div className="border border-gray-300 dark:border-gray-600 rounded-sm overflow-hidden h-[320px] md:h-[380px] xl:h-[450px] flex flex-col">
                {/* Slight height adjustment */} {/* Table Header */}
                <div className="flex bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold border-b dark:border-gray-600">
                  <div className="w-9/12 px-2 py-1">Name</div>
                  <div className="w-1/12 px-2 py-1 text-center">Man</div>
                  <div className="w-1/12 px-2 py-1 text-center">Show</div>
                  <div className="w-1/12 px-2 py-1 text-center">ROL</div>
                </div>
                {/* Table Body - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                  {attributes.map((attr, index) => (
                    <div
                      key={attr.id}
                      className="flex items-center border-t dark:border-gray-700 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="w-9/12 px-2 py-1">{attr.name}</div>
                      <div className="w-1/12 px-2 py-1 flex justify-center">
                        <input
                          type="checkbox"
                          checked={!!attr.man}
                          onChange={() => handleAttributeChange(index, "man")}
                          disabled={!selectAllAttributes}
                          className={`w-3 h-3 rounded ${selectAllAttributes ? "text-blue-600 cursor-pointer" : "text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"}`}
                        />
                      </div>
                      <div className="w-1/12 px-2 py-1 flex justify-center">
                        <input
                          type="checkbox"
                          checked={!!attr.show}
                          onChange={() => handleAttributeChange(index, "show")}
                          disabled={!selectAllAttributes}
                          className={`w-3 h-3 rounded ${selectAllAttributes ? "text-blue-600 cursor-pointer" : "text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"}`}
                        />
                      </div>
                      <div className="w-1/12 px-2 py-1 flex justify-center">
                        <input
                          type="checkbox"
                          checked={!!attr.rol}
                          onChange={() => handleAttributeChange(index, "rol")}
                          disabled={!selectAllAttributes}
                          className={`w-3 h-3 rounded ${selectAllAttributes ? "text-blue-600 cursor-pointer" : "text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
