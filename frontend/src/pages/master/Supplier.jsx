import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, PlusCircle, Save, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import ConfirmDialog from "../../components/ConfirmDialog";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";
import useStoreNameMap from "../../hooks/useStoreNameMap";

const SUPPLIER_IMPORT_CONFIG = {
  aliases: {
    code: "code", name: "name", gst: "gst",
    codetype: "code_type",
    companyregname: "company_reg_name",
    contactperson: "contact_person",
    contactno: "contact_no", phone: "contact_no",
    address: "address", city: "city_id", state: "state_id", country: "country", pincode: "pincode",
    emailid: "email_id", email: "email_id",
    pan: "pan",
    transport: "transport_id", company: "company_id",
    suppliergroup: "supplier_group_id", buyergroup: "buyer_group_id",
    deliverylocation: "delivery_location_id",
    mindiscountpct: "min_discount_pct",
    interestdays: "interest_days",
    cashdiscountdays: "cash_discount_days",
    cashdiscountpct: "cash_discount_pct",
    marginmin: "margin_min", marginmax: "margin_max",
    paymentcreditdays: "payment_credit_days",
    soldpercentage: "sold_percentage",
    autopolimit: "auto_po_limit", autoporating: "auto_po_rating",
    limitamount: "limit_amount",
    taxable: "taxable", urd: "urd", supportpo: "support_po",
    msmeno: "msme_no", msmegroup: "msme_group_id",
    agent: "agent_id", tan: "tan",
    bank: "bank_id", bankbranch: "bank_branch", bankaccountname: "bank_account_name",
    ifsc: "ifsc", accountno: "account_no",
    addedon: "added_on", removedon: "removed_on",
    isrenamed: "is_renamed", renamedto: "renamed_to",
    interstatesale: "interstate_sale", internaltransfer: "internal_transfer",
    isactive: "is_active", active: "is_active",
  },
  required: ["name"],
  boolFields: ["is_active", "taxable", "urd", "support_po", "is_renamed", "interstate_sale", "internal_transfer"],
  sampleFileName: "supplier_sample.xlsx",
  sampleHeaders: [
    "code_type", "code", "gst", "name", "company_reg_name", "contact_person", "contact_no",
    "address", "city", "state", "country", "pincode", "email",
    "transport", "company", "supplier_group", "buyer_group", "delivery_location",
    "min_discount_pct", "interest_days", "cash_discount_days", "cash_discount_pct",
    "margin_min", "margin_max", "payment_credit_days", "sold_percentage",
    "auto_po_limit", "auto_po_rating", "limit_amount",
    "taxable", "urd", "support_po",
    "msme_no", "msme_group", "agent", "tan", "pan",
    "bank", "bank_branch", "bank_account_name", "ifsc", "account_no",
    "added_on", "removed_on", "is_renamed", "renamed_to",
    "interstate_sale", "internal_transfer", "is_active",
  ],
};

// ─── Helper components at module level (prevents focus-loss on re-render) ────

const TextInput = ({ label, name, required = false, value, onChange, placeholder = "", icon = null, type = "text", disabled = false }) => (
  <div className="flex items-center">
    <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">
      {required && <span className="text-red-500 mr-1">*</span>}{label}
    </label>
    <div className="flex-1 flex items-center ml-3">
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
        className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed" />
      {icon && <button className="glass-btn glass-btn-primary p-1.5 ml-1" type="button">{icon}</button>}
    </div>
  </div>
);

