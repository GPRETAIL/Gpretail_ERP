import React, { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";

const CUSTOMER_TYPES = [
  "Employee", "Retail", "Provider", "Customer", "Tailoring",
  "Franchise", "Agencies", "E-commerce", "Persons",
];

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

const SUPPLY_TYPES = [
  "Business to Business",
  "Business to Customer",
  "SEZ with payment",
  "SEZ without payment",
  "Export with payment",
  "Export without payment",
  "Deemed Export",
];

const TextInput = ({ label, name, required = false, value, onChange, placeholder = "", type = "text", disabled = false }) => (
  <div className="flex items-center w-full min-w-0">
    <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
      {required && <span className="text-red-500 dark:text-red-400 mr-1">*</span>}
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ml-3 disabled:bg-gray-100 dark:disabled:bg-gray-800"
    />
  </div>
);

const SelectInput = ({ label, name, required = false, options = [], value, onChange }) => (
  <div className="flex items-center w-full min-w-0">
    <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
      {required && <span className="text-red-500 dark:text-red-400 mr-1">*</span>}
      {label}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ml-3"
    >
      <option value="">Select</option>
      {options.map((o, i) => (
        <option key={i} value={o.value ?? o.label}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const CheckboxInput = ({ label, name, checked, onChange }) => (
  <div className="flex items-center w-full min-w-0">
    <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">{label}</label>
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 ml-3"
    />
  </div>
);

const blankForm = {
  customerType: "",
  customerCategoryId: "",
  code: "",
  name: "",
  mobileNo: "",
  otherNumber: "",
  billingName: "",
  emailId: "",
  gender: "",
  dateOfBirth: "",
  married: false,
  marriageDate: "",
  kidsBoy: "",
  kidsGirl: "",
  loyaltyCardNumber: "",
  points: "0",
  supplyType: "",
  gstNo: "",
  tanPan: "",
  supportCredit: false,
  creditDays: "",
  creditAmount: "",
  address: "",
  cityId: "",
  districtId: "",
  pinCode: "",
  stateId: "",
  countryId: "",
  registeringAtId: "",
  approvedById: "",
  bankAccountName: "",
  accountNoIfsc: "",
  disableLoyalty: false,
  active: true,
};

const CrmCustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({ ...blankForm });
  const [saving, setSaving] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [opts, setOpts] = useState({
    customerCategories: [],
    cities: [],
    districts: [],
    states: [],
    countries: [],
    locations: [],
    employees: [],
  });

  useEffect(() => {
    const cfg = (type) =>
      api
        .get(`/configurations/${type}`)
        .then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name })))
        .catch(() => []);

    const empList = () =>
      api
        .get("/employees")
        .then((r) =>
          (r.data?.data || []).map((e) => ({
            value: String(e.id),
            label: `${e.name || ""} ${e.surname || ""}`.trim() || e.employee_code,
          }))
        )
        .catch(() => []);

    Promise.all([
      cfg("customer_category"),
      cfg("city"),
      cfg("district"),
      cfg("state"),
      cfg("country"),
      cfg("location"),
      empList(),
    ]).then(([customerCategories, cities, districts, states, countries, locations, employees]) => {
      setOpts({ customerCategories, cities, districts, states, countries, locations, employees });
    });
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoadingRecord(true);
    api
      .get(`/customers/${id}`)
      .then((res) => {
        const c = res.data?.data;
        if (!c) return;
        setFormData({
          customerType: c.customer_type || "",
          customerCategoryId: c.customer_category_id ? String(c.customer_category_id) : "",
          code: c.code || "",
          name: c.name || "",
          mobileNo: c.phone || "",
          otherNumber: c.other_number || "",
          billingName: c.billing_name || "",
          emailId: c.email || "",
          gender: c.gender || "",
          dateOfBirth: c.date_of_birth || "",
          married: !!c.married,
          marriageDate: c.marriage_date || "",
          kidsBoy: c.kids_boy || "",
          kidsGirl: c.kids_girl || "",
          loyaltyCardNumber: c.loyalty_card_number || "",
          points: c.loyalty_points != null ? String(c.loyalty_points) : "0",
          supplyType: c.supply_type || "",
          gstNo: c.gstin || "",
          tanPan: c.tan_pan || "",
          supportCredit: !!c.support_credit,
          creditDays: c.credit_days != null ? String(c.credit_days) : "",
          creditAmount: c.credit_amount != null ? String(c.credit_amount) : "",
          address: c.address || "",
          cityId: c.city ? String(c.city) : "",
          districtId: c.district_id ? String(c.district_id) : "",
          pinCode: c.pincode || "",
          stateId: c.state_id ? String(c.state_id) : "",
          countryId: c.country_id ? String(c.country_id) : "",
          registeringAtId: c.registering_at_id ? String(c.registering_at_id) : "",
          approvedById: c.approved_by_id ? String(c.approved_by_id) : "",
          bankAccountName: c.bank_account_name || "",
          accountNoIfsc: c.account_no_ifsc || "",
          disableLoyalty: !!c.disable_loyalty,
          active: c.is_active ?? true,
        });
      })
      .catch(() => toast.error("Failed to load customer"))
      .finally(() => setLoadingRecord(false));
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async () => {
    if (!formData.customerType.trim()) {
      toast.error("Customer Type is required");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Customer Code is required");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Customer Name is required");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/customers/${id}`, formData);
        toast.success("Customer updated successfully");
      } else {
        await api.post("/customers", formData);
        toast.success("Customer saved successfully");
      }
      navigate("/crm/customer");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
        <div className="flex items-center space-x-2">
          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/crm")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              CRM
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <button
              type="button"
              onClick={() => navigate("/crm/customer")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Customer
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>{isEdit ? "Edit" : "New"}</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button
            className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || loadingRecord}
          >
            <Save className="w-3 h-3 mr-1" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 min-h-0">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 w-full h-full flex flex-col min-h-0 overflow-auto px-5 py-4">
          {loadingRecord ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-x-8 gap-y-3 w-full">
              {/* Row 1 */}
              <SelectInput
                label="Customer Type"
                name="customerType"
                required
                options={CUSTOMER_TYPES.map((t) => ({ value: t, label: t }))}
                value={formData.customerType}
                onChange={handleChange}
              />
              <SelectInput
                label="Category"
                name="customerCategoryId"
                options={opts.customerCategories}
                value={formData.customerCategoryId}
                onChange={handleChange}
              />
              <TextInput label="Customer Code" name="code" required value={formData.code} onChange={handleChange} />

              {/* Row 2 */}
              <TextInput label="Customer Name" name="name" required value={formData.name} onChange={handleChange} />
              <TextInput label="Mobile" name="mobileNo" value={formData.mobileNo} onChange={handleChange} />
              <TextInput label="Other Number" name="otherNumber" value={formData.otherNumber} onChange={handleChange} />

              {/* Row 3 */}
              <TextInput label="Billing Name" name="billingName" value={formData.billingName} onChange={handleChange} />
              <TextInput label="Email ID" name="emailId" type="email" value={formData.emailId} onChange={handleChange} />
              <SelectInput
                label="Gender"
                name="gender"
                options={GENDERS.map((g) => ({ value: g, label: g }))}
                value={formData.gender}
                onChange={handleChange}
              />

              {/* Row 4 */}
              <TextInput label="Date Of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} />
              <CheckboxInput label="Married" name="married" checked={formData.married} onChange={handleChange} />
              {formData.married ? (
                <TextInput label="Marriage Date" name="marriageDate" type="date" value={formData.marriageDate} onChange={handleChange} />
              ) : (
                <div />
              )}

              {/* Row 5 */}
              <TextInput label="Kids Boy" name="kidsBoy" value={formData.kidsBoy} onChange={handleChange} />
              <TextInput label="Kids Girl" name="kidsGirl" value={formData.kidsGirl} onChange={handleChange} />
              <TextInput label="Loyalty Card No" name="loyaltyCardNumber" value={formData.loyaltyCardNumber} onChange={handleChange} />

              {/* Row 6 */}
              <TextInput label="Points" name="points" value={formData.points} onChange={handleChange} disabled />
              <SelectInput
                label="Supply Type"
                name="supplyType"
                options={SUPPLY_TYPES.map((s) => ({ value: s, label: s }))}
                value={formData.supplyType}
                onChange={handleChange}
              />
              <TextInput label="GST No" name="gstNo" value={formData.gstNo} onChange={handleChange} />

              {/* Row 7 */}
              <TextInput label="TAN / PAN" name="tanPan" value={formData.tanPan} onChange={handleChange} />
              <CheckboxInput label="Support Credit" name="supportCredit" checked={formData.supportCredit} onChange={handleChange} />
              {formData.supportCredit ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <TextInput label="Days" name="creditDays" value={formData.creditDays} onChange={handleChange} />
                  </div>
                  <div className="flex-1">
                    <TextInput label="Amount" name="creditAmount" value={formData.creditAmount} onChange={handleChange} />
                  </div>
                </div>
              ) : (
                <div />
              )}

              {/* Row 8 - Address */}
              <TextInput label="Address" name="address" value={formData.address} onChange={handleChange} />
              <SelectInput label="City" name="cityId" options={opts.cities} value={formData.cityId} onChange={handleChange} />
              <SelectInput label="District" name="districtId" options={opts.districts} value={formData.districtId} onChange={handleChange} />

              {/* Row 9 */}
              <TextInput label="PIN Code" name="pinCode" value={formData.pinCode} onChange={handleChange} />
              <SelectInput label="State" name="stateId" options={opts.states} value={formData.stateId} onChange={handleChange} />
              <SelectInput label="Country" name="countryId" options={opts.countries} value={formData.countryId} onChange={handleChange} />

              {/* Row 10 */}
              <SelectInput label="Registering At" name="registeringAtId" options={opts.locations} value={formData.registeringAtId} onChange={handleChange} />
              <SelectInput label="Approved" name="approvedById" options={opts.employees} value={formData.approvedById} onChange={handleChange} />
              <TextInput label="Bank A/C Name" name="bankAccountName" value={formData.bankAccountName} onChange={handleChange} />

              {/* Row 11 */}
              <TextInput label="Account No / IFSC" name="accountNoIfsc" value={formData.accountNoIfsc} onChange={handleChange} />
              <CheckboxInput label="Disable Loyalty" name="disableLoyalty" checked={formData.disableLoyalty} onChange={handleChange} />
              <CheckboxInput label="Active" name="active" checked={formData.active} onChange={handleChange} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default CrmCustomerForm;
