import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Pencil,
  PlusCircle,
  Save,
} from "lucide-react";
import {
  DualTextInput,
  SelectInput,
  CheckboxInput,
  TextInput,
} from "../../components/CustomInputs";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Stack, Card, Typography, Button } from "@mui/material";
import TaxRangeTable from "../../components/RangedTaxTable";
import api from "../../api/axios";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
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
  const companyIdParam = searchParams.get("company_id");

  const isEdit = location.pathname.includes("/edit/");
  const isView = !!taxCode && !isEdit;
  const isAdd = !taxCode;

  const initialFormRef = useRef({ id: null, sig: null });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

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
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

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

    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (isView) return;
    if (savingRef.current) return;

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
        setFormData({
          taxCode: "",
          name: "",
          taxCharges: "",
          isSalesTax: false,
          isPurchaseTax: false,
          isDisabled: false,
          taxPercentage: 0,
          extraFields: {},
        });
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

  const renderDynamicFields = () => {
    switch (formData.taxCharges) {
      case "GST":
        return (
          <Box
            sx={{
              gridColumn: { xs: "span 12", lg: "span 3" },
              display: "flex",
              flexDirection: "column",
              gap: 1,
              borderLeft: 1,
              borderRight: 1,
              borderColor: "divider",
              px: 1.5,
            }}
          >
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
          </Box>
        );

      case "RGST":
        return (
          <Box
            sx={{
              gridColumn: { xs: "span 12", lg: "span 6" },
              display: "flex",
              flexDirection: "column",
              gap: 1,
              px: 1.5,
            }}
          >
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
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <PageHeader
        title={
          <Breadcrumbs
            items={[
              { label: "Master", onClick: () => navigate("/masters") },
              { label: "Tax" },
            ]}
          />
        }
        onBack={() => navigate(-1)}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {!isView && (
              <>
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
              </>
            )}

            {isView && (
              <Button
                onClick={() => navigate(`/masters/tax/edit/${taxCode}`)}
                className="glass-btn glass-btn-primary"
                startIcon={<Pencil size={12} />}
                size="small"
              >
                Edit
              </Button>
            )}
          </Stack>
        }
      />

      <Box sx={{ p: 1.5, flex: 1, minHeight: 0 }}>
        <Card
          variant="outlined"
          sx={{ p: 1.5, height: "100%" }}
          data-enter-scope="true"
          onKeyDownCapture={handleEnterKeyNavigation}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" }, gap: 1.5 }}>
            <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, display: "flex", flexDirection: "column", gap: 1 }}>
              <TextInput
                label="* Tax Code"
                name="taxCode"
                value={formData.taxCode}
                onChange={handleChange}
                disabled={isView || isEdit}
              />
              {errors.taxCode && (
                <Typography sx={{ fontSize: 11, color: "error.main", mt: 0.25, ml: "33%" }}>
                  {errors.taxCode}
                </Typography>
              )}
              <TextInput
                label="* Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isView}
              />
              {errors.name && (
                <Typography sx={{ fontSize: 11, color: "error.main", mt: 0.25, ml: "33%" }}>
                  {errors.name}
                </Typography>
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
                <Typography sx={{ fontSize: 11, color: "error.main", mt: 0.25, ml: "33%" }}>
                  {errors.taxCharges}
                </Typography>
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

              <CheckboxInput
                label="Sales Tax"
                name="isSalesTax"
                checked={formData.isSalesTax}
                onChange={handleChange}
                disabled={isView}
              />
              {errors.salesTax && (
                <Typography sx={{ fontSize: 11, color: "error.main", mt: 0.25, ml: "33%" }}>
                  {errors.salesTax}
                </Typography>
              )}

              <CheckboxInput
                label="Purchase Tax"
                name="isPurchaseTax"
                checked={formData.isPurchaseTax}
                onChange={handleChange}
                disabled={isView}
              />
              {errors.purchaseTax && (
                <Typography sx={{ fontSize: 11, color: "error.main", mt: 0.25, ml: "33%" }}>
                  {errors.purchaseTax}
                </Typography>
              )}
              <CheckboxInput
                label="Disable"
                name="isDisabled"
                checked={formData.isDisabled}
                onChange={handleChange}
                disabled={isView}
              />
              {errors.disable && (
                <Typography sx={{ fontSize: 11, color: "error.main", mt: 0.25, ml: "33%" }}>
                  {errors.disable}
                </Typography>
              )}
            </Box>
            {renderDynamicFields()}
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default TaxForm;