const SelectInput = ({ label, name, required = false, options = [], value, onChange, icon = null, disabled = false }) => (
  <div className="flex items-center">
    <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">
      {required && <span className="text-red-500 mr-1">*</span>}{label}
    </label>
    <div className="flex-1 flex items-center ml-3">
      <select name={name} value={value} onChange={onChange} disabled={disabled}
        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed">
        <option value="">Select {label}</option>
        {options.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
      </select>
      {icon && <button className="glass-btn glass-btn-primary p-1.5 ml-1" type="button">{icon}</button>}
    </div>
  </div>
);

const DualSelectInput = ({ label, name1, value1, name2, value2, onChange, options1 = [], options2 = [], placeholder1 = "Select", placeholder2 = "Select" }) => (
  <div className="flex items-center">
    <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <div className="flex-1 flex items-center ml-3 space-x-2">
      <select name={name1} value={value1} onChange={onChange} className="w-1/2 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500">
        <option value="">{placeholder1}</option>
        {options1.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
      </select>
      <select name={name2} value={value2} onChange={onChange} className="w-1/2 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500">
        <option value="">{placeholder2}</option>
        {options2.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
      </select>
    </div>
  </div>
);

const SingleInputRight = ({ label, name, required = false, value, onChange, placeholder = "", type = "text" }) => (
  <div className="flex items-center">
    <label className="w-[30%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1">
      {required && <span className="text-red-500 mr-1">*</span>}{label}
    </label>
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      className="w-[70%] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
  </div>
);

const SelectInputRight = ({ label, name, required = false, options = [], value, onChange }) => (
  <div className="flex items-center">
    <label className="w-[30%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1">
      {required && <span className="text-red-500 mr-1">*</span>}{label}
    </label>
    <select name={name} value={value} onChange={onChange}
      className="w-[70%] border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500">
      <option value="">Select {label}</option>
      {options.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
    </select>
  </div>
);

const BankBranchField = ({ label, bankName, bankValue, branchName, branchValue, onChange, bankOptions = [] }) => (
  <div className="flex items-center">
    <label className="w-[30%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1">{label}</label>
    <div className="w-[70%] flex space-x-1">
      <select name={bankName} value={bankValue} onChange={onChange}
        className="w-1/2 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500">
        <option value="">Select Bank</option>
        {bankOptions.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
      </select>
      <input type="text" name={branchName} value={branchValue} onChange={onChange} placeholder="Branch"
        className="w-1/2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
    </div>
  </div>
);

const DualTextFieldRight = ({ label, name1, value1, name2, value2, onChange, placeholder1 = "", placeholder2 = "" }) => (
  <div className="flex items-center">
    <label className="w-[30%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1">{label}</label>
    <div className="w-[70%] flex space-x-1">
      <input type="text" name={name1} value={value1} onChange={onChange} placeholder={placeholder1}
        className="w-1/2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
      <input type="text" name={name2} value={value2} onChange={onChange} placeholder={placeholder2}
        className="w-1/2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
    </div>
  </div>
);

const MsmeRow = ({ label, inputName, selectName, inputValue, selectValue, onChange, groupOptions = [] }) => (
  <div className="flex items-center">
    <label className="w-[30%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1">{label}</label>
    <div className="w-[70%] flex space-x-1">
      <input type="text" name={inputName} value={inputValue} onChange={onChange}
        className="w-1/2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
      <select name={selectName} value={selectValue} onChange={onChange}
        className="w-1/2 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500">
        <option value="">Select Group</option>
        {groupOptions.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
      </select>
    </div>
  </div>
);

const RenamedRow = ({ label, name, checked, selectName, selectValue, onChange, options = [] }) => (
  <div className="flex items-center">
    <label className="w-[30%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1 flex items-center">
      <input type="checkbox" name={name} checked={checked} onChange={onChange}
        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 mr-2" />
      {label}
    </label>
    <select name={selectName} value={selectValue} onChange={onChange} disabled={!checked}
      className={`w-[70%] border rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 ${checked ? "border-gray-300 dark:border-gray-600" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500"}`}>
      <option value="">Select Renamed</option>
      {options.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
    </select>
  </div>
);

const ComplexInputRow = ({ label1, unit1, name1, unit2, name2, label2, value1, value2, onChange }) => (
  <div className="flex items-center">
    <label className="w-[30%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1">{label1}</label>
    <span className="w-[10%] text-xs text-gray-500 dark:text-gray-400 pr-1">{unit1}</span>
    <input type="text" name={name1} value={value1} onChange={onChange}
      className="w-[20%] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm text-right focus:ring-1 focus:ring-blue-500" />
    <span className="w-[10%] text-xs text-gray-500 dark:text-gray-400 text-center">{label2}</span>
    <input type="text" name={name2} value={value2} onChange={onChange}
      className="w-[20%] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm text-right focus:ring-1 focus:ring-blue-500" />
    <span className="w-[10%] text-xs text-gray-500 dark:text-gray-400 text-left pl-1">{unit2}</span>
  </div>
);

const CheckboxRow = ({ mainLabel, label1, name1, label2, name2, value1, value2, onChange }) => (
  <div className="flex items-center">
    <label className="w-[30%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1">{mainLabel}</label>
    <div className="w-[30%] flex items-center space-x-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label1}</span>
      <input type="checkbox" name={name1} checked={value1} onChange={onChange}
        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500" />
    </div>
    <div className="w-[40%] flex items-center space-x-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label2}</span>
      {name2.includes("limit") ? (
        <input type="text" name={name2} value={value2} onChange={onChange}
          className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
      ) : (
        <input type="checkbox" name={name2} checked={value2} onChange={onChange}
          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500" />
      )}
    </div>
  </div>
);

const BottomCheckboxGroup = ({ label, name, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 w-1/3">
    <input type="checkbox" name={name} checked={checked} onChange={onChange}
      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500" />
    {label}
  </label>
);

const AdvanceTextInput = ({ label, name, required = false, value, onChange, placeholder = "", type = "text" }) => (
  <div className="flex items-center">
    <label className="w-[35%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1 text-left">
      {required && <span className="text-red-500 mr-1">*</span>}{label}
    </label>
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      className="w-[65%] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
  </div>
);

const AdvanceSelectInput = ({ label, name, required = false, options = [], value, onChange }) => (
  <div className="flex items-center">
    <label className="w-[35%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1 text-left">
      {required && <span className="text-red-500 mr-1">*</span>}{label}
    </label>
    <select name={name} value={value} onChange={onChange}
      className="w-[65%] border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500">
      <option value="">Select {label}</option>
      {options.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
    </select>
  </div>
);

const AdvanceDualSelectInput = ({ label, name1, value1, name2, value2, onChange, options1 = [], options2 = [] }) => (
  <div className="flex items-center">
    <label className="w-[35%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1 text-left">{label}</label>
    <div className="w-[65%] flex items-center space-x-1">
      <select name={name1} value={value1} onChange={onChange}
        className="w-1/2 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500">
        <option value="">Select State</option>
        {options1.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
      </select>
      <select name={name2} value={value2} onChange={onChange}
        className="w-1/2 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500">
        <option value="">Select Country</option>
        {options2.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
      </select>
    </div>
  </div>
);

// ─── Static options ───────────────────────────────────────────────────────────
const CODE_TYPE_OPTIONS = [
  { label: "Supplier", value: "Supplier" },
  { label: "Job Worker", value: "Job Worker" },
  { label: "Agent", value: "Agent" },
];

const Supplier = () => {
  const navigate = useNavigate();
  const formContainerRef = useRef(null);
  const [showSearchPage, setShowSearchPage] = useState(true);
  const [activeTab, setActiveTab] = useState("Primary");
  const [currentId, setCurrentId] = useState(null);
  const storeMap = useStoreNameMap();
  const initialFormRef = useRef({ id: null, sig: null });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard
  const [searchRows, setSearchRows] = useState([]);
  const [searchLoading, setSearchLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [forceFetchAll, setForceFetchAll] = useState(false);

  const handleSearchClick = () => setShowSearchPage(true);
  const handleBackClick = () => {
    if (showSearchPage) {
      navigate("/masters");
    } else {
      setShowSearchPage(true);
    }
  };
  const scrollMainContentTop = () => {
    const layoutScroller = document.querySelector("main > div > div:last-child");
    if (layoutScroller && typeof layoutScroller.scrollTo === "function") {
      layoutScroller.scrollTo({ top: 0, behavior: "auto" });
    }
    if (formContainerRef.current && typeof formContainerRef.current.scrollTo === "function") {
      formContainerRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const [formData, setFormData] = useState({
    codeType: "Supplier",
    code: "", gst: "", name: "", companyRegName: "", contactPerson: "",
    contactNo: "", address: "", city: "", state: "", country: "", pincode: "",
    emailId: "", transport: "", company: "", supplierGroup: "", buyerGroup: "",
    deliveryLocation: "",
    minDiscountPercentage: "", interestDays: "", cashDiscountDays: "",
    cashDiscountPercentage: "", marginMin: "", marginMax: "",
    paymentCreditDays: "", soldPercentage: "", autoPOLimit: "", autoPORating: "",
    limit: "", taxable: false, urd: false, supportPO: false,
    msmeGroup: "", msmeInput: "", agentName: "",
    tanPan1: "", tanPan2: "",
    bankId: "", bankBranch: "", bankAccountName: "",
    ifscAccountNo1: "", ifscAccountNo2: "",
    addedRemovedOn1: "", addedRemovedOn2: "",
    isRenamed: false, renamed: "",
    interstateSale: false, internalTransfer: false, active: true,
    advanceAddressType: "", advanceContactNo: "", advanceAddress: "",
    advanceCity: "", advanceState: "", advanceCountry: "", advancePincode: "",
    advanceProductName: "", advanceBrandName: "",
    advanceRemarks: "", advanceAttachmentType: "",
  });
  // Snapshot each loaded record (edit mode) so an unchanged save reports "No changes detected".
  // Declared AFTER formData so the dependency array doesn't read it in its TDZ.
  useEffect(() => {
    if (currentId != null && initialFormRef.current.id !== currentId) {
      initialFormRef.current = { id: currentId, sig: JSON.stringify(formData) };
    }
  }, [currentId, formData]);

  // ─── Dropdown data from API ──────────────────────────────────────────────
  const [opts, setOpts] = useState({
    cities: [], states: [], transports: [], locations: [], companies: [],
    supplierGroups: [], buyerGroups: [], deliveryLocations: [],
    banks: [], agents: [], tdsGroups: [], addressTypes: [],
    products: [], brands: [], documentTypes: [],
  });

  useEffect(() => {
    const cfg = (type) =>
      api.get(`/configurations/${type}`)
        .then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name })))
        .catch(() => []);

    Promise.all([
      cfg("city"),
      cfg("state"),
      api.get("/transports").then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []),
      cfg("location"),
      api.get("/companies").then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []),
      cfg("supplier_group"),
      cfg("buyer_group"),
      cfg("delivery_location"),
      cfg("bank"),
      cfg("vendor"),
      cfg("tds_group"),
      cfg("address_type"),
      api.get("/products").then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []),
      api.get("/brands").then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []),
      cfg("document_type"),
    ]).then(([cities, states, transports, locations, companies, supplierGroups, buyerGroups,
      deliveryLocations, banks, agents, tdsGroups, addressTypes, products, brands, documentTypes]) => {
      setOpts({ cities, states, transports, locations, companies, supplierGroups, buyerGroups,
        deliveryLocations, banks, agents, tdsGroups, addressTypes, products, brands, documentTypes });
    });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const blankForm = {
    codeType: "Supplier", code: "", gst: "", name: "", companyRegName: "",
    contactPerson: "", contactNo: "", address: "", city: "", state: "", country: "",
    pincode: "", emailId: "", transport: "", company: "", supplierGroup: "",
    buyerGroup: "", deliveryLocation: "", minDiscountPercentage: "",
    interestDays: "", cashDiscountDays: "", cashDiscountPercentage: "",
    marginMin: "", marginMax: "", paymentCreditDays: "", soldPercentage: "",
    autoPOLimit: "", autoPORating: "", limit: "", taxable: false, urd: false,
    supportPO: false, msmeGroup: "", msmeInput: "", agentName: "", tanPan1: "",
    tanPan2: "", bankId: "", bankBranch: "", bankAccountName: "",
    ifscAccountNo1: "", ifscAccountNo2: "", addedRemovedOn1: "", addedRemovedOn2: "",
    isRenamed: false, renamed: "", interstateSale: false, internalTransfer: false,
    active: true, advanceAddressType: "", advanceContactNo: "", advanceAddress: "",
    advanceCity: "", advanceState: "", advanceCountry: "", advancePincode: "",
    advanceProductName: "", advanceBrandName: "", advanceRemarks: "",
    advanceAttachmentType: "",
  };

  const handleNew = () => {
    setCurrentId(null);
    setFormData(blankForm);
    setActiveTab("Primary");
    setShowSearchPage(false);
    requestAnimationFrame(scrollMainContentTop);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (currentId && initialFormRef.current.id === currentId
        && JSON.stringify(formData) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (currentId) {
        await api.put(`/suppliers/${currentId}`, formData);
        toast.success("Supplier updated successfully");
      } else {
        const res = await api.post("/suppliers", formData);
        setCurrentId(res.data.data.id);
        toast.success("Supplier saved successfully");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save supplier");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const labelOf = (options, id) =>
    options.find((o) => o.value === String(id))?.label || "—";

  const fetchSuppliers = async (queryOverride = tableSearch) => {
    try {
      setSearchLoading(true);
      const query = String(queryOverride || "").trim();
      const params = {
        page,
        limit,
        search: query || undefined,
        field: tableSearchField !== "all" ? tableSearchField : undefined,
        ...(forceFetchAll ? { all: "true" } : {}),
      };
      const res = await api.get("/suppliers", { params });
      const rows = res.data?.data || [];
      setSearchRows(rows);

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
      toast.error(err?.response?.data?.message || "Failed to load suppliers");
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (showSearchPage) fetchSuppliers();
  }, [showSearchPage, page, limit, tableSearch, forceFetchAll]);

  const handleServerSearch = useCallback(({ query, field, fetchAll }) => {
    setTableSearch(query);
    setTableSearchField(field || "all");
    setForceFetchAll(!!fetchAll);
    setPage(1);
  }, []);

  const loadSupplierForEdit = (row) => {
    setCurrentId(row.id);
    setFormData({
      ...blankForm,
      codeType: row.code_type || "Supplier",
      code: row.code || "",
      gst: row.gst || "",
      name: row.name || "",
      companyRegName: row.company_reg_name || "",
      contactPerson: row.contact_person || "",
      contactNo: row.contact_no || "",
      address: row.address || "",
      city: row.city_id != null ? String(row.city_id) : "",
      state: row.state_id != null ? String(row.state_id) : "",
      country: row.country || "",
      pincode: row.pincode || "",
      emailId: row.email_id || "",
      transport: row.transport_id != null ? String(row.transport_id) : "",
      company: row.company_id != null ? String(row.company_id) : "",
      supplierGroup: row.supplier_group_id != null ? String(row.supplier_group_id) : "",
      buyerGroup: row.buyer_group_id != null ? String(row.buyer_group_id) : "",
      deliveryLocation: row.delivery_location_id != null ? String(row.delivery_location_id) : "",
      minDiscountPercentage: row.min_discount_pct != null ? String(row.min_discount_pct) : "",
      interestDays: row.interest_days != null ? String(row.interest_days) : "",
      cashDiscountDays: row.cash_discount_days != null ? String(row.cash_discount_days) : "",
      cashDiscountPercentage: row.cash_discount_pct != null ? String(row.cash_discount_pct) : "",
      marginMin: row.margin_min != null ? String(row.margin_min) : "",
      marginMax: row.margin_max != null ? String(row.margin_max) : "",
      paymentCreditDays: row.payment_credit_days != null ? String(row.payment_credit_days) : "",
      soldPercentage: row.sold_percentage != null ? String(row.sold_percentage) : "",
      autoPOLimit: row.auto_po_limit != null ? String(row.auto_po_limit) : "",
      autoPORating: row.auto_po_rating != null ? String(row.auto_po_rating) : "",
      limit: row.limit_amount != null ? String(row.limit_amount) : "",
      taxable: !!row.taxable,
      urd: !!row.urd,
      supportPO: !!row.support_po,
      msmeInput: row.msme_no || "",
      msmeGroup: row.msme_group_id != null ? String(row.msme_group_id) : "",
      agentName: row.agent_id != null ? String(row.agent_id) : "",
      tanPan1: row.tan || "",
      tanPan2: row.pan || "",
      bankId: row.bank_id != null ? String(row.bank_id) : "",
      bankBranch: row.bank_branch || "",
      bankAccountName: row.bank_account_name || "",
      ifscAccountNo1: row.ifsc || "",
      ifscAccountNo2: row.account_no || "",
      addedRemovedOn1: row.added_on || "",
      addedRemovedOn2: row.removed_on || "",
      isRenamed: !!row.is_renamed,
      renamed: row.renamed_to || "",
      interstateSale: !!row.interstate_sale,
      internalTransfer: !!row.internal_transfer,
      active: row.is_active !== false,
    });
    setActiveTab("Primary");
    setShowSearchPage(false);
    requestAnimationFrame(scrollMainContentTop);
  };

  const [confirmDlg, setConfirmDlg] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });

  const deleteSupplierConfirmed = async () => {
    const { id } = confirmDlg;
    setConfirmDlg({ open: false, id: null, name: "" });
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success("Supplier deleted");
      setSearchRows((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete supplier");
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/suppliers/${id}`)));
      toast.success(`${keys.length} record(s) deleted`);
      setSelectedRows([]);
      fetchSuppliers();
    } catch {
      toast.error("Failed to delete some records");
    }
  };

  const supplierColumns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "contact_person", label: "Contact Person" },
    { key: "contact_no", label: "Contact No" },
    { key: "gst", label: "GST" },
    { key: "email_id", label: "Email ID" },
    {
      key: "city_id",
      label: "City",
      render: (value) => labelOf(opts.cities, value),
      searchValue: (row) => labelOf(opts.cities, row.city_id),
    },
    {
      key: "state_id",
      label: "State",
      render: (value) => labelOf(opts.states, value),
      searchValue: (row) => labelOf(opts.states, row.state_id),
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

  const renderPrimaryTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3 p-4">
      {/* --- LEFT COLUMN --- */}
      <div className="space-y-3">
        {/* Code / Input Combo */}
        <div className="flex items-center">
          <label className="w-1/2 text-sm font-medium text-gray-700 dark:text-gray-300">Code</label>
          <div className="flex-1 flex items-center ml-3 space-x-2">
            <select className="w-1/3 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                <option>Supplier</option>
                <option>Job Worker</option>
                <option>Agent</option>
            </select>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* GST */}
        <TextInput label="GST" name="gst" value={formData.gst} onChange={handleChange} icon={<PlusCircle className="w-4 h-4" />} />
        
        {/* Name */}
        <TextInput label="Name" name="name" required value={formData.name} onChange={handleChange} />
        
        {/* Company Reg. Name */}
        <TextInput label="Company Reg. Name" name="companyRegName" required value={formData.companyRegName} onChange={handleChange} />
        
        {/* Contact Person */}
        <TextInput label="Contact Person" name="contactPerson" required value={formData.contactPerson} onChange={handleChange} />
        
        {/* Contact No */}
        <TextInput label="Contact No" name="contactNo" required value={formData.contactNo} onChange={handleChange} />
        
        {/* Address */}
        <TextInput label="Address" name="address" required value={formData.address} onChange={handleChange} />
        
        <SelectInput label="City" name="city" value={formData.city} onChange={handleChange} options={opts.cities} />

        <DualSelectInput label="State / Country"
          name1="state" value1={formData.state}
          name2="country" value2={formData.country}
          onChange={handleChange}
          options1={opts.states} options2={[]}
          placeholder1="State" placeholder2="Country" />

        <TextInput label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} />
        <TextInput label="Email ID" name="emailId" value={formData.emailId} onChange={handleChange} />

        <SelectInput label="Transport" name="transport" value={formData.transport} onChange={handleChange} options={opts.transports} />

        <DualSelectInput label="Supplier / Buyer Group"
          name1="supplierGroup" value1={formData.supplierGroup}
          name2="buyerGroup" value2={formData.buyerGroup}
          onChange={handleChange}
          options1={opts.supplierGroups} options2={opts.buyerGroups}
          placeholder1="Supplier Group" placeholder2="Buyer Group" />

        <SelectInput label="Delivery Location" name="deliveryLocation" value={formData.deliveryLocation} onChange={handleChange} options={opts.deliveryLocations} />
      </div>

      {/* --- RIGHT COLUMN --- */}
      <div className="space-y-3">
        {/* Min. Discount % / Interest % / Days */}
        <ComplexInputRow
            label1="Minimum Discount Percentage" unit1="%" name1="minDiscountPercentage" value1={formData.minDiscountPercentage}
            label2="Interest" name2="interestDays" value2={formData.interestDays} unit2="Days" onChange={handleChange}
        />
        <ComplexInputRow
            label1="Cash Discount" unit1="Days" name1="cashDiscountDays" value1={formData.cashDiscountDays}
            label2="%" name2="cashDiscountPercentage" value2={formData.cashDiscountPercentage} unit2="" onChange={handleChange}
        />
        <ComplexInputRow
            label1="Margin" unit1="Min" name1="marginMin" value1={formData.marginMin}
            label2="Max" name2="marginMax" value2={formData.marginMax} unit2="" onChange={handleChange}
        />
        <ComplexInputRow
            label1="Payment Credit" unit1="Days" name1="paymentCreditDays" value1={formData.paymentCreditDays}
            label2="Sold %" name2="soldPercentage" value2={formData.soldPercentage} unit2="" onChange={handleChange}
        />
        <ComplexInputRow
            label1="Auto PO" unit1="Lead Time" name1="autoPOLimit" value1={formData.autoPOLimit}
            label2="Rating" name2="autoPORating" value2={formData.autoPORating} unit2="" onChange={handleChange}
        />

        {/* Checkbox Rows */}
        <CheckboxRow
            mainLabel="Turnover" label1="Taxable" name1="taxable" value1={formData.taxable}
            label2="Limit" name2="limit" value2={formData.limit} onChange={handleChange}
        />
        <CheckboxRow
            mainLabel="Un Registered" label1="URD" name1="urd" value1={formData.urd}
            label2="Support PO" name2="supportPO" value2={formData.supportPO} onChange={handleChange}
        />
        
        <MsmeRow label="MSME No / TDS Group" inputName="msmeInput" selectName="msmeGroup"
          inputValue={formData.msmeInput} selectValue={formData.msmeGroup}
          onChange={handleChange} groupOptions={opts.tdsGroups} />

        <SelectInputRight label="Agent Name" name="agentName" value={formData.agentName} onChange={handleChange} options={opts.agents} />

        <DualTextFieldRight label="TAN / PAN" name1="tanPan1" value1={formData.tanPan1}
          name2="tanPan2" value2={formData.tanPan2} onChange={handleChange}
          placeholder1="TAN" placeholder2="PAN" />

        <BankBranchField label="Bank / Branch"
          bankName="bankId" bankValue={formData.bankId}
          branchName="bankBranch" branchValue={formData.bankBranch}
          onChange={handleChange} bankOptions={opts.banks} />

        <SingleInputRight label="Bank Account Name" name="bankAccountName" value={formData.bankAccountName} onChange={handleChange} />

        <DualTextFieldRight label="IFSC / Account No" name1="ifscAccountNo1" value1={formData.ifscAccountNo1}
          name2="ifscAccountNo2" value2={formData.ifscAccountNo2} onChange={handleChange}
          placeholder1="IFSC" placeholder2="Account No" />

        <DualTextFieldRight label="Added / Removed On" name1="addedRemovedOn1" value1={formData.addedRemovedOn1}
          name2="addedRemovedOn2" value2={formData.addedRemovedOn2} onChange={handleChange} />

        <RenamedRow label="Renamed" name="isRenamed" checked={formData.isRenamed}
          selectName="renamed" selectValue={formData.renamed} onChange={handleChange} />

        {/* Interstate Sale / Internal Transfer / Active */}
        <div className="flex items-center justify-between pt-4 pr-3">
            <BottomCheckboxGroup label="Interstate Sale" name="interstateSale" checked={formData.interstateSale} onChange={handleChange} />
            <BottomCheckboxGroup label="Internal Transfer" name="internalTransfer" checked={formData.internalTransfer} onChange={handleChange} />
            <BottomCheckboxGroup label="Active" name="active" checked={formData.active} onChange={handleChange} />
        </div>

      </div>
    </div>
  );



  const renderAdvanceTab = () => (
    <div className="grid grid-cols-3 gap-x-6 gap-y-3 p-4">

      {/* COLUMN 1: Address List */}
      <div className="col-span-1 space-y-3">
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Address List</h3>
        <AdvanceSelectInput label="Address type" name="advanceAddressType" required
          options={opts.addressTypes} value={formData.advanceAddressType} onChange={handleChange} />
        <AdvanceTextInput label="Contact No" name="advanceContactNo" required value={formData.advanceContactNo} onChange={handleChange} />
        <div className="flex">
          <label className="w-[35%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1 pt-1 text-left">
            <span className="text-red-500 mr-1">*</span>Address
          </label>
          <textarea name="advanceAddress" value={formData.advanceAddress} onChange={handleChange} rows="3"
            className="w-[65%] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
        </div>
        <AdvanceSelectInput label="City" name="advanceCity" options={opts.cities} value={formData.advanceCity} onChange={handleChange} />
        <AdvanceDualSelectInput label="State / Country"
          name1="advanceState" value1={formData.advanceState}
          name2="advanceCountry" value2={formData.advanceCountry}
          onChange={handleChange} options1={opts.states} options2={[]} />
        <div className="flex items-center">
          <label className="w-[35%] text-sm font-medium text-gray-700 dark:text-gray-300 pr-1 text-left">Pincode</label>
          <div className="w-[65%] flex items-center">
            <input type="text" name="advancePincode" value={formData.advancePincode} onChange={handleChange}
              className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
            <button className="glass-btn glass-btn-primary p-1.5 ml-1" type="button">
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 border border-gray-300 dark:border-gray-600 rounded-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="border-r dark:border-gray-600 px-2 py-1 text-left w-1/4">Type</th>
                <th className="border-r dark:border-gray-600 px-2 py-1 text-left w-1/2">Address</th>
                <th className="px-2 py-1 text-center w-1/4">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="px-2 py-4 text-gray-400 dark:text-gray-500 text-center" colSpan="3">No addresses added</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* COLUMN 2: Product & Brand */}
      <div className="col-span-1 space-y-3">
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Product</h3>
        <div className="flex items-center">
          <div className="flex-1">
            <AdvanceSelectInput label="Name" name="advanceProductName" options={opts.products} value={formData.advanceProductName} onChange={handleChange} />
          </div>
          <button className="glass-btn glass-btn-primary p-1.5 ml-1" type="button">
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="border-r dark:border-gray-600 px-2 py-1 text-left w-3/4">Name</th>
                <th className="px-2 py-1 text-center w-1/4">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="px-2 py-4 text-gray-400 dark:text-gray-500 text-center" colSpan="2">No products added</td></tr>
            </tbody>
          </table>
        </div>
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 pt-3">Brand</h3>
        <div className="flex items-center">
          <div className="flex-1">
            <AdvanceSelectInput label="Name" name="advanceBrandName" options={opts.brands} value={formData.advanceBrandName} onChange={handleChange} />
          </div>
          <button className="glass-btn glass-btn-primary p-1.5 ml-1" type="button">
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="border-r dark:border-gray-600 px-2 py-1 text-left w-3/4">Name</th>
                <th className="px-2 py-1 text-center w-1/4">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="px-2 py-4 text-gray-400 dark:text-gray-500 text-center" colSpan="2">No brands added</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* COLUMN 3: Remarks & Attachments */}
      <div className="col-span-1 space-y-3">
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Remarks</h3>
        <textarea name="advanceRemarks" value={formData.advanceRemarks} onChange={handleChange} rows="6"
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 pt-3">File Attachments</h3>
        <div className="flex items-center space-x-2">
          <div className="w-[45%]">
            <AdvanceSelectInput label="Type" name="advanceAttachmentType" required
              options={opts.documentTypes} value={formData.advanceAttachmentType} onChange={handleChange} />
          </div>
          <button className="glass-btn glass-btn-success flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Files
          </button>
          <button className="glass-btn glass-btn-primary">ADD</button>
        </div>
        <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="border-r dark:border-gray-600 px-2 py-1 text-left w-1/3">Image</th>
                <th className="border-r dark:border-gray-600 px-2 py-1 text-left w-1/3">Type</th>
                <th className="px-2 py-1 text-center w-1/3">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="px-2 py-4 text-gray-400 dark:text-gray-500 text-center" colSpan="3">No attachments</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );









// ----------------------------------------------------------------------------------




  const renderContent = () => {
    if (showSearchPage) {
        return (
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700 w-full h-full flex flex-col min-h-0">
                <h2 className="text-xl font-bold mb-3">Search Results</h2>
                <FilterableDataTable
                  rows={searchRows}
                  columns={supplierColumns}
                  loading={searchLoading}
                  searchPlaceholder="Search in supplier fields..."
                  searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
                  showExport={false}
                  enableColumnResize
                  tablePreferenceKey="masters.suppliers.list"
                  onRefresh={() => fetchSuppliers()}
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
                  onRowClick={loadSupplierForEdit}
                  paginationMode="server"
                  enableSelection
                  enableKeyboardNav
                  selectedRows={selectedRows}
                  onSelectionChange={setSelectedRows}
                  onBulkDelete={handleBulkDelete}
                  fillHeight
                  renderActions={(row, { selectedCount } = {}) => (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadSupplierForEdit(row)}
                        title="Edit"
                        disabled={selectedCount > 1}
                        className="glass-btn glass-btn-primary rounded p-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDlg({ open: true, id: row.id, name: row.name })}
                        className="glass-btn glass-btn-danger rounded p-1.5"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                />
            </div>
        );
    }

    return (
        <div
            ref={formContainerRef}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 w-full h-full flex flex-col min-h-0 overflow-hidden"
            data-enter-scope="true"
            onKeyDownCapture={handleEnterKeyNavigation}
        >
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 pt-2">
                <button
                    onClick={() => setActiveTab('Primary')}
                    className={`pb-2 px-3 text-sm font-medium ${activeTab === 'Primary' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    Primary
                </button>
                <button
                    onClick={() => setActiveTab('Advance')}
                    className={`pb-2 px-3 text-sm font-medium ${activeTab === 'Advance' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    Advance
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              {/* Tab Content */}
              {activeTab === 'Primary' && renderPrimaryTab()}
              {activeTab === 'Advance' && renderAdvanceTab()}
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <ConfirmDialog
        open={confirmDlg.open}
        message={`Are you sure you want to delete "${confirmDlg.name}"? This action cannot be undone.`}
        onConfirm={deleteSupplierConfirmed}
        onCancel={() => setConfirmDlg({ open: false, id: null, name: "" })}
      />
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
      {/* --- Header --- */}
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          
          <button 
            onClick={handleBackClick}
            className={`text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 `}
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
            <span>Supplier</span>
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          <button className="topbar-action-btn topbar-action-new" onClick={handleNew}>
            <PlusCircle className="w-4 h-4 mr-1" /> New
          </button>
          <span>|</span>
          <UploadImportButton
            endpoint="/suppliers/bulk"
            fieldConfig={SUPPLIER_IMPORT_CONFIG}
            onDone={() => {
              setShowSearchPage(true);
              if (page === 1) fetchSuppliers();
              else setPage(1);
            }}
          />
          {showSearchPage && (
            <>
              <span>|</span>
              <ExportBottomSheet
                columns={supplierColumns}
                rows={searchRows}
                selectedRowKeys={selectedRows}
                onExportRows={async () => {
                  const res = await api.get("/suppliers", { params: { all: "true" } });
                  return res.data?.data || [];
                }}
                fileName="suppliers"
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

      {/* --- Content --- */}
      <div className="flex-1 p-4 min-h-0">
        {renderContent()}
      </div>
      {/* --- END Content --- */}


    </div>
  );
};

export default Supplier;
