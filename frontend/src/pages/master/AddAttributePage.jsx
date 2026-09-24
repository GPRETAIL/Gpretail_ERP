import { ArrowLeft, PlusCircle, Save, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, Card, Stack, Typography, Table, TableBody, TableRow, TableCell, IconButton } from "@mui/material";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import {
  CheckboxInput,
  SelectInput,
  TextInput,
} from "../../components/CustomInputs";
import { fieldBaseSx } from "../../theme/formControlSizes";
import api from "../../api/axios";
import { normalizeFormSignature } from "../../utils/formSignature";
import UploadImportButton from "../../components/UploadImportButton";
import { ATTR_IMPORT_CONFIGS, GENERIC_ATTR_CONFIG, GENERIC_ATTR_TRANSFORM } from "../../utils/attrImportConfigs";

const mockOptions = [
  { label: "SIZE", value: "SIZE" },
  { label: "SIZE GROUP", value: "SIZEGROUP" },
  { label: "PATTERN", value: "PATTERN" },
  { label: "STYLE", value: "STYLE" },
  { label: "TYPE", value: "TYPE" },
  { label: "COLOUR", value: "COLOUR" },
  { label: "MATERIAL", value: "MATERIAL" },
  { label: "SLEEVE", value: "SLEEVE" },
  { label: "FIT", value: "FIT" },
  { label: "MARKER", value: "MARKER" },
  { label: "AGESET", value: "AGESET" },
  { label: "UNITS", value: "UNITS" },
  { label: "PRODUCT GROUPS", value: "PRODUCTGROUPS" },
  { label: "PRODUCT HIERARCHY", value: "PRODUCTHIERARCHY" },
  { label: "SUPPLIER GROUP", value: "SUPPLIERGROUP" },
  { label: "CUSTOMER GROUP", value: "CUSTOMERGROUP" },
  { label: "BUYER GROUP", value: "BUYERSGROUP" },
  { label: "BARCODE ID", value: "BARCODEID" },
  { label: "SECTION", value: "DIVISION" },
  { label: "PRODUCT DIVISION", value: "PRODUCTDIVISION" },
  { label: "ITEM GROUPS", value: "ITEMGROUPS" },
  { label: "PRICE TAGS", value: "PRICETAGS" },
  { label: "SELLING NAME TEMPLATE", value: "SELLINGNAMES" },
  { label: "PRODUCT COVERAGE", value: "PRODUCTCOVERAGE" },
  { label: "DAILY PRICE GROUP", value: "DAILYPRICEGROUP" },
  { label: "CORE PRODUCT GROUP", value: "COREPRODUCTGROUP" },
  { label: "DUMPING GROUP", value: "DUMPINGGROUP" },
  { label: "CUSTOM FIELDS", value: "CUSTOMFIELDS" },
  { label: "COMPANY TYPE", value: "COMPANYTYPE" },
];

