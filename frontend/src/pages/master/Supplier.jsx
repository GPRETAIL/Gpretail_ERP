import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, PlusCircle, Save, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import { createGroupFetchers } from "../../utils/serverGrouping";

// Matches config('pagination.resources.suppliers.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchSupplierGroupSummaries, onFetchGroupRows: fetchSupplierGroupRows } =
  createGroupFetchers("/suppliers", { city_id: "city" });
import { Box, Button, Card, Stack, Typography, TextField, MenuItem, IconButton, Checkbox, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";
import useStoreNameMap from "../../hooks/useStoreNameMap";
import { normalizeFormSignature } from "../../utils/formSignature";

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
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "50%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}{label}
    </Typography>
    <Stack direction="row" sx={{ flex: 1, alignItems: "center", ml: 1.5 }}>
      <TextField type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
        size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
      {icon && <IconButton className="glass-btn glass-btn-primary" sx={{ ml: 0.5, p: 0.75 }} type="button">{icon}</IconButton>}
    </Stack>
  </Stack>
);

const SelectInput = ({ label, name, required = false, options = [], value, onChange, icon = null, disabled = false }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "50%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}{label}
    </Typography>
    <Stack direction="row" sx={{ flex: 1, alignItems: "center", ml: 1.5 }}>
      <TextField select name={name} value={value} onChange={onChange} disabled={disabled}
        size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
        <MenuItem value="">Select {label}</MenuItem>
        {options.map((o, i) => <MenuItem key={i} value={o.value ?? o.label}>{o.label}</MenuItem>)}
      </TextField>
      {icon && <IconButton className="glass-btn glass-btn-primary" sx={{ ml: 0.5, p: 0.75 }} type="button">{icon}</IconButton>}
    </Stack>
  </Stack>
);

