import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CheckboxInput,
  SelectInput,
  TextInput,
} from "../../components/CustomInputs";
import api from "../../api/axios";
import { normalizeFormSignature } from "../../utils/formSignature";
import UploadImportButton from "../../components/UploadImportButton";

// Generic import config — works for all configuration types.
// Code, Name, Sort Order are always mapped; all other file columns
// that aren’t matched become extra_data keys on the backend.
const CFG_IMPORT_CONFIG = {
  aliases: {
    code: "code", name: "name",
    sortorder: "sortOrder", sort_order: "sortOrder", order: "sortOrder",
  },
  required: ["name"],
  boolFields: [],
};
const CFG_IMPORT_TRANSFORM = (r) => ({
  name:       String(r.name).trim(),
  code:       r.code || null,
  sort_order: r.sortOrder ? parseInt(r.sortOrder) : 0,
});

// ─── Local helpers ────────────────────────────────────────────────────────────
const TextareaInput = ({ label, name, required = false, value, onChange, rows = 3 }) => (
  <div className="flex items-start">
    <label className="w-2/5 text-xs font-medium text-gray-700 dark:text-gray-300 text-right pr-3 pt-1">
      {required && <span className="text-red-500 mr-1">*</span>} {label}
    </label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);

// ─── Type → display label ─────────────────────────────────────────────────────
const TYPE_LABELS = {
  LOCATION: "LOCATION",
  COUNTER: "COUNTER",
  TAILORING_UNIT: "TAILORING UNIT",
  PRF_REASON: "PRF REASON",
  RETURN_REASON: "RETURN REASON",
  SALE_REASON: "SALE REASON",
  SEASONS: "SEASONS",
  PO_TYPE: "PO TYPE / BUDGET TYPE",
  SETTINGS: "SETTINGS",
  BANK: "BANK",
  SWIPPING_MACHINE: "SWIPPING MACHINE",
  CARD_TYPES: "CARD TYPES",
  COURIER_TYPE: "COURIER TYPE",
  SALE_AREA: "SALE AREA",
  DISCOUNT_REMARK: "DISCOUNT REMARK",
  AREA_GROUP_1: "AREA GROUP 1",
  AREA_GROUP_2: "AREA GROUP 2",
  PRIORITY: "PRIORITY",
  CITY: "CITY",
  DISTRICT: "DISTRICT",
  COUNTRY: "COUNTRY",
  AGENT_TYPE: "AGENT TYPE",
  STATE: "STATE",
  EXPENSES_TYPE: "EXPENSES TYPE",
  CUSTOMER_CATEGORY: "CUSTOMER CATEGORY",
  VENDOR: "VENDOR",
  OFFLINE_CLIENT: "OFFLINE CLIENT",
  AUTO_NUMBER: "AUTO NUMBER",
  LOAN_PROVIDER: "LOAN PROVIDER",
  DELIVERY_LOCATION: "DELIVERY LOCATION",
  ADDITIONAL_CHARGES: "ADDITIONAL CHARGES",
  UPI_PROVIDER: "UPI PROVIDER",
  JOB_WORK_CHARGE: "JOB WORK CHARGE",
  TAILORING_CHARGE: "TAILORING CHARGE",
  BUNDLE_RACK: "BUNDLE RACK",
  DOCUMENT_IMPORT: "DOCUMENT IMPORT",
  SUPPLIER_GROUP: "SUPPLIER GROUP",
  VOUCHER_TYPE: "VOUCHER TYPE",
  BUYER_GROUP: "BUYER GROUP",
  CUSTOMER_GROUP: "CUSTOMER GROUP",
  LEAD_EVENT: "LEAD EVENT",
  LEAD_STATUS: "LEAD STATUS",
  LEAD_PRIORITY: "LEAD PRIORITY",
  ASSET_TYPES: "ASSET TYPES",
  FOOD_COUNTER: "FOOD COUNTER",
  DOCUMENT_TYPE: "DOCUMENT TYPE",
  CRM_SOURCES: "CRM SOURCES",
  CRM_VISITING: "CRM VISITING",
  PURCHASE_TYPE: "PURCHASE TYPE",
  ADDRESS_TYPE: "ADDRESS TYPE",
  TDS_GROUP: "TDS GROUP",
};

