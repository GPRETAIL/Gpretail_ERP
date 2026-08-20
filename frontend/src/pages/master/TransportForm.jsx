import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, PlusCircle, Save, Search, Trash2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { normalizeFormSignature } from "../../utils/formSignature";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";

/* ─── tiny inline helpers ─────────────────────────────────────────────────── */
const Label = ({ children, required }) => (
  <span className="w-2/5 text-xs font-medium text-gray-700 dark:text-gray-300 text-right pr-3 flex-shrink-0">
    {required && <span className="text-red-500 mr-1">*</span>}
    {children}
  </span>
);

const Field = ({ children }) => (
  <div className="flex items-center mb-2">{children}</div>
);

const Input = ({ ...props }) => (
  <input
    {...props}
    className={`flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 ${props.disabled ? "opacity-60 cursor-not-allowed" : ""} ${props.className || ""}`}
  />
);

const Select = ({ options = [], placeholder, ...props }) => (
  <select
    {...props}
    className={`flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 ${props.disabled ? "opacity-60 cursor-not-allowed" : ""} ${props.className || ""}`}
  >
    <option value="">{placeholder || `— select —`}</option>
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

/* ─── constants ────────────────────────────────────────────────────────────── */
const BUSINESS_MODES = [
  { value: "Lorry/Courier", label: "Lorry / Courier" },
  { value: "Courier", label: "Courier" },
  { value: "Lorry", label: "Lorry" },
  { value: "Charges", label: "Charges" },
  { value: "Other", label: "Other" },
];

const PAYMENT_MODES = [
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "Multiple Cheques", label: "Multiple Cheques" },
  { value: "NEFT", label: "NEFT" },
];

const EMPTY_RATE = { cityId: "", cityName: "", perKg: "", perBox: "", perBundle: "" };

const EMPTY_FORM = {
  companyId: "",
  businessMode: "",
  name: "",
  contactPerson: "",
  contactNo: "",
  emailId: "",
  address: "",
  cityId: "",
  stateId: "",
  pan: "",
  gst: "",
  bankId: "",
  branch: "",
  bankAccountName: "",
  ifsc: "",
  accountNo: "",
  price: "",
  taxId: "",
  vehicles: "",
  loadingPerBox: "",
  loadingPerBundle: "",
  allowedPaymentMode: "",
  rcm: false,
  isActive: true,
};