const DualSelectInput = ({ label, name1, value1, name2, value2, onChange, options1 = [], options2 = [], placeholder1 = "Select", placeholder2 = "Select" }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "50%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
    <Stack direction="row" sx={{ flex: 1, alignItems: "center", ml: 1.5, gap: 1 }}>
      <TextField select name={name1} value={value1} onChange={onChange} size="small" sx={{ width: "50%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
        <MenuItem value="">{placeholder1}</MenuItem>
        {options1.map((o, i) => <MenuItem key={i} value={o.value ?? o.label}>{o.label}</MenuItem>)}
      </TextField>
      <TextField select name={name2} value={value2} onChange={onChange} size="small" sx={{ width: "50%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
        <MenuItem value="">{placeholder2}</MenuItem>
        {options2.map((o, i) => <MenuItem key={i} value={o.value ?? o.label}>{o.label}</MenuItem>)}
      </TextField>
    </Stack>
  </Stack>
);

const SingleInputRight = ({ label, name, required = false, value, onChange, placeholder = "", type = "text" }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "30%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5 }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}{label}
    </Typography>
    <TextField type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      size="small" sx={{ width: "70%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
  </Stack>
);

const SelectInputRight = ({ label, name, required = false, options = [], value, onChange }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "30%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5 }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}{label}
    </Typography>
    <TextField select name={name} value={value} onChange={onChange}
      size="small" sx={{ width: "70%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
      <MenuItem value="">Select {label}</MenuItem>
      {options.map((o, i) => <MenuItem key={i} value={o.value ?? o.label}>{o.label}</MenuItem>)}
    </TextField>
  </Stack>
);

const BankBranchField = ({ label, bankName, bankValue, branchName, branchValue, onChange, bankOptions = [] }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "30%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5 }}>{label}</Typography>
    <Stack direction="row" sx={{ width: "70%", gap: 0.5 }}>
      <TextField select name={bankName} value={bankValue} onChange={onChange}
        size="small" sx={{ width: "50%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
        <MenuItem value="">Select Bank</MenuItem>
        {bankOptions.map((o, i) => <MenuItem key={i} value={o.value ?? o.label}>{o.label}</MenuItem>)}
      </TextField>
      <TextField type="text" name={branchName} value={branchValue} onChange={onChange} placeholder="Branch"
        size="small" sx={{ width: "50%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
    </Stack>
  </Stack>
);

const DualTextFieldRight = ({ label, name1, value1, name2, value2, onChange, placeholder1 = "", placeholder2 = "" }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "30%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5 }}>{label}</Typography>
    <Stack direction="row" sx={{ width: "70%", gap: 0.5 }}>
      <TextField type="text" name={name1} value={value1} onChange={onChange} placeholder={placeholder1}
        size="small" sx={{ width: "50%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
      <TextField type="text" name={name2} value={value2} onChange={onChange} placeholder={placeholder2}
        size="small" sx={{ width: "50%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
    </Stack>
  </Stack>
);

const MsmeRow = ({ label, inputName, selectName, inputValue, selectValue, onChange, groupOptions = [] }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "30%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5 }}>{label}</Typography>
    <Stack direction="row" sx={{ width: "70%", gap: 0.5 }}>
      <TextField type="text" name={inputName} value={inputValue} onChange={onChange}
        size="small" sx={{ width: "50%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
      <TextField select name={selectName} value={selectValue} onChange={onChange}
        size="small" sx={{ width: "50%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
        <MenuItem value="">Select Group</MenuItem>
        {groupOptions.map((o, i) => <MenuItem key={i} value={o.value ?? o.label}>{o.label}</MenuItem>)}
      </TextField>
    </Stack>
  </Stack>
);

const RenamedRow = ({ label, name, checked, selectName, selectValue, onChange, options = [] }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Stack component="label" direction="row" sx={{ width: "30%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5, alignItems: "center" }}>
      <Checkbox name={name} checked={checked} onChange={onChange} size="small" sx={{ p: 0, mr: 1 }} />
      {label}
    </Stack>
    <TextField select name={selectName} value={selectValue} onChange={onChange} disabled={!checked}
      size="small" sx={{ width: "70%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
      <MenuItem value="">Select Renamed</MenuItem>
      {options.map((o, i) => <MenuItem key={i} value={o.value ?? o.label}>{o.label}</MenuItem>)}
    </TextField>
  </Stack>
);

const ComplexInputRow = ({ label1, unit1, name1, unit2, name2, label2, value1, value2, onChange }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "30%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5 }}>{label1}</Typography>
    <Typography component="span" sx={{ width: "10%", fontSize: 10.5, color: "text.secondary", pr: 0.5 }}>{unit1}</Typography>
    <TextField type="text" name={name1} value={value1} onChange={onChange}
      size="small" sx={{ width: "20%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, textAlign: "right" } }} />
    <Typography component="span" sx={{ width: "10%", fontSize: 10.5, color: "text.secondary", textAlign: "center" }}>{label2}</Typography>
    <TextField type="text" name={name2} value={value2} onChange={onChange}
      size="small" sx={{ width: "20%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, textAlign: "right" } }} />
    <Typography component="span" sx={{ width: "10%", fontSize: 10.5, color: "text.secondary", textAlign: "left", pl: 0.5 }}>{unit2}</Typography>
  </Stack>
);

const CheckboxRow = ({ mainLabel, label1, name1, label2, name2, value1, value2, onChange }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "30%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5 }}>{mainLabel}</Typography>
    <Stack direction="row" sx={{ width: "30%", alignItems: "center", gap: 0.5 }}>
      <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary" }}>{label1}</Typography>
      <Checkbox name={name1} checked={value1} onChange={onChange} size="small" sx={{ p: 0 }} />
    </Stack>
    <Stack direction="row" sx={{ width: "40%", alignItems: "center", gap: 0.5 }}>
      <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary" }}>{label2}</Typography>
      {name2.includes("limit") ? (
        <TextField type="text" name={name2} value={value2} onChange={onChange}
          size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
      ) : (
        <Checkbox name={name2} checked={value2} onChange={onChange} size="small" sx={{ p: 0 }} />
      )}
    </Stack>
  </Stack>
);

const BottomCheckboxGroup = ({ label, name, checked, onChange }) => (
  <Stack component="label" direction="row" sx={{ alignItems: "center", gap: 1, fontSize: 12.25, color: "text.secondary", width: "33.33%" }}>
    <Checkbox name={name} checked={checked} onChange={onChange} size="small" sx={{ p: 0 }} />
    {label}
  </Stack>
);

const AdvanceTextInput = ({ label, name, required = false, value, onChange, placeholder = "", type = "text" }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "35%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5, textAlign: "left" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}{label}
    </Typography>
    <TextField type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      size="small" sx={{ width: "65%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
  </Stack>
);

const AdvanceSelectInput = ({ label, name, required = false, options = [], value, onChange }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "35%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5, textAlign: "left" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}{label}
    </Typography>
    <TextField select name={name} value={value} onChange={onChange}
      size="small" sx={{ width: "65%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
      <MenuItem value="">Select {label}</MenuItem>
      {options.map((o, i) => <MenuItem key={i} value={o.value ?? o.label}>{o.label}</MenuItem>)}
    </TextField>
  </Stack>
);

const AdvanceDualSelectInput = ({ label, name1, value1, name2, value2, onChange, options1 = [], options2 = [] }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "35%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5, textAlign: "left" }}>{label}</Typography>
    <Stack direction="row" sx={{ width: "65%", alignItems: "center", gap: 0.5 }}>
      <TextField select name={name1} value={value1} onChange={onChange}
        size="small" sx={{ width: "50%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
        <MenuItem value="">Select State</MenuItem>
        {options1.map((o, i) => <MenuItem key={i} value={o.value ?? o.label}>{o.label}</MenuItem>)}
      </TextField>
      <TextField select name={name2} value={value2} onChange={onChange}
        size="small" sx={{ width: "50%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
        <MenuItem value="">Select Country</MenuItem>
        {options2.map((o, i) => <MenuItem key={i} value={o.value ?? o.label}>{o.label}</MenuItem>)}
      </TextField>
    </Stack>
  </Stack>
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
  const [rawPagination, setRawPagination] = useState(null);
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
      api.get("/transports", { params: { limit: 100 } }).then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []),
      cfg("location"),
      api.get("/companies").then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []),
      cfg("supplier_group"),
      cfg("buyer_group"),
      cfg("delivery_location"),
      cfg("bank"),
      cfg("vendor"),
      cfg("tds_group"),
      cfg("address_type"),
      api.get("/products", { params: { limit: 300 } }).then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []),
      api.get("/brands", { params: { limit: 300 } }).then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []),
      cfg("document_type"),
    ]).then(([cities, states, transports, locations, companies, supplierGroups, buyerGroups,
      deliveryLocations, banks, agents, tdsGroups, addressTypes, products, brands, documentTypes]) => {
      setOpts({ cities, states, transports, locations, companies, supplierGroups, buyerGroups,
        deliveryLocations, banks, agents, tdsGroups, addressTypes, products, brands, documentTypes });
    });
  }, []);

  // Preloads above are capped batches -- these hit each resource's own ?search= endpoint so
  // AsyncSearchSelect can find anything beyond that initial batch.
  const handleAsyncTransportSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/transports", { params: { search: query, limit: 50 } });
      const mapped = (res.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }));
      if (mapped.length) {
        setOpts((prev) => {
          const existingIds = new Set(prev.transports.map((o) => o.value));
          return { ...prev, transports: [...prev.transports, ...mapped.filter((o) => !existingIds.has(o.value))] };
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, []);

  const handleAsyncProductSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/products", { params: { search: query, limit: 50 } });
      const mapped = (res.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }));
      if (mapped.length) {
        setOpts((prev) => {
          const existingIds = new Set(prev.products.map((o) => o.value));
          return { ...prev, products: [...prev.products, ...mapped.filter((o) => !existingIds.has(o.value))] };
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, []);

  const handleAsyncBrandSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/brands", { params: { search: query, limit: 50 } });
      const mapped = (res.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }));
      if (mapped.length) {
        setOpts((prev) => {
          const existingIds = new Set(prev.brands.map((o) => o.value));
          return { ...prev, brands: [...prev.brands, ...mapped.filter((o) => !existingIds.has(o.value))] };
        });
      }
      return mapped;
    } catch {
      return [];
    }
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
    initialFormRef.current = { id: null, sig: null };
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
        && normalizeFormSignature(formData) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (currentId) {
        await api.put(`/suppliers/${currentId}`, formData);
        initialFormRef.current = { id: currentId, sig: normalizeFormSignature(formData) };
        toast.success("Supplier updated successfully");
      } else {
        const res = await api.post("/suppliers", formData);
        const newId = res.data.data.id;
        setCurrentId(newId);
        initialFormRef.current = { id: newId, sig: normalizeFormSignature(formData) };
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

  const fetchSuppliers = async (queryOverride = tableSearch, cursorToken = null) => {
    try {
      setSearchLoading(true);
      const query = String(queryOverride || "").trim();
      const params = {
        ...(cursorToken ? { cursor: cursorToken } : { page }),
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
      setRawPagination(res.data?.pagination || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load suppliers");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSupplierNextCursor = (cursor) => fetchSuppliers(tableSearch, cursor);
  const handleSupplierPreviousCursor = (cursor) => fetchSuppliers(tableSearch, cursor);

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
    const loadedData = {
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
    };
    setFormData(loadedData);
    initialFormRef.current = { id: row.id, sig: normalizeFormSignature(loadedData) };
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
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, columnGap: 4, rowGap: 1.5, p: 2 }}>
      {/* --- LEFT COLUMN --- */}
      <Stack sx={{ gap: 1.5 }}>
        {/* Code / Input Combo */}
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <Typography component="label" sx={{ width: "50%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Code</Typography>
          <Stack direction="row" sx={{ flex: 1, alignItems: "center", ml: 1.5, gap: 1 }}>
            <TextField select defaultValue="Supplier" size="small" sx={{ width: "33.33%", "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}>
                <MenuItem value="Supplier">Supplier</MenuItem>
                <MenuItem value="Job Worker">Job Worker</MenuItem>
                <MenuItem value="Agent">Agent</MenuItem>
            </TextField>
            <TextField
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
            />
          </Stack>
        </Stack>

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

        <Stack direction="row" sx={{ alignItems: "center" }}>
          <Typography component="label" sx={{ width: "50%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Transport</Typography>
          <Box sx={{ flex: 1, ml: 1.5 }}>
            <AsyncSearchSelect
              name="transport"
              value={formData.transport}
              onChange={handleChange}
              options={opts.transports}
              onAsyncSearch={handleAsyncTransportSearch}
              placeholder="Select Transport"
              searchPlaceholder="Search transports..."
            />
          </Box>
        </Stack>

        <DualSelectInput label="Supplier / Buyer Group"
          name1="supplierGroup" value1={formData.supplierGroup}
          name2="buyerGroup" value2={formData.buyerGroup}
          onChange={handleChange}
          options1={opts.supplierGroups} options2={opts.buyerGroups}
          placeholder1="Supplier Group" placeholder2="Buyer Group" />

        <SelectInput label="Delivery Location" name="deliveryLocation" value={formData.deliveryLocation} onChange={handleChange} options={opts.deliveryLocations} />
      </Stack>

      {/* --- RIGHT COLUMN --- */}
      <Stack sx={{ gap: 1.5 }}>
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
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", pt: 2, pr: 1.5 }}>
            <BottomCheckboxGroup label="Interstate Sale" name="interstateSale" checked={formData.interstateSale} onChange={handleChange} />
            <BottomCheckboxGroup label="Internal Transfer" name="internalTransfer" checked={formData.internalTransfer} onChange={handleChange} />
            <BottomCheckboxGroup label="Active" name="active" checked={formData.active} onChange={handleChange} />
        </Stack>

      </Stack>
    </Box>
  );



  const renderAdvanceTab = () => (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", columnGap: 3, rowGap: 1.5, p: 2 }}>

      {/* COLUMN 1: Address List */}
      <Stack sx={{ gridColumn: "span 1", gap: 1.5 }}>
        <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main" }}>Address List</Typography>
        <AdvanceSelectInput label="Address type" name="advanceAddressType" required
          options={opts.addressTypes} value={formData.advanceAddressType} onChange={handleChange} />
        <AdvanceTextInput label="Contact No" name="advanceContactNo" required value={formData.advanceContactNo} onChange={handleChange} />
        <Stack direction="row">
          <Typography component="label" sx={{ width: "35%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5, pt: 0.5, textAlign: "left" }}>
            <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>Address
          </Typography>
          <TextField name="advanceAddress" value={formData.advanceAddress} onChange={handleChange} rows={3} multiline
            size="small" sx={{ width: "65%", "& .MuiInputBase-input": { fontSize: 12.25 } }} />
        </Stack>
        <AdvanceSelectInput label="City" name="advanceCity" options={opts.cities} value={formData.advanceCity} onChange={handleChange} />
        <AdvanceDualSelectInput label="State / Country"
          name1="advanceState" value1={formData.advanceState}
          name2="advanceCountry" value2={formData.advanceCountry}
          onChange={handleChange} options1={opts.states} options2={[]} />
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <Typography component="label" sx={{ width: "35%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5, textAlign: "left" }}>Pincode</Typography>
          <Stack direction="row" sx={{ width: "65%", alignItems: "center" }}>
            <TextField type="text" name="advancePincode" value={formData.advancePincode} onChange={handleChange}
              size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            <IconButton className="glass-btn glass-btn-primary" sx={{ ml: 0.5, p: 0.75 }} type="button">
              <PlusCircle className="w-4 h-4" />
            </IconButton>
          </Stack>
        </Stack>
        <Box sx={{ mt: 2, border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden" }}>
          <Table sx={{ width: "100%" }} size="small">
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell sx={{ borderRight: 1, borderColor: "divider", width: "25%" }}>Type</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider", width: "50%" }}>Address</TableCell>
                <TableCell align="center" sx={{ width: "25%" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow><TableCell colSpan={3} sx={{ py: 2, textAlign: "center", color: "text.disabled" }}>No addresses added</TableCell></TableRow>
            </TableBody>
          </Table>
        </Box>
      </Stack>

      {/* COLUMN 2: Product & Brand */}
      <Stack sx={{ gridColumn: "span 1", gap: 1.5 }}>
        <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main" }}>Product</Typography>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "35%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5, textAlign: "left" }}>Name</Typography>
              <Box sx={{ width: "65%" }}>
                <AsyncSearchSelect
                  name="advanceProductName"
                  options={opts.products}
                  value={formData.advanceProductName}
                  onChange={handleChange}
                  onAsyncSearch={handleAsyncProductSearch}
                  placeholder="Select Name"
                  searchPlaceholder="Search products..."
                />
              </Box>
            </Stack>
          </Box>
          <IconButton className="glass-btn glass-btn-primary" sx={{ ml: 0.5, p: 0.75 }} type="button">
            <PlusCircle className="w-4 h-4" />
          </IconButton>
        </Stack>
        <Box sx={{ mt: 1, border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden" }}>
          <Table sx={{ width: "100%" }} size="small">
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell sx={{ borderRight: 1, borderColor: "divider", width: "75%" }}>Name</TableCell>
                <TableCell align="center" sx={{ width: "25%" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow><TableCell colSpan={2} sx={{ py: 2, textAlign: "center", color: "text.disabled" }}>No products added</TableCell></TableRow>
            </TableBody>
          </Table>
        </Box>
        <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main", pt: 1.5 }}>Brand</Typography>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "35%", fontSize: 12.25, fontWeight: 500, color: "text.secondary", pr: 0.5, textAlign: "left" }}>Name</Typography>
              <Box sx={{ width: "65%" }}>
                <AsyncSearchSelect
                  name="advanceBrandName"
                  options={opts.brands}
                  value={formData.advanceBrandName}
                  onChange={handleChange}
                  onAsyncSearch={handleAsyncBrandSearch}
                  placeholder="Select Name"
                  searchPlaceholder="Search brands..."
                />
              </Box>
            </Stack>
          </Box>
          <IconButton className="glass-btn glass-btn-primary" sx={{ ml: 0.5, p: 0.75 }} type="button">
            <PlusCircle className="w-4 h-4" />
          </IconButton>
        </Stack>
        <Box sx={{ mt: 1, border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden" }}>
          <Table sx={{ width: "100%" }} size="small">
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell sx={{ borderRight: 1, borderColor: "divider", width: "75%" }}>Name</TableCell>
                <TableCell align="center" sx={{ width: "25%" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow><TableCell colSpan={2} sx={{ py: 2, textAlign: "center", color: "text.disabled" }}>No brands added</TableCell></TableRow>
            </TableBody>
          </Table>
        </Box>
      </Stack>

      {/* COLUMN 3: Remarks & Attachments */}
      <Stack sx={{ gridColumn: "span 1", gap: 1.5 }}>
        <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main" }}>Remarks</Typography>
        <TextField name="advanceRemarks" value={formData.advanceRemarks} onChange={handleChange} rows={6} multiline
          size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }} />
        <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main", pt: 1.5 }}>File Attachments</Typography>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Box sx={{ width: "45%" }}>
            <AdvanceSelectInput label="Type" name="advanceAttachmentType" required
              options={opts.documentTypes} value={formData.advanceAttachmentType} onChange={handleChange} />
          </Box>
          <Button className="glass-btn glass-btn-success" startIcon={
            <Box component="svg" sx={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </Box>
          }>
            Upload Files
          </Button>
          <Button className="glass-btn glass-btn-primary">ADD</Button>
        </Stack>
        <Box sx={{ mt: 1, border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden" }}>
          <Table sx={{ width: "100%" }} size="small">
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell sx={{ borderRight: 1, borderColor: "divider", width: "33.33%" }}>Image</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider", width: "33.33%" }}>Type</TableCell>
                <TableCell align="center" sx={{ width: "33.33%" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow><TableCell colSpan={3} sx={{ py: 2, textAlign: "center", color: "text.disabled" }}>No attachments</TableCell></TableRow>
            </TableBody>
          </Table>
        </Box>
      </Stack>
    </Box>
  );









// ----------------------------------------------------------------------------------




  const renderContent = () => {
    if (showSearchPage) {
        return (
            <Card variant="outlined" sx={{ p: 2, width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5, fontSize: "1.25rem" }}>Search Results</Typography>
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
                  pagination={rawPagination}
                  onPageChange={setPage}
                  onNextCursor={handleSupplierNextCursor}
                  onPreviousCursor={handleSupplierPreviousCursor}
                  onFetchGroupSummaries={fetchSupplierGroupSummaries}
                  onFetchGroupRows={fetchSupplierGroupRows}
                  onLimitChange={(value) => {
                    setLimit(value);
                    setPage(1);
                  }}
                  onRowClick={loadSupplierForEdit}
                  paginationMode="server"
                  enableVirtualization
                  enableSelection
                  enableKeyboardNav
                  selectedRows={selectedRows}
                  onSelectionChange={setSelectedRows}
                  onBulkDelete={handleBulkDelete}
                  fillHeight
                  renderActions={(row, { selectedCount } = {}) => (
                    <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                      <IconButton
                        type="button"
                        onClick={() => loadSupplierForEdit(row)}
                        title="Edit"
                        disabled={selectedCount > 1}
                        className="glass-btn glass-btn-primary"
                        sx={{ borderRadius: "3.5px", p: 0.75 }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </IconButton>
                      <IconButton
                        type="button"
                        onClick={() => setConfirmDlg({ open: true, id: row.id, name: row.name })}
                        className="glass-btn glass-btn-danger"
                        sx={{ borderRadius: "3.5px", p: 0.75 }}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </Stack>
                  )}
                />
            </Card>
        );
    }

    return (
        <Card
            variant="outlined"
            ref={formContainerRef}
            sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}
            data-enter-scope="true"
            onKeyDownCapture={handleEnterKeyNavigation}
        >
            {/* Tabs */}
            <Stack direction="row" sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 1 }}>
                <Box
                    component="button"
                    onClick={() => setActiveTab('Primary')}
                    sx={{
                      pb: 1, px: 1.5, fontSize: 12.25, fontWeight: 500,
                      color: activeTab === 'Primary' ? "primary.main" : "text.secondary",
                      borderBottom: activeTab === 'Primary' ? 2 : 0,
                      borderColor: "primary.main",
                      "&:hover": activeTab !== 'Primary' ? { color: "text.primary" } : undefined,
                    }}
                >
                    Primary
                </Box>
                <Box
                    component="button"
                    onClick={() => setActiveTab('Advance')}
                    sx={{
                      pb: 1, px: 1.5, fontSize: 12.25, fontWeight: 500,
                      color: activeTab === 'Advance' ? "primary.main" : "text.secondary",
                      borderBottom: activeTab === 'Advance' ? 2 : 0,
                      borderColor: "primary.main",
                      "&:hover": activeTab !== 'Advance' ? { color: "text.primary" } : undefined,
                    }}
                >
                    Advance
                </Box>
            </Stack>

            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              {/* Tab Content */}
              {activeTab === 'Primary' && renderPrimaryTab()}
              {activeTab === 'Advance' && renderAdvanceTab()}
            </Box>
        </Card>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", bgcolor: "background.default", color: "text.primary" }}>
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
      <PageHeader
        title={
          <Stack direction="row" sx={{ alignItems: "center" }} spacing={0.5}>
            <Box
              component="button"
              type="button"
              onClick={() => navigate("/masters")}
              sx={{ color: "primary.main", "&:hover": { color: "primary.dark", textDecoration: "underline" } }}
            >
              Master
            </Box>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Supplier</Box>
          </Stack>
        }
        onBack={handleBackClick}
        actions={
          <Stack direction="row" sx={{ alignItems: "center" }} spacing={1.5}>
            <Button
              variant="text"
              className="topbar-action-btn topbar-action-new"
              onClick={handleNew}
              startIcon={<PlusCircle className="w-4 h-4" />}
              size="small"
            >
              New
            </Button>
            <Typography variant="body2" component="span" sx={{ color: "text.disabled" }}>|</Typography>
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
                <Typography variant="body2" component="span" sx={{ color: "text.disabled" }}>|</Typography>
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
            {!showSearchPage && (
              <>
                <Typography variant="body2" component="span" sx={{ color: "text.disabled" }}>|</Typography>
                <Button
                  className="glass-btn glass-btn-success"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={<Save className="w-4 h-4" />}
                  size="small"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            )}
            <Typography variant="body2" component="span" sx={{ color: "text.disabled" }}>|</Typography>
            <Button
              className="glass-btn glass-btn-primary"
              onClick={handleSearchClick}
              startIcon={<Search className="w-4 h-4" />}
              size="small"
            >
              Search
            </Button>
          </Stack>
        }
      />
      {/* --- END Header --- */}

      {/* --- Content --- */}
      <Box sx={{ flex: 1, p: 1.5, minHeight: 0 }}>
        {renderContent()}
      </Box>
      {/* --- END Content --- */}
    </Box>
  );
};

export default Supplier;