const AddAttributePage = () => {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "";
  const editingId = searchParams.get("id");
  const createInitialFormData = (productType = "") => ({
    productType,
    code: "",
    name: "",
    measurement: "",
    ageSet: "",
    UOM: "",
    sortOrder: "",
    IsComboSize: false,
    IsMeterSize: false,
    isVariant: false,
    enableSizeRatio: false,
    displayOrder: "",
    incentiveValue: "",
    giftCouponValid: "",
    giftCouponExpiry: "",
    billValueAbove: "",
    giftVoucherPercentage: "",
    giftVoucherValue: "",
    couponValidAfterDays: "",
    couponExpiryDays: "",
    onlineStock: false,
    damagedGoods: false,
    giftCouponMarker: false,
    giftMarker: false,
    LocationPrice: false,
    deadstockAge: "",
    IsSales: false,
    Costing: false,
    description: "",
    parentGroup: "",
    category: "",
  });

  const [formData, setFormData] = useState(createInitialFormData(initialType));
  const [loadingRecord, setLoadingRecord] = useState(false);

  const mapAttributeToForm = (record, productType) => {
    const extra = record?.extra_data || record?.extraData || {};
    const base = createInitialFormData(productType);
    return {
      ...base,
      code: record?.code || "",
      name: record?.name || "",
      sortOrder: record?.sort_order ?? record?.sortOrder ?? "",
      displayOrder: record?.sort_order ?? record?.sortOrder ?? "",
      description: extra.description || "",
      parentGroup: extra.parent_group || extra.parentGroup || "",
      category: extra.category || "",
      ageSet: extra.age_set || extra.ageSet || "",
      incentiveValue: extra.incentive_value || "",
      giftCouponValid: extra.gift_coupon_valid || "",
      giftCouponExpiry: extra.gift_coupon_expiry || "",
      billValueAbove: extra.bill_value_above || "",
      giftVoucherPercentage: extra.gift_voucher_percentage || "",
      giftVoucherValue: extra.gift_voucher_value || "",
      couponValidAfterDays: extra.coupon_valid_after_days || "",
      couponExpiryDays: extra.coupon_expiry_days || "",
      onlineStock: !!extra.online_stock,
      damagedGoods: !!extra.damaged_goods,
      giftCouponMarker: !!extra.gift_coupon_marker,
      giftMarker: !!extra.gift_marker,
      LocationPrice: !!extra.location_price,
      deadstockAge: extra.deadstock_age || "",
      IsSales: !!extra.is_sales,
      Costing: !!extra.costing,
    };
  };

  useEffect(() => {
    if (!editingId || !initialType) return;

    const loadRecord = async () => {
      setLoadingRecord(true);
      try {
        if (initialType === "SIZE") {
          const res = await api.get(`/sizes/${editingId}`);
          const record = res.data?.data || res.data;
          const loadedForm = {
            ...createInitialFormData("SIZE"),
            productType: "SIZE",
            code: record?.code || "",
            name: record?.size_name || record?.sizeName || "",
            measurement: record?.measurement || "",
            ageSet: record?.age_set || record?.ageSet || "",
            UOM: record?.uom || "",
            sortOrder: record?.sort_order ?? record?.sortOrder ?? "",
            IsComboSize: !!(record?.is_combo_size ?? record?.isComboSize),
            IsMeterSize: !!(record?.is_meter_size ?? record?.isMeterSize),
            isVariant: !!(record?.is_variant ?? record?.isVariant),
          };
          setFormData(loadedForm);
          initialFormRef.current = normalizeFormSignature({ f: loadedForm, s: [] });
        } else if (initialType === "SIZEGROUP") {
          const res = await api.get(`/size-groups/${editingId}`);
          const record = res.data?.data || res.data;
          const loadedForm = {
            ...createInitialFormData("SIZEGROUP"),
            productType: "SIZEGROUP",
            code: record?.code || "",
            name: record?.group_name || record?.groupName || "",
            sortOrder: record?.sort_order ?? record?.sortOrder ?? "",
            enableSizeRatio: !!(record?.enable_size_ratio ?? record?.enableSizeRatio),
          };
          const loadedSizes = record?.sizes || [];
          setFormData(loadedForm);
          setSizeList(loadedSizes);
          initialFormRef.current = normalizeFormSignature({ f: loadedForm, s: loadedSizes });
        } else {
          const res = await api.get(`/attributes/${initialType.toLowerCase()}/${editingId}`);
          const record = res.data?.data || res.data;
          const loadedForm = mapAttributeToForm(record, initialType);
          setFormData(loadedForm);
          initialFormRef.current = normalizeFormSignature({ f: loadedForm, s: [] });
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load record for edit");
      } finally {
        setLoadingRecord(false);
      }
    };

    loadRecord();
  }, [editingId, initialType]);

  // Baseline snapshot for the "No changes detected" guard — captured once after the edit record loads.
  const initialFormRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard

  // ─── Size Group state ────────────────────────────────────────────────────────
  const [availableSizes, setAvailableSizes] = useState([]);
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [sizeList, setSizeList] = useState([]);

  // NOTE: the baseline is captured inside loadRecord() from the freshly-loaded values, NOT in an
  // effect. An effect gated on `!loadingRecord` fires on the very first render (loadingRecord
  // starts false and productType is already set from the URL), snapshotting the BLANK form — so
  // the guard never matched and every save looked like a change.

  useEffect(() => {
    if (formData.productType === "SIZEGROUP") {
      api
        .get("/sizes")
        .then((res) => setAvailableSizes(res.data?.data || []))
        .catch(() => {});
    }
  }, [formData.productType]);

  const handleAddSize = () => {
    if (!selectedSizeId) return;
    const size = availableSizes.find((s) => String(s.id) === String(selectedSizeId));
    if (!size) return;
    if (sizeList.some((s) => s.id === size.id)) return;
    setSizeList((prev) => [...prev, size]);
    setSelectedSizeId("");
  };

  const handleRemoveSize = (id) => {
    setSizeList((prev) => prev.filter((s) => s.id !== id));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "productType") {
      setFormData(createInitialFormData(value));
      setSelectedSizeId("");
      setSizeList([]);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!formData.productType) {
      toast.warning("Please select a Product Type");
      return;
    }
    const nameVal = (formData.name || "").trim();
    if (!nameVal) {
      toast.warning("Name is required");
      return;
    }
    if (editingId && initialFormRef.current
        && normalizeFormSignature({ f: formData, s: sizeList }) === initialFormRef.current) {
      toast.info("No changes detected.");
      return;
    }
    if (savingRef.current) return; // a save is already in flight — ignore repeated clicks

    const fd  = formData;
    const str = (v) => (v || "").trim() || undefined;
    const num = (v) => (v !== "" && v != null ? parseInt(v) : undefined);
    const boo = (v) => !!v;

    savingRef.current = true;
    setSaving(true);
    try {
      const isEdit = !!editingId;
      const save = (url, payload) => (isEdit ? api.put(url, payload) : api.post(url, payload));

      // ─── SIZE ─────────────────────────────────────────────────────────────
      if (fd.productType === "SIZE") {
        const payload = {
          size_name:     nameVal,
          code:          str(fd.code),
          measurement:   str(fd.measurement),
          age_set:       fd.ageSet   || undefined,
          uom:           fd.UOM     || undefined,
          sort_order:    num(fd.sortOrder),
          is_combo_size: boo(fd.IsComboSize),
          is_meter_size: boo(fd.IsMeterSize),
          is_variant:    boo(fd.isVariant),
          is_active:     true,
        };
        await save(isEdit ? `/sizes/${editingId}` : "/sizes", payload);
        toast.success(isEdit ? "Size updated!" : "Size saved!");
        if (isEdit) {
          navigate("/masters/product-attributes");
          return;
        }
        setFormData(createInitialFormData("SIZE"));
        setSelectedSizeId("");
        setSizeList([]);
        return;
      }

      // ─── SIZEGROUP ────────────────────────────────────────────────────────
      if (fd.productType === "SIZEGROUP") {
        const payload = {
          group_name:        nameVal,
          code:              str(fd.code),
          sort_order:        num(fd.sortOrder),
          enable_size_ratio: boo(fd.enableSizeRatio),
          size_ids:          sizeList.map((s) => s.id),
        };
        await save(isEdit ? `/size-groups/${editingId}` : "/size-groups", payload);
        toast.success(isEdit ? "Size Group updated!" : "Size Group saved!");
        if (isEdit) {
          navigate("/masters/product-attributes");
          return;
        }
        setFormData(createInitialFormData("SIZEGROUP"));
        setSelectedSizeId("");
        setSizeList([]);
        return;
      }

      // ─── MARKER ───────────────────────────────────────────────────────────
      if (fd.productType === "MARKER") {
        const payload = {
          name:       nameVal,
          code:       str(fd.code),
          sort_order: num(fd.displayOrder),
          is_active:  true,
          extra_data: {
            incentive_value:          fd.incentiveValue      || null,
            gift_coupon_valid:         fd.giftCouponValid     || null,
            gift_coupon_expiry:        fd.giftCouponExpiry    || null,
            bill_value_above:          fd.billValueAbove      || null,
            gift_voucher_percentage:   fd.giftVoucherPercentage || null,
            gift_voucher_value:        fd.giftVoucherValue    || null,
            coupon_valid_after_days:   fd.couponValidAfterDays || null,
            coupon_expiry_days:        fd.couponExpiryDays    || null,
            online_stock:              boo(fd.onlineStock),
            damaged_goods:             boo(fd.damagedGoods),
            gift_coupon_marker:        boo(fd.giftCouponMarker),
            gift_marker:               boo(fd.giftMarker),
          },
        };
        await save(
          isEdit ? `/attributes/marker/${editingId}` : "/attributes/marker",
          payload
        );
        toast.success(isEdit ? "Marker updated!" : "Marker saved!");
        if (isEdit) {
          navigate("/masters/product-attributes");
          return;
        }
        setFormData(createInitialFormData("MARKER"));
        setSelectedSizeId("");
        setSizeList([]);
        return;
      }

      // ─── PRICETAGS ────────────────────────────────────────────────────────
      if (fd.productType === "PRICETAGS") {
        const payload = {
          name:       nameVal,
          code:       str(fd.code),
          sort_order: num(fd.displayOrder),
          is_active:  true,
          extra_data: {
            location_price: boo(fd.LocationPrice),
          },
        };
        await save(
          isEdit ? `/attributes/pricetags/${editingId}` : "/attributes/pricetags",
          payload
        );
        toast.success(isEdit ? "Price Tag updated!" : "Price Tag saved!");
        if (isEdit) {
          navigate("/masters/product-attributes");
          return;
        }
        setFormData(createInitialFormData("PRICETAGS"));
        setSelectedSizeId("");
        setSizeList([]);
        return;
      }

      // ─── DIVISION (Section) ───────────────────────────────────────────────
      if (fd.productType === "DIVISION") {
        const payload = {
          name:       nameVal,
          code:       str(fd.code),
          sort_order: num(fd.sortOrder),
          is_active:  true,
          extra_data: {
            deadstock_age: fd.deadstockAge || null,
            is_sales:      boo(fd.IsSales),
            costing:       boo(fd.Costing),
          },
        };
        await save(
          isEdit ? `/attributes/division/${editingId}` : "/attributes/division",
          payload
        );
        toast.success(isEdit ? "Division updated!" : "Division saved!");
        if (isEdit) {
          navigate("/masters/product-attributes");
          return;
        }
        setFormData(createInitialFormData("DIVISION"));
        setSelectedSizeId("");
        setSizeList([]);
        return;
      }

      // ─── All other generic types ──────────────────────────────────────────
      const extra_data = {};
      if (fd.description)  extra_data.description  = fd.description;
      if (fd.parentGroup)  extra_data.parent_group  = fd.parentGroup;
      if (fd.category)     extra_data.category      = fd.category;
      if (fd.ageSet)       extra_data.age_set        = fd.ageSet;

      const payload = {
        name:       nameVal,
        code:       str(fd.code),
        sort_order: num(fd.sortOrder),
        is_active:  true,
        ...(Object.keys(extra_data).length > 0 ? { extra_data } : {}),
      };
      const typePath = fd.productType.toLowerCase();
      await save(
        isEdit ? `/attributes/${typePath}/${editingId}` : `/attributes/${typePath}`,
        payload
      );
      toast.success(isEdit ? "Attribute updated!" : "Attribute saved!");
      if (isEdit) {
        navigate("/masters/product-attributes");
        return;
      }
      setFormData(createInitialFormData(fd.productType));
      setSelectedSizeId("");
      setSizeList([]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const navigate = useNavigate();

  const handleNew = () => {
    navigate(`/masters/product-attributes/new`);
  };

  // ─── Compute import config based on selected product type ───────────────────
  const currentAttrConfig = ATTR_IMPORT_CONFIGS[formData.productType];
  const importFieldConfig  = currentAttrConfig
    ? { aliases: currentAttrConfig.aliases, required: currentAttrConfig.required, boolFields: currentAttrConfig.boolFields }
    : GENERIC_ATTR_CONFIG;
  const importEndpoint = currentAttrConfig?.endpoint
    || (formData.productType ? `/attributes/${formData.productType.toLowerCase()}/bulk` : "");
  const importTransform = currentAttrConfig?.transform || GENERIC_ATTR_TRANSFORM;
  const selected = formData.productType;
  const renderDynamicFields = () => {
    switch (formData.productType) {
      case "MARKER":
        return (
          <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, display: "flex", flexDirection: "column", gap: 1 }}>
            {[
              "code",
              "name",
              "displayOrder",
              "incentiveValue",
              "giftCouponValid",
              "giftCouponExpiry",
              "billValueAbove",
              "giftVoucherPercentage",
              "giftVoucherValue",
              "couponValidAfterDays",
              "couponExpiryDays",
            ].map((field) => (
              <TextInput
                key={field}
                label={field}
                name={field}
                value={formData[field] || ""}
                onChange={handleChange}
              />
            ))}

            <CheckboxInput
              label="Online Stock"
              name="onlineStock"
              checked={formData.onlineStock}
              onChange={handleChange}
            />

            <CheckboxInput
              label="Damaged Goods"
              name="damagedGoods"
              checked={formData.damagedGoods}
              onChange={handleChange}
            />

            <CheckboxInput
              label="Gift Coupon Marker"
              name="giftCouponMarker"
              checked={formData.giftCouponMarker}
              onChange={handleChange}
            />

            <CheckboxInput
              label="Gift Marker"
              name="giftMarker"
              checked={formData.giftMarker}
              onChange={handleChange}
            />
          </Box>
        );

      // -----------------------------------
      // SIZE GROUP
      // -----------------------------------
      case "SIZEGROUP":
        return (
          <>
            <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, display: "flex", flexDirection: "column", gap: 1, borderLeft: 1, borderRight: 1, borderColor: "divider", px: 1.5 }}>
              <TextInput
                label="Code"
                name="code"
                value={formData.code}
                onChange={handleChange}
              />
              <TextInput
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
              <TextInput
                label="Sort Order"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={handleChange}
              />

              <CheckboxInput
                label="Enable Size Ratio"
                name="enableSizeRatio"
                checked={formData.enableSizeRatio}
                onChange={handleChange}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden" }}>
                {/* Header */}
                <Stack direction="row" sx={{ bgcolor: "action.hover", borderBottom: 1, borderColor: "divider", p: 1, fontSize: 10.5, fontWeight: 600, color: "text.secondary" }}>
                  <Box sx={{ flex: 1, px: 0.5 }}>Size</Box>
                  <Box sx={{ width: 40, px: 0.5, textAlign: "right" }}>Remove</Box>
                </Stack>

                {/* Input Row */}
                <Stack direction="row" sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", p: 1, gap: 1 }}>
                  <Box component="select" value={selectedSizeId} onChange={(e) => setSelectedSizeId(e.target.value)} sx={{ width: "100%", minWidth: 0, ...fieldBaseSx(false) }}>
                    <option value="">Select Size</option>
                    {availableSizes
                      .filter((s) => !sizeList.some((sl) => sl.id === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.size_name}
                        </option>
                      ))}
                  </Box>
                  <Button
                    type="button"
                    onClick={handleAddSize}
                    className="glass-btn glass-btn-primary"
                    startIcon={<PlusCircle size={12} />}
                  >
                    Add
                  </Button>
                </Stack>

                {/* Size rows */}
                <Box sx={{ fontSize: 10.5 }}>
                  {sizeList.length === 0 ? (
                    <Box sx={{ color: "text.disabled", fontStyle: "italic", p: 1.5, textAlign: "center" }}>No sizes added</Box>
                  ) : (
                    <Table sx={{ width: "100%" }} size="small">
                      <TableBody>
                        {sizeList.map((s) => (
                          <TableRow key={s.id} hover>
                            <TableCell>{s.size_name}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                type="button"
                                onClick={() => handleRemoveSize(s.id)}
                                size="small"
                                sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}
                              >
                                <Trash2 size={14} />
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
          </>
        );

      // -----------------------------------
      // SIZE
      // -----------------------------------
      case "SIZE":
        return (
          <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, display: "flex", flexDirection: "column", gap: 1 }}>
            <TextInput
              label="Code"
              name="code"
              value={formData.code}
              onChange={handleChange}
            />
            <TextInput
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            <TextInput
              label="Measurement"
              name="measurement"
              value={formData.measurement}
              onChange={handleChange}
            />

            <SelectInput
              label="Age Set"
              name="ageSet"
              value={formData.ageSet}
              onChange={handleChange}
              options={[
                { label: "KIDS", value: "KIDS" },
                { label: "ADULT", value: "ADULT" },
              ]}
            />

            <SelectInput
              label="UOM"
              name="UOM"
              value={formData.UOM}
              onChange={handleChange}
              options={[
                { label: "Piece", value: "Piece" },
                { label: "Meter", value: "Meter" },
                { label: "Gram", value: "Gram" },
                { label: "ML", value: "ML" },
                { label: "Litre", value: "Litre" },
              ]}
            />

            <TextInput
              label="Sort Order"
              name="sortOrder"
              value={formData.sortOrder}
              onChange={handleChange}
            />

            <CheckboxInput
              label="Is Combo Size"
              name="IsComboSize"
              checked={formData.IsComboSize}
              onChange={handleChange}
            />

            <CheckboxInput
              label="Is Meter Size"
              name="IsMeterSize"
              checked={formData.IsMeterSize}
              onChange={handleChange}
            />

            <CheckboxInput
              label="Is Variant"
              name="isVariant"
              checked={formData.isVariant}
              onChange={handleChange}
            />
          </Box>
        );

      // -----------------------------------
      // PRICE TAGS
      // -----------------------------------
      case "PRICETAGS":
        return (
          <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, display: "flex", flexDirection: "column", gap: 1 }}>
            <TextInput
              label="Code"
              name="code"
              value={formData.code}
              onChange={handleChange}
            />
            <TextInput
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            <TextInput
              label="Display Order"
              name="displayOrder"
              value={formData.displayOrder}
              onChange={handleChange}
            />

            <CheckboxInput
              label="Location Price"
              name="LocationPrice"
              checked={formData.LocationPrice}
              onChange={handleChange}
            />

            <Box sx={{ border: 1, borderColor: "divider", p: 1, fontSize: 10.5, bgcolor: "action.hover", borderRadius: "3.5px" }}>
              <Typography component="h4" sx={{ fontWeight: 600, mb: 0.5 }}>Pricing Rules</Typography>
              <Typography sx={{ color: "text.secondary" }}>Pricing rules grid here…</Typography>
            </Box>
          </Box>
        );

      // -----------------------------------
      // DIVISION
      // -----------------------------------
      case "DIVISION":
        return (
          <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, display: "flex", flexDirection: "column", gap: 1 }}>
            <TextInput
              label="Code"
              name="code"
              value={formData.code}
              onChange={handleChange}
            />
            <TextInput
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            <TextInput
              label="Deadstock Age (Days)"
              name="deadstockAge"
              value={formData.deadstockAge}
              onChange={handleChange}
            />
            <TextInput
              label="Sort Order"
              name="sortOrder"
              value={formData.sortOrder}
              onChange={handleChange}
            />

            <CheckboxInput
              label="Is Sales"
              name="IsSales"
              checked={formData.IsSales}
              onChange={handleChange}
            />

            <CheckboxInput
              label="Costing"
              name="Costing"
              checked={formData.Costing}
              onChange={handleChange}
            />
          </Box>
        );
      default:
        return (
          <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, display: "flex", flexDirection: "column", gap: 1 }}>
            {/* Name field — shown for every attribute */}
            <TextInput
              label="Name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
            />
            <TextInput
              label="Code"
              name="code"
              required
              value={formData.code}
              onChange={handleChange}
            />

            {/* PRODUCT GROUPS → Needs Parent */}
            {selected === "PRODUCTGROUPS" && (
              <SelectInput
                label="Parent Group"
                name="parentGroup"
                options={[
                  { label: "Group A", value: "A" },
                  { label: "Group B", value: "B" },
                ]}
                value={formData.parentGroup}
                onChange={handleChange}
              />
            )}

            {/* PRODUCT HIERARCHY → Needs Category */}
            {selected === "PRODUCTHIERARCHY" && (
              <SelectInput
                label="Category"
                name="category"
                options={[
                  { label: "Men", value: "men" },
                  { label: "Women", value: "women" },
                ]}
                value={formData.category}
                onChange={handleChange}
              />
            )}

            {/* AGESET → Only one field */}
            {selected === "AGESET" && (
              <TextInput
                label="Age Set"
                name="ageSet"
                value={formData.ageSet}
                onChange={handleChange}
              />
            )}

            {/* Attributes that require Sort Order */}
            {[
              "PATTERN",
              "STYLE",
              "TYPE",
              "COLOUR",
              "SLEEVE",
              "FIT",
              "UNITS",
              "AGESET",
              "BUYERSGROUP",
              "BARCODEID",
              "ITEMGROUPS",
              "SELLINGNAMES",
              "DAILYPRICEGROUP",
              "COREPRODUCTGROUP",
              "DUMPINGGROUP",
            ].includes(selected) && (
              <TextInput
                label="Sort Order"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={handleChange}
              />
            )}

            {/* MATERIAL → Needs Description */}
            {selected === "MATERIAL" && (
              <TextInput
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            )}
            {!formData.productType && (
              <Typography sx={{ fontSize: 12.25, color: "text.secondary", pt: 1.5 }}>
                Select an attribute type to view the required fields.
              </Typography>
            )}
          </Box>
        );
    }
  };

  return (
    <Box sx={{ minHeight: "70vh", bgcolor: "background.default", color: "text.primary" }}>
      {/* Header */}
      <PageHeader
        title={
          <Breadcrumbs
            items={[
              { label: "Master", onClick: () => navigate("/masters") },
              { label: "Product Attributes", onClick: () => navigate("/masters/product-attributes") },
              { label: editingId ? "Edit" : "Add New" },
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

            <Button
              onClick={handleSave}
              disabled={saving}
              className="glass-btn glass-btn-success"
              startIcon={<Save size={12} />}
              size="small"
            >
              {saving ? "Saving…" : "Save"}
            </Button>

            {formData.productType && (
              <>
                <Typography variant="body2" component="span" sx={{ color: "text.disabled" }}>|</Typography>
                <UploadImportButton
                  endpoint={importEndpoint}
                  fieldConfig={importFieldConfig}
                  transform={importTransform}
                  className="text-xs font-medium"
                />
              </>
            )}
          </Stack>
        }
      />

      <Box sx={{ p: 1.5, pb: 8 }}>
        <Card variant="outlined" sx={{ p: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <SelectInput
              label="Product Type"
              name="productType"
              options={mockOptions}
              value={formData.productType}
              onChange={handleChange}
              disabled={!!editingId}
            />
          </Box>
          {loadingRecord ? (
            <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>Loading...</Box>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" }, gap: 1.5 }}>{renderDynamicFields()}</Box>
          )}
        </Card>
      </Box>
    </Box>
  );
};

export default AddAttributePage;