/* ─── component ────────────────────────────────────────────────────────────── */
const TransportForm = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isEdit = location.pathname.includes("/edit/");
  const isView = !!id && !isEdit;
  const isAdd = !id;
  const readOnly = isView;

  const [form, setForm] = useState(EMPTY_FORM);
  const [rates, setRates] = useState([]);
  const [rateRow, setRateRow] = useState(EMPTY_RATE);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard
  // Baseline snapshot (edit mode) so an unchanged save reports "No changes detected".
  const initialFormRef = useRef({ id: null, sig: null });

  /* dropdown options */
  const [cityOpts, setCityOpts] = useState([]);
  const [stateOpts, setStateOpts] = useState([]);
  const [bankOpts, setBankOpts] = useState([]);
  const [taxOpts, setTaxOpts] = useState([]);

  /* ── load dropdown data ── */
  useEffect(() => {
    const load = async () => {
      try {
        const [cities, states, banks, taxes] = await Promise.all([
          api.get("/configurations/city"),
          api.get("/configurations/state"),
          api.get("/configurations/bank"),
          api.get("/taxes"),
        ]);
        setCityOpts((cities.data?.data || []).map((c) => ({ value: String(c.id), label: c.name })));
        setStateOpts((states.data?.data || []).map((s) => ({ value: String(s.id), label: s.name })));
        setBankOpts((banks.data?.data || []).map((b) => ({ value: String(b.id), label: b.name })));
        setTaxOpts((taxes.data?.data || []).map((t) => ({ value: String(t.id), label: `${t.name} (${t.tax_percentage}%)` })));
      } catch {
        /* silently fail for dropdowns */
      }
    };
    load();
  }, []);

  /* ── load record for view/edit ── */
  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const res = await api.get(`/transports/${id}`);
        const d = res.data.data;
        const loadedForm = {
          businessMode: d.business_mode || "",
          name: d.name || "",
          contactPerson: d.contact_person || "",
          contactNo: d.contact_no || "",
          emailId: d.email_id || "",
          address: d.address || "",
          cityId: d.city_id ? String(d.city_id) : "",
          stateId: d.state_id ? String(d.state_id) : "",
          pan: d.pan || "",
          gst: d.gst || "",
          bankId: d.bank_id ? String(d.bank_id) : "",
          branch: d.branch || "",
          bankAccountName: d.bank_account_name || "",
          ifsc: d.ifsc || "",
          accountNo: d.account_no || "",
          price: d.price || "",
          taxId: d.tax_id ? String(d.tax_id) : "",
          vehicles: d.vehicles || "",
          loadingPerBox: d.loading_per_box || "",
          loadingPerBundle: d.loading_per_bundle || "",
          allowedPaymentMode: d.allowed_payment_mode || "",
          rcm: d.rcm || false,
          isActive: d.is_active !== undefined ? d.is_active : true,
        };
        const loadedRates = (d.rates || []).map((r) => ({
          cityId: r.city_id ? String(r.city_id) : "",
          cityName: r.city_name || "",
          perKg: r.per_kg || "",
          perBox: r.per_box || "",
          perBundle: r.per_bundle || "",
        }));
        setForm(loadedForm);
        setRates(loadedRates);
        if (isEdit) {
          initialFormRef.current = {
            id,
            sig: normalizeFormSignature({ form: loadedForm, rates: loadedRates }),
          };
        }
      } catch {
        toast.error("Failed to load transport");
        navigate("/masters/transport");
      }
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  /* rate row helpers */
  const handleRateChange = (e) => {
    const { name, value } = e.target;
    setRateRow((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "cityId") {
        const found = cityOpts.find((c) => c.value === value);
        updated.cityName = found ? found.label : "";
      }
      return updated;
    });
  };

  const addRate = () => {
    if (!rateRow.cityId && !rateRow.cityName) {
      toast.warn("Select a city first");
      return;
    }
    setRates((prev) => [...prev, rateRow]);
    setRateRow(EMPTY_RATE);
  };

  const removeRate = (idx) => setRates((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.businessMode) { toast.warn("Business Mode is required"); return; }
    if (!form.name.trim()) { toast.warn("Name is required"); return; }
    if (isEdit && initialFormRef.current.id === id
        && normalizeFormSignature({ form, rates }) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }
    try {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      const payload = { ...form, rates };
      if (isAdd) {
        await api.post("/transports", payload);
        toast.success("Transport created");
      } else {
        await api.put(`/transports/${id}`, payload);
        initialFormRef.current = {
          id,
          sig: normalizeFormSignature({ form, rates }),
        };
        toast.success("Transport updated");
      }
      navigate("/masters/transport");
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => navigate("/masters/transport")}>
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
            <span>Transport</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button
            onClick={() => { setForm(EMPTY_FORM); setRates([]); navigate("/masters/transport/new"); }}
            className="topbar-action-btn topbar-action-new"
          >
            <PlusCircle className="w-3 h-3 mr-1" /> New
          </button>
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
            >
              <Save className="w-3 h-3 mr-1" /> Save
            </button>
          )}
          <button
            onClick={() => navigate("/masters/transport")}
            className="glass-btn glass-btn-primary flex items-center"
          >
            <Search className="w-3 h-3 mr-1" /> Search
          </button>
        </div>
      </div>

      {/* Body — two-column layout */}
      <div
        className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0"
        data-enter-scope="true"
        onKeyDownCapture={handleEnterKeyNavigation}
      >

        {/* ── LEFT PANEL ── */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-1 lg:h-full">

          <Field>
            <Label required>Business Mode</Label>
            <Select
              name="businessMode"
              value={form.businessMode}
              onChange={handleChange}
              disabled={readOnly}
              options={BUSINESS_MODES}
              placeholder="— select —"
            />
          </Field>

          <Field>
            <Label required>Name</Label>
            <Input name="name" value={form.name} onChange={handleChange} disabled={readOnly} />
          </Field>

          <Field>
            <Label>Contact Person</Label>
            <Input name="contactPerson" value={form.contactPerson} onChange={handleChange} disabled={readOnly} />
          </Field>

          {/* Contact No / Email side by side */}
          <Field>
            <Label>Contact No / Email ID</Label>
            <div className="flex flex-1 gap-1">
              <Input
                name="contactNo"
                value={form.contactNo}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Contact No"
              />
              <Input
                name="emailId"
                value={form.emailId}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Email ID"
              />
            </div>
          </Field>

          <Field>
            <Label>Address</Label>
            <textarea
              name="address"
              rows={3}
              value={form.address}
              onChange={handleChange}
              disabled={readOnly}
              className={`flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 resize-none ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
            />
          </Field>

          {/* City / State */}
          <Field>
            <Label>City / State</Label>
            <div className="flex flex-1 gap-1">
              <Select
                name="cityId"
                value={form.cityId}
                onChange={handleChange}
                disabled={readOnly}
                options={cityOpts}
                placeholder="City"
                className="flex-1"
              />
              <Select
                name="stateId"
                value={form.stateId}
                onChange={handleChange}
                disabled={readOnly}
                options={stateOpts}
                placeholder="State"
                className="flex-1"
              />
            </div>
          </Field>

          {/* PAN / GST */}
          <Field>
            <Label>PAN / GST</Label>
            <div className="flex flex-1 gap-1">
              <Input name="pan" value={form.pan} onChange={handleChange} disabled={readOnly} placeholder="PAN" />
              <Input name="gst" value={form.gst} onChange={handleChange} disabled={readOnly} placeholder="GST" />
            </div>
          </Field>

          {/* Bank / Branch */}
          <Field>
            <Label>Bank / Branch</Label>
            <div className="flex flex-1 gap-1">
              <Select
                name="bankId"
                value={form.bankId}
                onChange={handleChange}
                disabled={readOnly}
                options={bankOpts}
                placeholder="Bank"
                className="flex-1"
              />
              <Input
                name="branch"
                value={form.branch}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Branch"
              />
            </div>
          </Field>

          <Field>
            <Label required>Bank Account Name</Label>
            <Input name="bankAccountName" value={form.bankAccountName} onChange={handleChange} disabled={readOnly} />
          </Field>

          {/* IFSC / Account No */}
          <Field>
            <Label>IFSC / Account No</Label>
            <div className="flex flex-1 gap-1">
              <Input name="ifsc" value={form.ifsc} onChange={handleChange} disabled={readOnly} placeholder="IFSC" />
              <Input name="accountNo" value={form.accountNo} onChange={handleChange} disabled={readOnly} placeholder="Account No" />
            </div>
          </Field>

          {/* Price / Tax */}
          <Field>
            <Label>Price / Tax</Label>
            <div className="flex flex-1 gap-1">
              <Input
                name="price"
                type="number"
                value={form.price}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Price"
              />
              <Select
                name="taxId"
                value={form.taxId}
                onChange={handleChange}
                disabled={readOnly}
                options={taxOpts}
                placeholder="Tax"
                className="flex-1"
              />
            </div>
          </Field>

          <Field>
            <Label>Vehicles</Label>
            <Input name="vehicles" value={form.vehicles} onChange={handleChange} disabled={readOnly} />
          </Field>

          {/* Loading Charges */}
          <Field>
            <Label>Loading Charges</Label>
            <div className="flex flex-1 gap-1 items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Per Box</span>
              <Input
                name="loadingPerBox"
                type="number"
                value={form.loadingPerBox}
                onChange={handleChange}
                disabled={readOnly}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Per Bundle</span>
              <Input
                name="loadingPerBundle"
                type="number"
                value={form.loadingPerBundle}
                onChange={handleChange}
                disabled={readOnly}
              />
            </div>
          </Field>

          {/* Allowed Payment Mode */}
          <Field>
            <Label>Allowed Payment Mode</Label>
            <Select
              name="allowedPaymentMode"
              value={form.allowedPaymentMode}
              onChange={handleChange}
              disabled={readOnly}
              options={PAYMENT_MODES}
              placeholder="— select —"
            />
          </Field>

          {/* RCM + Active checkboxes */}
          <div className="flex items-center gap-6 mt-1 pl-[40%]">
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                name="rcm"
                checked={form.rcm}
                onChange={handleChange}
                disabled={readOnly}
                className="w-3 h-3"
              />
              RCM
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                disabled={readOnly}
                className="w-3 h-3"
              />
              Active
            </label>
          </div>
        </div>

        {/* ── RIGHT PANEL — Rate Table ── */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex flex-col lg:h-full">
          <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Transport Rates</h2>

          {/* Rate input row */}
          {!readOnly && (
            <div className="flex gap-1 mb-2 items-end">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">City</span>
                <Select
                  name="cityId"
                  value={rateRow.cityId}
                  onChange={handleRateChange}
                  options={cityOpts}
                  placeholder="City"
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-1 w-20">
                <span className="text-xs text-gray-500 dark:text-gray-400">Per Kg</span>
                <Input
                  name="perKg"
                  type="number"
                  value={rateRow.perKg}
                  onChange={handleRateChange}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1 w-20">
                <span className="text-xs text-gray-500 dark:text-gray-400">Per Box</span>
                <Input
                  name="perBox"
                  type="number"
                  value={rateRow.perBox}
                  onChange={handleRateChange}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1 w-24">
                <span className="text-xs text-gray-500 dark:text-gray-400">Per Bundle</span>
                <Input
                  name="perBundle"
                  type="number"
                  value={rateRow.perBundle}
                  onChange={handleRateChange}
                  placeholder="0"
                />
              </div>
              <button
                onClick={addRate}
                className="glass-btn glass-btn-primary mb-0.5 p-1.5"
                title="Add rate"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Rate table */}
          <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-sm overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="border-r dark:border-gray-600 px-2 py-1.5 text-left">City</th>
                  <th className="border-r dark:border-gray-600 px-2 py-1.5 text-right">Per KG</th>
                  <th className="border-r dark:border-gray-600 px-2 py-1.5 text-right">Per Box</th>
                  <th className="border-r dark:border-gray-600 px-2 py-1.5 text-right">Per Bundle</th>
                  {!readOnly && <th className="px-2 py-1.5 text-center">Action</th>}
                </tr>
              </thead>
              <tbody>
                {rates.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 4 : 5} className="text-center py-6 text-gray-400 dark:text-gray-500">
                      No rates added yet
                    </td>
                  </tr>
                ) : (
                  rates.map((r, i) => (
                    <tr key={i} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="border-r dark:border-gray-700 px-2 py-1">{r.cityName || r.cityId || "—"}</td>
                      <td className="border-r dark:border-gray-700 px-2 py-1 text-right">{r.perKg || 0}</td>
                      <td className="border-r dark:border-gray-700 px-2 py-1 text-right">{r.perBox || 0}</td>
                      <td className={`${!readOnly ? "border-r dark:border-gray-700" : ""} px-2 py-1 text-right`}>{r.perBundle || 0}</td>
                      {!readOnly && (
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => removeRate(i)}
                            className="glass-btn glass-btn-danger"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* row count */}
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
            {rates.length === 1 ? "Showing 1 row" : `Showing ${rates.length} rows`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportForm;