// Types that only need Code / Name / Sort Order
const SIMPLE_TYPES = new Set([
  "TAILORING_UNIT", "PRF_REASON", "RETURN_REASON", "SALE_REASON", "SETTINGS",
  "CARD_TYPES", "SALE_AREA", "DISCOUNT_REMARK", "AREA_GROUP_1", "AREA_GROUP_2",
  "PRIORITY", "CITY", "DISTRICT", "STATE", "EXPENSES_TYPE", "VENDOR", "AUTO_NUMBER",
  "COUNTRY",
  "LOAN_PROVIDER", "BUNDLE_RACK", "DOCUMENT_IMPORT", "SUPPLIER_GROUP", "VOUCHER_TYPE",
  "BUYER_GROUP", "CUSTOMER_GROUP", "LEAD_EVENT", "LEAD_STATUS", "LEAD_PRIORITY",
  "DOCUMENT_TYPE", "CRM_SOURCES", "CRM_VISITING", "ADDRESS_TYPE", "TDS_GROUP",
]);

// ─── Build extra_data payload per type ───────────────────────────────────────
function buildExtraData(typeKey, fd) {
  switch (typeKey) {
    case "LOCATION":
      return {
        company_id: fd.company_id || null,
        address: fd.address || null,
        city_id: fd.city_id || null,
        state_id: fd.state_id || null,
        pincode: fd.pincode || null,
        is_warehouse: !!fd.is_warehouse,
        single_window_settlement: !!fd.single_window_settlement,
        franchise_margin: fd.franchise_margin || null,
        office_marketing: !!fd.office_marketing,
        gst_no: fd.gst_no || null,
        email: fd.email || null,
        contact_no: fd.contact_no || null,
        default_vendor_id: fd.default_vendor_id || null,
        default_customer_id: fd.default_customer_id || null,
        tally_server: fd.tally_server || null,
        tally_company: fd.tally_company || null,
      };
    case "COUNTER":
      return {
        location_id: fd.location_id || null,
        floor: fd.floor || null,
        dot_matrix_print: !!fd.dot_matrix_print,
        single_window_settlement: !!fd.single_window_settlement,
        ecommerce: !!fd.ecommerce,
      };
    case "SEASONS":
      return {
        date_from: fd.date_from || null,
        date_to: fd.date_to || null,
      };
    case "PO_TYPE":
      return {
        is_purchase_agreement: !!fd.is_purchase_agreement,
        is_purchase_budget: !!fd.is_purchase_budget,
      };
    case "BANK":
      return {
        location_id: fd.location_id || null,
        account_name: fd.account_name || null,
        account_no: fd.account_no || null,
        bank_branch: fd.bank_branch || null,
        bank_ifsc: fd.bank_ifsc || null,
      };
    case "SWIPPING_MACHINE":
    case "UPI_PROVIDER":
      return {
        location_id: fd.location_id || null,
        bank_id: fd.bank_id || null,
      };
    case "COURIER_TYPE":
      return {
        inward: !!fd.inward, outward: !!fd.outward, supplier: !!fd.supplier,
        agent: !!fd.agent, b2b_customer: !!fd.b2b_customer,
        general_customer: !!fd.general_customer, collect_name: !!fd.collect_name,
        courier_address: !!fd.courier_address, awb_ewb: !!fd.awb_ewb,
        details: !!fd.details, invoice_nos: !!fd.invoice_nos,
        bill_copy: !!fd.bill_copy,
        payment: !!fd.payment, payment_text: fd.payment ? (fd.payment_text || null) : null,
        pod: !!fd.pod,
        rate: !!fd.rate, rate_text: fd.rate ? (fd.rate_text || null) : null,
        weight: !!fd.weight, weight_text: fd.weight ? (fd.weight_text || null) : null,
      };
    case "CUSTOMER_CATEGORY":
      return {
        margin_based_pricing: !!fd.margin_based_pricing,
        reward_point: fd.margin_based_pricing ? null : (fd.reward_point || null),
        bill_discount: fd.margin_based_pricing ? null : (fd.bill_discount || null),
        include_discount: fd.margin_based_pricing ? false : !!fd.include_discount,
        otp_for_discounts: fd.margin_based_pricing ? false : !!fd.otp_for_discounts,
      };
    case "OFFLINE_CLIENT":
      return {
        location_id: fd.location_id || null,
        license_key: fd.license_key || null,
      };
    case "DELIVERY_LOCATION":
      return {
        company_id: fd.company_id || null,
        address: fd.address || null,
        city_id: fd.city_id || null,
        state_id: fd.state_id || null,
        pincode: fd.pincode || null,
        gst_no: fd.gst_no || null,
        email: fd.email || null,
        contact_no: fd.contact_no || null,
      };
    case "ADDITIONAL_CHARGES":
      return {
        charge_type: fd.charge_type || null,
        on_basic_cost_percent: fd.on_basic_cost_percent || null,
        include_charges: !!fd.include_charges,
        auto_tax: !!fd.auto_tax,
        tax_component: !!fd.tax_component,
        hsn: fd.hsn || null,
        tax_id: fd.tax_id || null,
      };
    case "JOB_WORK_CHARGE":
    case "TAILORING_CHARGE":
      return {
        charges: fd.charges || null,
        tax_id: fd.tax_id || null,
        additional_charge_id: fd.additional_charge_id || null,
        measurement: fd.measurement || null,
      };
    case "ASSET_TYPES":
      return {
        registration: !!fd.registration, insurance: !!fd.insurance,
        amc: !!fd.amc, barcode_tag: !!fd.barcode_tag,
        periodic_maintenance: !!fd.periodic_maintenance,
        expirable: !!fd.expirable, multiple_qty: !!fd.multiple_qty,
        active_qty: !!fd.active_qty,
      };
    case "FOOD_COUNTER":
      return {
        location_id: fd.location_id || null,
        product_group_id: fd.product_group_id || null,
      };
    case "PURCHASE_TYPE":
      return {
        gst_input: !!fd.gst_input,
        gst_rcm: !!fd.gst_rcm,
        itemwise_rate: !!fd.itemwise_rate,
      };
    default:
      return null; // simple types
  }
}

