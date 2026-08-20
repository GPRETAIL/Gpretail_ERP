import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Pencil,
  PlusCircle,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import {
  DualTextInput,
  SelectInput,
  CheckboxInput,
  TextInput,
} from "../../components/CustomInputs";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import TaxRangeTable from "../../components/RangedTaxTable";
import api from "../../api/axios";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";
import { normalizeFormSignature } from "../../utils/formSignature";

const TaxForm = () => {
  const [rangedTaxItems, setRangedTaxItems] = useState([
    {
      from: 0,
      to: 0,
      taxPercentage: 0,
      cgstPercentage: 0,
      sgstPercentage: 0,
      inCost: false,
    },
  ]);

  const { taxCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // tax_code is only unique per store, so the row's own company_id (carried on the URL by
  // Tax.jsx) is required to find the right row -- without it this falls back to whatever store
  // is currently "active" for the caller, which 404s for any row that isn't (see
  // TaxController.getOne). Absent entirely on the "New" form, where there is no row yet.
  const companyIdParam = searchParams.get("company_id");

  const isEdit = location.pathname.includes("/edit/");
  const isView = !!taxCode && !isEdit;
  const isAdd = !taxCode;

  // Baseline snapshot (edit mode) so an unchanged save reports "No changes detected".
  const initialFormRef = useRef({ id: null, sig: null });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard (set before the first await)

  // Owning store — never picked here. A store user is scoped server-side, and a super admin's
  // active store rides along on every request from the Navbar switcher. Only carried so an edit
  // keeps the store the row is already filed under.
  const [storeId, setStoreId] = useState("");

  const [formData, setFormData] = useState({
    taxCode: "",
    name: "",
    taxCharges: "",
    isSalesTax: false,
    isPurchaseTax: false,
    isDisabled: false,
    taxPercentage: 0,
    extraFields: {},
  });
  if (isEdit) {
    console.log(formData);
  }
  const [errors, setErrors] = useState({});

  // Handler for top-level form fields
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Reset form when taxCharges changes
    if (name === "taxCharges") {
      setFormData({
        taxCode: "",
        name: "",
        taxCharges: value,
        isSalesTax: false,
        isPurchaseTax: false,
        isDisabled: false,
        taxPercentage: 0,
        extraFields: {},
      });
      setRangedTaxItems([
        {
          from: 0,
          to: 0,
          taxPercentage: 0,
          cgstPercentage: 0,
          sgstPercentage: 0,
          inCost: false,
        },
      ]);

      return;
    }

    // Dynamic Extra Fields Handler
    if (["From", "To"].includes(name)) {
      setFormData((prev) => ({
        ...prev,
        extraFields: {
          ...prev.extraFields,
          [name]: value,
        },
      }));
      return;
    }

    // GST auto calculation
    if (formData.taxCharges === "GST" && name === "taxPercentage") {
      const taxVal = parseFloat(value) || 0;
      setFormData((prev) => ({
        ...prev,
        taxPercentage: taxVal,
        extraFields: {
          ...prev.extraFields,
          cgst: taxVal / 2,
          sgst: taxVal / 2,
        },
      }));
      return;
    }

    // Default top-level field update
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (isView) return;
    if (savingRef.current) return; // a save is already in flight — ignore repeated clicks

    // Basic validation
    const newErrors = {};
    if (!formData.taxCode.trim()) newErrors.taxCode = "Tax Code is required";
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.taxCharges.trim())
      newErrors.taxCharges = "Please select a Tax / Charge";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill the highlighted fields before saving.");
      return;
    }

    setErrors({});

    if (isEdit && initialFormRef.current.id === taxCode
        && normalizeFormSignature({ formData, rangedTaxItems, storeId }) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    // Prepare payload
    const payload = {
      ...formData,
      ...(storeId ? { companyId: Number(storeId) } : {}),
      extraFields: {
        ...formData.extraFields,
        rangedtable: rangedTaxItems.map((item) => ({
          from: item.from,
          to: item.to,
          taxPercentage: item.taxPercentage,
          cgstPercentage: item.cgstPercentage,
          sgstPercentage: item.sgstPercentage,
          inCost: item.inCost,
        })),
      },
    };

    console.log("Saving payload:", payload);

    try {
      if (isEdit) {
        await api.put(`/taxes/${taxCode}`, {
          name: payload.name,
          taxCharges: payload.taxCharges,
          taxPercentage: payload.taxPercentage,
          is_sales_tax: payload.isSalesTax,
          is_purchase_tax: payload.isPurchaseTax,
          is_disabled: payload.isDisabled,
          extra_fields: payload.extraFields,
          company_id: payload.companyId,
        });
        initialFormRef.current = {
          id: taxCode,
          sig: normalizeFormSignature({ formData, rangedTaxItems, storeId }),
        };
        toast.success("Tax record updated successfully!");
      } else {
        await api.post("/taxes", {
          tax_code: payload.taxCode,
          name: payload.name,
          tax_type: payload.taxCharges,
          taxPercentage: payload.taxPercentage,
          is_sales_tax: payload.isSalesTax,
          is_purchase_tax: payload.isPurchaseTax,
          is_disabled: payload.isDisabled,
          extra_fields: payload.extraFields,
          company_id: payload.companyId,
        });
        toast.success("Tax record saved successfully!");
        setFormData(initialFormData);
        setStoreId("");
        initialFormRef.current = { id: null, sig: null };
      }
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const taxTypeOptions = [
    { label: "GST", value: "GST" },
    { label: "VAT", value: "VAT" },
    { label: "TDS", value: "TDS" },
    { label: "TCS", value: "TCS" },
    { label: "Ranged GST", value: "RGST" },
    { label: "CESS", value: "CESS" },
  ];

  const handleNew = () => {
    navigate(`/masters/tax/new`);
  };

  // Load existing tax for edit mode
  useEffect(() => {
    if (!isEdit || !taxCode) return;
    const load = async () => {
      try {
        const res = await api.get(`/taxes/${taxCode}`, {
          params: companyIdParam ? { company_id: companyIdParam } : undefined,
        });
        const t = res.data.data;
        const loadedFormData = {
          taxCode: t.tax_code ?? t.code ?? "",
          name: t.name ?? "",
          taxCharges: t.tax_type ?? t.type ?? "GST",
          isSalesTax: t.is_sales_tax ?? true,
          isPurchaseTax: t.is_purchase_tax ?? true,
          isDisabled: t.is_disabled ?? (t.is_active === false),
          taxPercentage: t.tax_percentage ?? t.rate ?? 0,
          extraFields: t.extra_fields || {
            cgst: t.cgst_rate ?? ((t.rate ?? 0) / 2),
            sgst: t.sgst_rate ?? ((t.rate ?? 0) / 2),
          },
        };
        const loadedRanged = t.extra_fields?.rangedtable || rangedTaxItems;
        const loadedStoreId = t.company_id != null ? String(t.company_id) : "";
        setFormData(loadedFormData);
        setStoreId(loadedStoreId);
        if (t.extra_fields?.rangedtable) {
          setRangedTaxItems(t.extra_fields.rangedtable);
        }
        if (isEdit) {
          initialFormRef.current = {
            id: taxCode,
            sig: normalizeFormSignature({ formData: loadedFormData, rangedTaxItems: loadedRanged, storeId: loadedStoreId }),
          };
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load tax");
      }
    };
    load();
  }, [isAdd, taxCode, isEdit, companyIdParam]);

  if (isEdit) {
    console.log(formData);
  }
  const renderDynamicFields = () => {
    switch (formData.taxCharges) {
      case "GST":
        // Fix: Use the new handleExtraFieldsChange and reference correct state
        return (
          <div className="col-span-12 lg:col-span-3 space-y-1.5 border-l border-r border-gray-100 dark:border-gray-700 px-3">
            <TextInput
              label="CGST"
              name="cgst"
              value={formData.extraFields.cgst ?? 0}
              disabled={true}
              placeholder="Auto-calculated"
            />
            <TextInput
              label="SGST"
              name="sgst"
              value={formData.extraFields.sgst ?? 0}
              disabled={true}
              placeholder="Auto-calculated"
            />
          </div>
        );

      case "RGST":
        return (
          <>
            <div className="col-span-12 lg:col-span-6 space-y-1.5 px-3">
              <DualTextInput
                label="Exclude"
                name1="From"
                value1={formData.extraFields.excluesFrom}
                name2="To"
                value2={formData.extraFields.excluesTo}
                onChange={handleChange}
              />
              <TaxRangeTable
                isView={isView}
                rangedTaxItems={rangedTaxItems}
                setRangedTaxItems={setRangedTaxItems}
              />
            </div>
          </>
        );
      default:
        return;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      {/* Header */}
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
            <span>Tax</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          {!isView && (
            <>
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
            </>
          )}

          {isView && (
            <button
              onClick={() => navigate(`/masters/tax/edit/${taxCode}`)}
              className="glass-btn glass-btn-primary flex items-center"
            >
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </button>
          )}
        </div>
      </div>
      <hr className="my-0 border-t border-gray-200 dark:border-gray-700" />
      <div className="p-3 flex-1 min-h-0">
        <div
          className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3 h-full"
          data-enter-scope="true"
          onKeyDownCapture={handleEnterKeyNavigation}
        >
          <div className="grid grid-cols-12 gap-3">
            {/* Left Column - General Tax Details */}
            <div className="col-span-12 lg:col-span-4 space-y-1.5">
              <TextInput
                label="* Tax Code"
                name="taxCode"
                value={formData.taxCode}
                onChange={handleChange}
                disabled={isView || isEdit}
              />
              {errors.taxCode && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 ml-[33%]">
                  {errors.taxCode}
                </p>
              )}
              <TextInput
                label="* Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isView}
              />
              {errors.name && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 ml-[33%]">
                  {errors.name}
                </p>
              )}
              <SelectInput
                label={"* Tax / Charges"}
                name={"taxCharges"}
                value={formData.taxCharges}
                onChange={handleChange}
                options={taxTypeOptions}
                disabled={isView}
              />
              {errors.taxCharges && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 ml-[33%]">
                  {errors.taxCharges}
                </p>
              )}
              {formData.taxCharges !== "RGST" && (
                <TextInput
                  label="Tax Percentage"
                  name="taxPercentage"
                  value={formData.taxPercentage}
                  onChange={handleChange}
                  disabled={isView}
                  placeholder="e.g., 18.00"
                />
              )}

              {/* Conditional DualTextInput based on Sales Tax checkbox - as per image (Exclude From/To) */}
              <CheckboxInput
                label="Sales Tax"
                name="isSalesTax"
                checked={formData.isSalesTax}
                onChange={handleChange}
                disabled={isView}
              />
              {errors.salesTax && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 ml-[33%]">
                  {errors.salesTax}
                </p>
              )}

              <CheckboxInput
                label="Purchase Tax"
                name="isPurchaseTax"
                checked={formData.isPurchaseTax}
                onChange={handleChange}
                disabled={isView}
              />
              {errors.purchaseTax && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 ml-[33%]">
                  {errors.purchaseTax}
                </p>
              )}
              <CheckboxInput
                label="Disable"
                name="isDisabled"
                checked={formData.isDisabled}
                onChange={handleChange}
                disabled={isView}
              />
              {errors.disable && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 ml-[33%]">
                  {errors.disable}
                </p>
              )}
            </div>
            {renderDynamicFields()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxForm;