// ─── Column wrapper — defined at module level so React never remounts it ─────
const C = ({ children }) => <div className="col-span-12 lg:col-span-4 space-y-1.5">{children}</div>;

// ─── Main Component ───────────────────────────────────────────────────────────
const ConfigurationForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeKey = (searchParams.get("type") || "").toUpperCase();
  const recordId = searchParams.get("id") || null;
  const isEdit = !!recordId;
  const initialFormRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard

  const [formData, setFormData] = useState({
    code: "", name: "", sort_order: "0",
    // LOCATION / DELIVERY_LOCATION
    company_id: "", address: "", city_id: "", state_id: "", pincode: "",
    is_warehouse: false, single_window_settlement: false,
    franchise_margin: "", office_marketing: false,
    gst_no: "", email: "", contact_no: "",
    default_vendor_id: "", default_customer_id: "",
    tally_server: "", tally_company: "",
    // COUNTER
    location_id: "", floor: "", dot_matrix_print: false, ecommerce: false,
    // SEASONS
    date_from: "", date_to: "",
    // PO_TYPE
    is_purchase_agreement: false, is_purchase_budget: false,
    // BANK
    account_name: "", account_no: "", bank_branch: "", bank_ifsc: "",
    // SWIPPING_MACHINE / UPI_PROVIDER
    bank_id: "",
    // COURIER_TYPE
    inward: false, outward: false, supplier: false, agent: false,
    b2b_customer: false, general_customer: false, collect_name: false,
    courier_address: false, awb_ewb: false, details: false, invoice_nos: false,
    bill_copy: false, payment: false, payment_text: "", pod: false,
    rate: false, rate_text: "", weight: false, weight_text: "",
    // CUSTOMER_CATEGORY
    margin_based_pricing: false, reward_point: "", bill_discount: "",
    include_discount: false, otp_for_discounts: false,
    // OFFLINE_CLIENT
    license_key: "",
    // ADDITIONAL_CHARGES
    charge_type: "", on_basic_cost_percent: "", include_charges: false,
    auto_tax: false, tax_component: false, hsn: "", tax_id: "",
    // JOB_WORK_CHARGE / TAILORING_CHARGE
    charges: "", additional_charge_id: "", measurement: "",
    // ASSET_TYPES
    registration: false, insurance: false, amc: false, barcode_tag: false,
    periodic_maintenance: false, expirable: false, multiple_qty: false, active_qty: false,
    // FOOD_COUNTER
    product_group_id: "",
    // PURCHASE_TYPE
    gst_input: false, gst_rcm: false, itemwise_rate: false,
  });

  // ─── Dropdown data ─────────────────────────────────────────────────────────
  const [dropdowns, setDropdowns] = useState({
    locations: [], banks: [], cities: [], states: [], vendors: [],
    taxes: [], additionalCharges: [], productGroups: [],
  });

  useEffect(() => {
    const needs = {
      locations: ["COUNTER", "BANK", "SWIPPING_MACHINE", "UPI_PROVIDER", "OFFLINE_CLIENT", "FOOD_COUNTER"],
      banks: ["SWIPPING_MACHINE", "UPI_PROVIDER"],
      cities: ["LOCATION", "DELIVERY_LOCATION"],
      states: ["LOCATION", "DELIVERY_LOCATION"],
      vendors: ["LOCATION"],
      taxes: ["ADDITIONAL_CHARGES", "JOB_WORK_CHARGE", "TAILORING_CHARGE"],
      additionalCharges: ["JOB_WORK_CHARGE", "TAILORING_CHARGE"],
      productGroups: ["FOOD_COUNTER"],
    };

    const fetch = (key, endpoint, mapper) => {
      if (!needs[key].includes(typeKey)) return Promise.resolve([]);
      return api.get(endpoint).then(r => (r.data?.data || []).map(mapper)).catch(() => []);
    };

    Promise.all([
      fetch("locations", "/configurations/location",    r => ({ value: String(r.id), label: r.name })),
      fetch("banks",     "/configurations/bank",         r => ({ value: String(r.id), label: r.name })),
      fetch("cities",    "/configurations/city",         r => ({ value: String(r.id), label: r.name })),
      fetch("states",    "/configurations/state",        r => ({ value: String(r.id), label: r.name })),
      fetch("vendors",   "/configurations/vendor",       r => ({ value: String(r.id), label: r.name })),
      fetch("taxes",     "/taxes",                       r => ({ value: String(r.id), label: r.tax_name || r.name })),
      fetch("additionalCharges", "/configurations/additional_charges", r => ({ value: String(r.id), label: r.name })),
      fetch("productGroups",     "/attributes/productgroups",          r => ({ value: String(r.id), label: r.name })),
    ]).then(([locations, banks, cities, states, vendors, taxes, additionalCharges, productGroups]) => {
      setDropdowns({ locations, banks, cities, states, vendors, taxes, additionalCharges, productGroups });
    });
  }, [typeKey]);

  // ─── Load existing record for edit ─────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !typeKey) return;
    api.get(`/configurations/${typeKey.toLowerCase()}/${recordId}`)
      .then(res => {
        const rec = res.data?.data || {};
        setFormData(prev => {
          const next = {
            ...prev,
            code: rec.code || "",
            name: rec.name || "",
            sort_order: String(rec.sort_order ?? 0),
            ...(rec.extra_data || {}),
          };
          // Baseline for the "No changes detected" guard on save.
          initialFormRef.current = normalizeFormSignature(next);
          return next;
        });
      })
      .catch(() => toast.error("Failed to load record"));
  }, [isEdit, typeKey, recordId]);

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: inputType === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!typeKey) { toast.warning("No type selected"); return; }
    if (!formData.name.trim()) { toast.warning("Name is required"); return; }
    if (isEdit && initialFormRef.current && normalizeFormSignature(formData) === initialFormRef.current) {
      toast.info("No changes detected.");
      return;
    }
    if (savingRef.current) return; // a save is already in flight — ignore repeated clicks

    const payload = {
      code: formData.code.trim() || null,
      name: formData.name.trim(),
      sort_order: parseInt(formData.sort_order) || 0,
      extra_data: buildExtraData(typeKey, formData),
    };

    savingRef.current = true;
    setSaving(true);
    try {
      const apiType = typeKey.toLowerCase();
      if (isEdit) {
        await api.put(`/configurations/${apiType}/${recordId}`, payload);
        initialFormRef.current = normalizeFormSignature(formData);
        toast.success("Updated successfully!");
      } else {
        await api.post(`/configurations/${apiType}`, payload);
        toast.success("Saved successfully!");
        setFormData(prev => ({ ...prev, code: "", name: "", sort_order: "0" }));
        initialFormRef.current = null;
      }
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const typeLabel = TYPE_LABELS[typeKey] || typeKey;
  const floorOptions = [{ value: "B2B", label: "B2B" }, { value: "B2C", label: "B2C" }];
  const chargeTypeOptions = [
    { value: "FRIGHT", label: "FRIGHT" },
    { value: "COURIER", label: "COURIER" },
    { value: "PACKING", label: "PACKING" },
    { value: "BOX", label: "BOX" },
    { value: "OTHER", label: "OTHER" },
  ];

  // ─── Type-specific field renderer ─────────────────────────────────────────
  const renderTypeFields = () => {
    const { locations, banks, cities, states, vendors, taxes, additionalCharges, productGroups } = dropdowns;

    switch (typeKey) {
      // ——— LOCATION ———————————————————————————————————————
      case "LOCATION":
        return (
          <>
            <C>
              <SelectInput label="Company"         name="company_id"            options={[]} value={formData.company_id} onChange={handleChange} />
              <TextInput   label="Address"          name="address"               value={formData.address}          onChange={handleChange} />
              <SelectInput label="City"             name="city_id"               options={cities}   value={formData.city_id}           onChange={handleChange} />
              <SelectInput label="State"            name="state_id"              options={states}   value={formData.state_id}          onChange={handleChange} />
              <TextInput   label="Pincode"          name="pincode"               value={formData.pincode}          onChange={handleChange} />
              <CheckboxInput label="Is WareHouse"  name="is_warehouse"          checked={formData.is_warehouse}   onChange={handleChange} />
            </C>
            <C>
              <CheckboxInput label="Single Window Settlement" name="single_window_settlement" checked={formData.single_window_settlement} onChange={handleChange} />
              <TextInput   label="Franchise Margin" name="franchise_margin"      value={formData.franchise_margin} onChange={handleChange} />
              <CheckboxInput label="Office/Marketing" name="office_marketing"   checked={formData.office_marketing} onChange={handleChange} />
              <TextInput   label="GST No"           name="gst_no"               value={formData.gst_no}           onChange={handleChange} />
              <TextInput   label="Email"            name="email"     type="email" value={formData.email}           onChange={handleChange} />
              <TextInput   label="Contact No"       name="contact_no"            value={formData.contact_no}       onChange={handleChange} />
            </C>
            <C>
              <SelectInput label="Default Vendor"   name="default_vendor_id"     options={vendors}  value={formData.default_vendor_id} onChange={handleChange} />
              <SelectInput label="Default Customer" name="default_customer_id"   options={[]}       value={formData.default_customer_id} onChange={handleChange} />
              <TextInput   label="Tally Server"     name="tally_server"          value={formData.tally_server}    onChange={handleChange} />
              <TextInput   label="Tally Company"    name="tally_company"         value={formData.tally_company}   onChange={handleChange} />
            </C>
          </>
        );

      // ——— COUNTER ——————————————————————————————————————————
      case "COUNTER":
        return (
          <C>
            <SelectInput   label="Location"               name="location_id"            options={locations}   value={formData.location_id}             onChange={handleChange} />
            <SelectInput   label="Floor"                  name="floor"                  options={floorOptions} value={formData.floor}                   onChange={handleChange} />
            <CheckboxInput label="Dot Matrix Print"       name="dot_matrix_print"       checked={formData.dot_matrix_print}       onChange={handleChange} />
            <CheckboxInput label="Single Window Settlement" name="single_window_settlement" checked={formData.single_window_settlement} onChange={handleChange} />
            <CheckboxInput label="E-Commerce"             name="ecommerce"              checked={formData.ecommerce}              onChange={handleChange} />
          </C>
        );

      // ——— SEASONS ——————————————————————————————————————————
      case "SEASONS":
        return (
          <C>
            <TextInput label="Date From" name="date_from" type="date" value={formData.date_from} onChange={handleChange} />
            <TextInput label="Date To"   name="date_to"   type="date" value={formData.date_to}   onChange={handleChange} />
          </C>
        );

      // ——— PO TYPE / BUDGET TYPE ————————————————————————————
      case "PO_TYPE":
        return (
          <C>
            <CheckboxInput label="Is Purchase Agreement" name="is_purchase_agreement" checked={formData.is_purchase_agreement} onChange={handleChange} />
            <CheckboxInput label="Is Purchase Budget"    name="is_purchase_budget"    checked={formData.is_purchase_budget}    onChange={handleChange} />
          </C>
        );

      // ——— BANK ————————————————————————————————————————————
      case "BANK":
        return (
          <C>
            <SelectInput label="Location"     name="location_id"  options={locations} value={formData.location_id}  onChange={handleChange} />
            <TextInput   label="Account Name" name="account_name" value={formData.account_name} onChange={handleChange} />
            <TextInput   label="Account No"   name="account_no"   value={formData.account_no}   onChange={handleChange} />
            <TextInput   label="Bank Branch"  name="bank_branch"  value={formData.bank_branch}  onChange={handleChange} />
            <TextInput   label="Bank IFSC"    name="bank_ifsc"    value={formData.bank_ifsc}    onChange={handleChange} />
          </C>
        );

      // ——— SWIPPING MACHINE & UPI PROVIDER —————————————————
      case "SWIPPING_MACHINE":
      case "UPI_PROVIDER":
        return (
          <C>
            <SelectInput label="Location" name="location_id" options={locations} value={formData.location_id} onChange={handleChange} />
            <SelectInput label="Bank"     name="bank_id"     options={banks}     value={formData.bank_id}     onChange={handleChange} />
          </C>
        );

      // ——— COURIER TYPE ————————————————————————————————————
      case "COURIER_TYPE":
        return (
          <>
            <C>
              <CheckboxInput label="Inward"         name="inward"           checked={formData.inward}           onChange={handleChange} />
              <CheckboxInput label="Outward"        name="outward"          checked={formData.outward}          onChange={handleChange} />
              <CheckboxInput label="Supplier"       name="supplier"         checked={formData.supplier}         onChange={handleChange} />
              <CheckboxInput label="Agent"          name="agent"            checked={formData.agent}            onChange={handleChange} />
              <CheckboxInput label="B2B Customer"   name="b2b_customer"     checked={formData.b2b_customer}     onChange={handleChange} />
              <CheckboxInput label="General Customer" name="general_customer" checked={formData.general_customer} onChange={handleChange} />
            </C>
            <C>
              <CheckboxInput label="Collect Name"   name="collect_name"     checked={formData.collect_name}     onChange={handleChange} />
              <CheckboxInput label="Address"        name="courier_address"  checked={formData.courier_address}  onChange={handleChange} />
              <CheckboxInput label="AWB/EWB"        name="awb_ewb"          checked={formData.awb_ewb}          onChange={handleChange} />
              <CheckboxInput label="Details"        name="details"          checked={formData.details}          onChange={handleChange} />
              <CheckboxInput label="Invoice No's"   name="invoice_nos"      checked={formData.invoice_nos}      onChange={handleChange} />
              <CheckboxInput label="Bill Copy"      name="bill_copy"        checked={formData.bill_copy}        onChange={handleChange} />
              <CheckboxInput label="POD"            name="pod"              checked={formData.pod}              onChange={handleChange} />
            </C>
            <C>
              <CheckboxInput label="Payment"        name="payment"          checked={formData.payment}          onChange={handleChange} />
              {formData.payment && <TextInput label="Payment Field" name="payment_text" value={formData.payment_text} onChange={handleChange} />}
              <CheckboxInput label="Rate"           name="rate"             checked={formData.rate}             onChange={handleChange} />
              {formData.rate && <TextInput label="Rate Field"    name="rate_text"    value={formData.rate_text}    onChange={handleChange} />}
              <CheckboxInput label="Weight"         name="weight"           checked={formData.weight}           onChange={handleChange} />
              {formData.weight && <TextInput label="Weight Field"  name="weight_text"  value={formData.weight_text}  onChange={handleChange} />}
            </C>
          </>
        );

      // ——— CUSTOMER CATEGORY ———————————————————————————————
      case "CUSTOMER_CATEGORY":
        return (
          <C>
            <CheckboxInput label="Margin Based Pricing" name="margin_based_pricing" checked={formData.margin_based_pricing} onChange={handleChange} />
            {!formData.margin_based_pricing && (
              <>
                <TextInput   label="Reward Point (₹)"  name="reward_point"      value={formData.reward_point}    onChange={handleChange} />
                <TextInput   label="Bill Discount (%)"  name="bill_discount"     value={formData.bill_discount}   onChange={handleChange} />
                <CheckboxInput label="Include Discount" name="include_discount"  checked={formData.include_discount}  onChange={handleChange} />
                <CheckboxInput label="OTP for Discounts" name="otp_for_discounts" checked={formData.otp_for_discounts} onChange={handleChange} />
              </>
            )}
          </C>
        );

      // ——— OFFLINE CLIENT ——————————————————————————————————
      case "OFFLINE_CLIENT":
        return (
          <C>
            <SelectInput label="Location"    name="location_id" options={locations} value={formData.location_id} onChange={handleChange} />
            <TextInput   label="License Key" name="license_key"                     value={formData.license_key} onChange={handleChange} />
          </C>
        );

      // ——— DELIVERY LOCATION ———————————————————————————————
      case "DELIVERY_LOCATION":
        return (
          <>
            <C>
              <SelectInput label="Company"    name="company_id" options={[]}     value={formData.company_id}  onChange={handleChange} />
              <TextInput   label="Address"    name="address"                     value={formData.address}     onChange={handleChange} />
              <SelectInput label="City"       name="city_id"    options={cities} value={formData.city_id}     onChange={handleChange} />
              <SelectInput label="State"      name="state_id"   options={states} value={formData.state_id}    onChange={handleChange} />
              <TextInput   label="Pincode"    name="pincode"                     value={formData.pincode}     onChange={handleChange} />
            </C>
            <C>
              <TextInput label="GST No"     name="gst_no"     value={formData.gst_no}     onChange={handleChange} />
              <TextInput label="Email"      name="email"      value={formData.email}      onChange={handleChange} type="email" />
              <TextInput label="Contact No" name="contact_no" value={formData.contact_no} onChange={handleChange} />
            </C>
          </>
        );

      // ——— ADDITIONAL CHARGES —————————————————————————————
      case "ADDITIONAL_CHARGES":
        return (
          <>
            <C>
              <SelectInput label="Charge Type"         name="charge_type"           options={chargeTypeOptions} value={formData.charge_type}          onChange={handleChange} />
              <TextInput   label="On Basic Cost (%)"   name="on_basic_cost_percent"                            value={formData.on_basic_cost_percent} onChange={handleChange} />
              <CheckboxInput label="Include Charges"   name="include_charges"       checked={formData.include_charges}   onChange={handleChange} />
              <CheckboxInput label="Auto Tax"          name="auto_tax"              checked={formData.auto_tax}          onChange={handleChange} />
            </C>
            <C>
              <CheckboxInput label="Tax Component"     name="tax_component"         checked={formData.tax_component}     onChange={handleChange} />
              <TextInput     label="HSN"               name="hsn"                                                        value={formData.hsn}          onChange={handleChange} />
              <SelectInput   label="Tax"               name="tax_id"                options={taxes}                      value={formData.tax_id}       onChange={handleChange} />
            </C>
          </>
        );

      // ——— JOB WORK CHARGE & TAILORING CHARGE ——————————————
      case "JOB_WORK_CHARGE":
      case "TAILORING_CHARGE":
        return (
          <>
            <C>
              <TextInput   label="Charges"           name="charges"              value={formData.charges}             onChange={handleChange} />
              <SelectInput label="Tax"               name="tax_id"               options={taxes}               value={formData.tax_id}              onChange={handleChange} />
              <SelectInput label="Additional Charge" name="additional_charge_id" options={additionalCharges}   value={formData.additional_charge_id} onChange={handleChange} />
            </C>
            <C>
              <TextareaInput label="Measurement" name="measurement" value={formData.measurement} onChange={handleChange} rows={4} />
            </C>
          </>
        );

      // ——— ASSET TYPES —————————————————————————————————————
      case "ASSET_TYPES":
        return (
          <>
            <C>
              <CheckboxInput label="Registration"         name="registration"         checked={formData.registration}         onChange={handleChange} />
              <CheckboxInput label="Insurance"            name="insurance"            checked={formData.insurance}            onChange={handleChange} />
              <CheckboxInput label="AMC"                  name="amc"                  checked={formData.amc}                  onChange={handleChange} />
              <CheckboxInput label="Barcode/Tag"          name="barcode_tag"          checked={formData.barcode_tag}          onChange={handleChange} />
            </C>
            <C>
              <CheckboxInput label="Periodic Maintenance" name="periodic_maintenance" checked={formData.periodic_maintenance} onChange={handleChange} />
              <CheckboxInput label="Expirable"            name="expirable"            checked={formData.expirable}            onChange={handleChange} />
              <CheckboxInput label="Multiple Qty"         name="multiple_qty"         checked={formData.multiple_qty}         onChange={handleChange} />
              <CheckboxInput label="Active Qty"           name="active_qty"           checked={formData.active_qty}           onChange={handleChange} />
            </C>
          </>
        );

      // ——— FOOD COUNTER ————————————————————————————————————
      case "FOOD_COUNTER":
        return (
          <C>
            <SelectInput label="Location"      name="location_id"    options={locations}    value={formData.location_id}    onChange={handleChange} />
            <SelectInput label="Product Group" name="product_group_id" options={productGroups} value={formData.product_group_id} onChange={handleChange} />
          </C>
        );

      // ——— PURCHASE TYPE ————————————————————————————————————
      case "PURCHASE_TYPE":
        return (
          <C>
            <CheckboxInput label="GST Input"     name="gst_input"     checked={formData.gst_input}     onChange={handleChange} />
            <CheckboxInput label="GST RCM"       name="gst_rcm"       checked={formData.gst_rcm}       onChange={handleChange} />
            <CheckboxInput label="Itemwise Rate" name="itemwise_rate" checked={formData.itemwise_rate} onChange={handleChange} />
          </C>
        );

      default:
        return null; // simple types — no extra fields
    }
  };

  if (!typeKey) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm">
        No configuration type selected. Please go back and select a type.
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => navigate(-1)}>
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
            <button
              type="button"
              onClick={() => navigate("/masters/configuration")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Configuration
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>{typeLabel}</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button
            onClick={handleSave}
            disabled={saving}
            className="glass-btn glass-btn-success flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-3 h-3 mr-1" /> {saving ? "Saving…" : "Save"}
          </button>
          {typeKey && (
            <>
              <span>|</span>
              <UploadImportButton
                endpoint={`/configurations/${typeKey.toLowerCase()}/bulk`}
                fieldConfig={CFG_IMPORT_CONFIG}
                transform={CFG_IMPORT_TRANSFORM}
                className="text-xs font-medium"
              />
            </>
          )}
        </div>
      </div>

      <div className="p-3 pb-16">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="grid grid-cols-12 gap-3">
            {/* ─── Common Fields ──────────────────────────── */}
            <div className="col-span-12 lg:col-span-4 space-y-1.5">
              <TextInput label="Type" name="type_display" value={typeLabel} onChange={() => {}} disabled />
              <TextInput label="Code" name="code" value={formData.code} onChange={handleChange} />
              <TextInput label="Name" name="name" required value={formData.name} onChange={handleChange} />
              <TextInput label="Sort Order" name="sort_order" value={formData.sort_order} onChange={handleChange} />
            </div>

            {/* ─── Type-specific Fields ────────────────────── */}
            {renderTypeFields()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationForm;
