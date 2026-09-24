import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, PlusCircle, Save, Search, Trash2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import { createGroupFetchers } from "../../utils/serverGrouping";

// Matches config('pagination.resources.employees.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchEmployeeGroupSummaries, onFetchGroupRows: fetchEmployeeGroupRows } =
  createGroupFetchers("/employees", { is_active: "is_active" });
import { Box, Button, Card, Stack, Typography, IconButton, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import { fieldBaseSx } from "../../theme/formControlSizes";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";
import useStoreNameMap from "../../hooks/useStoreNameMap";
import { normalizeFormSignature } from "../../utils/formSignature";

const EMPLOYEE_IMPORT_CONFIG = {
  aliases: {
    employeecode: "employee_code",
    contactno: "contact_no",
    name: "name",
    surname: "surname",
    gender: "gender",
    department: "department_id",
    departmentid: "department_id",
    company: "company_id",
    companyid: "company_id",
    section: "section_id",
    sectionid: "section_id",
    designation: "designation_id",
    designationid: "designation_id",
    workinglocation: "working_location_id",
    workinglocationid: "working_location_id",
    floor: "floor_id",
    floorid: "floor_id",
    managerdesignation: "manager_designation_id",
    managerdesignationid: "manager_designation_id",
    email: "email_id",
    emailid: "email_id",
    dateofbirth: "date_of_birth",
    dateofjoining: "date_of_joining",
    holdsalary: "hold_salary",
    holdsalarydate: "hold_salary_date",
    reasonchecked: "reason_checked",
    allowsystem: "allow_system",
    systemusername: "system_username",
    salarymode: "salary_mode",
    salarystructure: "salary_structure_id",
    salarystructureid: "salary_structure_id",
    workingmode: "working_mode",
    workinghour: "working_hour_id",
    workinghourid: "working_hour_id",
    weekoff: "week_off",
    grosspay: "gross_pay",
    incentivepct: "incentive_pct",
    referredby: "referred_by",
    leaveencashment: "leave_encashment",
    bank: "bank_id",
    currcity: "curr_city_id",
    currstate: "curr_state_id",
    permcity: "perm_city_id",
    permstate: "perm_state_id",
    eot: "e_ot",
    mot: "m_ot",
    beta: "beta",
    isactive: "is_active",
    active: "is_active",
  },
  required: ["name"],
  boolFields: [
    "hold_salary", "reason_checked", "allow_system", "e_ot", "m_ot", "beta", "is_active",
  ],
  sampleFileName: "employee_sample.xlsx",
  sampleHeaders: [
    "employee_code", "contact_no", "name", "surname", "gender",
    "department", "company", "section", "designation", "working_location",
    "floor", "manager_designation", "email", "date_of_birth", "date_of_joining",
    "hold_salary", "hold_salary_date", "reason_checked", "reason", "allow_system", "system_username",
    "salary_mode", "salary_structure", "working_mode", "working_hour", "week_off",
    "gross_pay", "incentive_pct", "referred_by", "leave_encashment", "e_ot", "m_ot", "beta",
    "pf_no", "pf_eligible_date", "pf_uan", "esi_no", "esi_eligible_date",
    "father_name", "father_alive", "father_number", "father_live_with",
    "mother_name", "mother_alive", "mother_number", "mother_live_with",
    "marital_status", "marriage_date", "spouse_name", "spouse_alive", "spouse_mobile_no",
    "spouse_live_with", "languages_known", "strength", "blood_group", "nationality",
    "expected_salary", "expected_designation", "bank", "bank_account_name",
    "bank_account_no", "bank_ifsc", "license_number", "license_issue_date", "license_issue_at",
    "license_expiry", "aadhar_number", "voter_id", "smart_card_number", "pan_number",
    "passport_number", "passport_expiry", "npr_number",
    "curr_resident_no", "curr_resident_name", "curr_street", "curr_area", "curr_village",
    "curr_city", "curr_district", "curr_state", "curr_pincode",
    "perm_resident_no", "perm_resident_name", "perm_street", "perm_area", "perm_village",
    "perm_city", "perm_district", "perm_state", "perm_pincode", "is_active",
  ],
};

// ─── Helper components (module-level to avoid re-mount on re-render) ─────────

const TextInput = ({ label, name, required = false, value, onChange, placeholder = "", type = "text", disabled = false, sx }) => (
  <Stack direction="row" sx={{ alignItems: "center", ...sx }}>
    <Typography component="label" sx={{ width: "40%", flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}{label}
    </Typography>
    <Stack direction="row" sx={{ flex: 1, minWidth: 0, alignItems: "center" }}>
      <Box component="input" type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} sx={{ width: "100%", minWidth: 0, ...fieldBaseSx(disabled) }} />
    </Stack>
  </Stack>
);

const SelectInput = ({ label, name, required = false, options = [], value, onChange, disabled = false, sx }) => (
  <Stack direction="row" sx={{ alignItems: "center", ...sx }}>
    <Typography component="label" sx={{ width: "40%", flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}{label}
    </Typography>
    <Stack direction="row" sx={{ flex: 1, minWidth: 0, alignItems: "center" }}>
      <Box component="select" name={name} value={value} onChange={onChange} disabled={disabled} sx={{ width: "100%", minWidth: 0, ...fieldBaseSx(disabled) }}>
        <option value="">Select {label}</option>
        {options.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
      </Box>
    </Stack>
  </Stack>
);

const CheckboxInput = ({ label, name, checked, onChange, disabled = false, sx }) => (
  <Stack direction="row" sx={{ alignItems: "center", ...sx }}>
    <Typography component="label" sx={{ width: "40%", flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>{label}</Typography>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box component="input" type="checkbox" name={name} checked={checked} onChange={onChange} disabled={disabled} sx={{ width: 14, height: 14, m: 0, accentColor: "#2563eb" }} />
    </Box>
  </Stack>
);

const CheckboxWithField = ({ label, checkName, checked, fieldName, fieldValue, onChange, fieldType = "text", fieldPlaceholder = "", sx }) => (
  <Stack direction="row" sx={{ alignItems: "center", ...sx }}>
    <Typography component="label" sx={{ width: "40%", flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>{label}</Typography>
    <Stack direction="row" sx={{ flex: 1, minWidth: 0, alignItems: "center", gap: 0.75 }}>
      <Box component="input" type="checkbox" name={checkName} checked={checked} onChange={onChange} sx={{ width: 14, height: 14, m: 0, accentColor: "#2563eb" }} />
      <Box component="input" type={fieldType} name={fieldName} value={fieldValue} onChange={onChange} disabled={!checked} placeholder={fieldPlaceholder} sx={{ width: "100%", minWidth: 0, ...fieldBaseSx(!checked) }} />
    </Stack>
  </Stack>
);

// Right side text input with narrower label
const RTextInput = ({ label, name, required = false, value, onChange, placeholder = "", type = "text", disabled = false }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "33%", flexShrink: 0, pr: 1.5, fontSize: 11.5, fontWeight: 500, color: "text.secondary", textAlign: "right" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}{label}
    </Typography>
    <Box component="input" type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} sx={{ width: "67%", minWidth: 0, ...fieldBaseSx(disabled) }} />
  </Stack>
);

const RSelectInput = ({ label, name, required = false, options = [], value, onChange, disabled = false }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "33%", flexShrink: 0, pr: 1.5, fontSize: 11.5, fontWeight: 500, color: "text.secondary", textAlign: "right" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}{label}
    </Typography>
    <Box component="select" name={name} value={value} onChange={onChange} disabled={disabled} sx={{ width: "67%", minWidth: 0, ...fieldBaseSx(disabled) }}>
      <option value="">Select {label}</option>
      {options.map((o, i) => <option key={i} value={o.value ?? o.label}>{o.label}</option>)}
    </Box>
  </Stack>
);

const RCheckboxInput = ({ label, name, checked, onChange }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "33%", flexShrink: 0, pr: 1.5, fontSize: 11.5, fontWeight: 500, color: "text.secondary", textAlign: "right" }}>{label}</Typography>
    <Box component="input" type="checkbox" name={name} checked={checked} onChange={onChange} sx={{ width: 14, height: 14, m: 0, accentColor: "#2563eb" }} />
  </Stack>
);

// ─── Static options ──────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Trans", value: "Trans" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

const SALARY_MODE_OPTIONS = [
  { label: "Monthly", value: "Monthly" },
  { label: "Daily", value: "Daily" },
];

const WORKING_MODE_OPTIONS = [
  { label: "Temporary", value: "Temporary" },
  { label: "Probation", value: "Probation" },
  { label: "Permanent", value: "Permanent" },
];

const WEEK_OFF_OPTIONS = [
  { label: "Dynamic", value: "Dynamic" },
  { label: "Monday", value: "Monday" },
  { label: "Tuesday", value: "Tuesday" },
  { label: "Wednesday", value: "Wednesday" },
  { label: "Thursday", value: "Thursday" },
  { label: "Friday", value: "Friday" },
  { label: "Saturday", value: "Saturday" },
  { label: "Sunday", value: "Sunday" },
];

const LEAVE_ENCASHMENT_OPTIONS = [
  { label: "None", value: "None" },
  { label: "Additional", value: "Additional" },
  { label: "Adjustment", value: "Adjustment" },
  { label: "Automatic", value: "Automatic" },
  { label: "Fixed", value: "Fixed" },
];

const BLOOD_GROUP_OPTIONS = [
  { label: "A+", value: "A+" }, { label: "A-", value: "A-" },
  { label: "B+", value: "B+" }, { label: "B-", value: "B-" },
  { label: "AB+", value: "AB+" }, { label: "AB-", value: "AB-" },
  { label: "O+", value: "O+" }, { label: "O-", value: "O-" },
];

const MARITAL_STATUS_OPTIONS = [
  { label: "Single", value: "Single" },
  { label: "Married", value: "Married" },
  { label: "Divorced", value: "Divorced" },
  { label: "Widowed", value: "Widowed" },
];

const RIGHT_TABS = [
  "PF and ESI", "Personal", "Bank", "ID Proof", "Family",
  "Address", "Education/Exp", "Additional Info", "Training", "Classification",
];

// ─── Blank form factory ─────────────────────────────────────────────────────

const blankForm = () => ({
  employee_code: "", contact_no: "", name: "", surname: "", gender: "",
  department_id: "", company_id: "", section_id: "", designation_id: "",
  working_location_id: "", floor_id: "", manager_designation_id: "",
  email_id: "", date_of_birth: "", date_of_joining: "",
  hold_salary: false, hold_salary_date: "",
  reason_checked: false, reason: "",
  allow_system: false, system_username: "",
  salary_mode: "", salary_structure_id: "", working_mode: "",
  working_hour_id: "", week_off: "", gross_pay: "", incentive_pct: "",
  referred_by: "", leave_encashment: "",
  e_ot: false, m_ot: false, beta: false,
  // PF & ESI
  pf_no: "", pf_eligible_date: "", pf_uan: "", esi_no: "", esi_eligible_date: "",
  // Personal
  father_name: "", father_alive: false, father_number: "", father_live_with: false,
  mother_name: "", mother_alive: false, mother_number: "", mother_live_with: false,
  marital_status: "", marriage_date: "", spouse_name: "", spouse_alive: false,
  spouse_mobile_no: "", spouse_live_with: false, languages_known: "", strength: "",
  blood_group: "", nationality: "", expected_salary: "", expected_designation: "",
  // Bank
  bank_id: "", bank_account_name: "", bank_account_no: "", bank_ifsc: "",
  license_number: "", license_issue_date: "", license_issue_at: "", license_expiry: "",
  // ID Proof
  aadhar_number: "", voter_id: "", smart_card_number: "", pan_number: "",
  passport_number: "", passport_expiry: "", npr_number: "",
  // Address - Current
  curr_resident_no: "", curr_resident_name: "", curr_street: "", curr_area: "",
  curr_village: "", curr_city_id: "", curr_district: "", curr_state_id: "", curr_pincode: "",
  // Address - Permanent
  perm_resident_no: "", perm_resident_name: "", perm_street: "", perm_area: "",
  perm_village: "", perm_city_id: "", perm_district: "", perm_state_id: "", perm_pincode: "",
  is_active: true,
});

// ─── Main Component ──────────────────────────────────────────────────────────

const Employee = () => {
  const navigate = useNavigate();
  const [showSearchPage, setShowSearchPage] = useState(true);
  const [currentId, setCurrentId] = useState(null);
  const initialFormRef = useRef({ id: null, sig: null });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard
  const storeMap = useStoreNameMap();
  const [formData, setFormData] = useState(blankForm());
  const [rightTab, setRightTab] = useState("PF and ESI");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [rawPagination, setRawPagination] = useState(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [forceFetchAll, setForceFetchAll] = useState(false);
  const [searchLoading, setSearchLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });

  // Dynamic list states
  const [familyList, setFamilyList] = useState([]);
  const [familyForm, setFamilyForm] = useState({ name: "", gender: "", age: "", qualification: "", date_of_birth: "", relation: "" });
  const [eduExpTab, setEduExpTab] = useState("education");
  const [educationList, setEducationList] = useState([]);
  const [educationForm, setEducationForm] = useState({ qualification_type: "", name: "", institution: "", place: "", year: "", percentage: "" });
  const [experienceList, setExperienceList] = useState([]);
  const [experienceForm, setExperienceForm] = useState({ name: "", institution: "", place: "", year: "", salary: "" });
  const [additionalInfoList, setAdditionalInfoList] = useState([]);
  const [additionalInfoForm, setAdditionalInfoForm] = useState({ date: "", name: "", value: "" });
  const [trainingList, setTrainingList] = useState([]);
  const [trainingForm, setTrainingForm] = useState({ training_name: "", given_on: "", remark: "", confirmation_date: "", completion_date: "", notice_period: "" });
  const [classificationList, setClassificationList] = useState([]);
  const [classificationForm, setClassificationForm] = useState({ valid_from: "", valid_to: "", designation_id: "", department_id: "", section_id: "", floor_id: "" });

  // Dropdown data
  const [opts, setOpts] = useState({
    departments: [], companies: [], sections: [], designations: [],
    locations: [], floors: [], salaryStructures: [], workingHours: [],
    banks: [], cities: [], states: [],
  });

  // Load dropdown data
  useEffect(() => {
    const hr = (type) =>
      api.get(`/hr-${type}`).then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []);
    const cfg = (type) =>
      api.get(`/configurations/${type}`).then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []);

    Promise.all([
      hr("departments"),
      api.get("/companies").then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name }))).catch(() => []),
      hr("sections"),
      hr("designations"),
      cfg("location"),
      hr("floors"),
      hr("salary-structures"),
      hr("working-hours"),
      cfg("bank"),
      cfg("city"),
      cfg("state"),
    ]).then(([departments, companies, sections, designations, locations, floors, salaryStructures, workingHours, banks, cities, states]) => {
      setOpts({ departments, companies, sections, designations, locations, floors, salaryStructures, workingHours, banks, cities, states });
    });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleNew = () => {
    setCurrentId(null);
    setFormData(blankForm());
    setFamilyList([]); setEducationList([]); setExperienceList([]);
    setAdditionalInfoList([]); setTrainingList([]); setClassificationList([]);
    initialFormRef.current = { id: null, sig: null };
    setShowSearchPage(false);
    setRightTab("PF and ESI");
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("Name is required"); return; }
    const currentPayload = {
      formData,
      families: familyList,
      educations: educationList,
      experiences: experienceList,
      additionalInfos: additionalInfoList,
      trainings: trainingList,
      classifications: classificationList,
    };
    if (currentId && initialFormRef.current.id === currentId
        && normalizeFormSignature(currentPayload) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        families: familyList,
        educations: educationList,
        experiences: experienceList,
        additionalInfos: additionalInfoList,
        trainings: trainingList,
        classifications: classificationList,
      };
      if (currentId) {
        await api.put(`/employees/${currentId}`, payload);
        initialFormRef.current = { id: currentId, sig: normalizeFormSignature(currentPayload) };
        toast.success("Employee updated successfully");
      } else {
        const res = await api.post("/employees", payload);
        const newId = res.data.data.id;
        setCurrentId(newId);
        initialFormRef.current = { id: newId, sig: normalizeFormSignature(currentPayload) };
        toast.success("Employee saved successfully");
      }
      // Clear form after successful save
      setCurrentId(null);
      setFormData(blankForm());
      setFamilyList([]); setEducationList([]); setExperienceList([]);
      setAdditionalInfoList([]); setTrainingList([]); setClassificationList([]);
      initialFormRef.current = { id: null, sig: null };
      setRightTab("PF and ESI");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save employee");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSearch = async (queryOverride = tableSearch, cursorToken = null) => {
    try {
      setSearchLoading(true);
      const query = String(queryOverride || "").trim();
      const params = (query || forceFetchAll)
        ? { all: "true", search: query || undefined, field: tableSearchField !== "all" ? tableSearchField : undefined }
        : { ...(cursorToken ? { cursor: cursorToken } : { page }), limit };
      const res = await api.get("/employees", { params });
      const rows = res.data?.data || [];
      setSearchResults(rows);
      if (query) {
        setPagination({ total: rows.length, totalPages: 1 });
        setRawPagination(null);
      } else {
        const p = res.data?.pagination || {};
        const total = Number(p.total ?? res.data?.total ?? rows.length) || 0;
        const totalPages = Math.max(
          Number(p.totalPages ?? res.data?.totalPages ?? Math.ceil(total / Math.max(limit, 1))) || 1,
          1
        );
        setPagination({ total, totalPages });
        setRawPagination(res.data?.pagination || null);
      }
      setShowSearchPage(true);
    } catch {
      toast.error("Failed to search employees");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleEmployeeNextCursor = (cursor) => handleSearch(tableSearch, cursor);
  const handleEmployeePreviousCursor = (cursor) => handleSearch(tableSearch, cursor);

  useEffect(() => {
    if (showSearchPage) handleSearch();
  }, [showSearchPage, page, limit, tableSearch, forceFetchAll]);

  const handleServerSearch = useCallback(({ query, field, fetchAll }) => {
    setTableSearch(query);
    setTableSearchField(field || "all");
    setForceFetchAll(!!fetchAll);
    setPage(1);
  }, []);

  const handleBackClick = () => {
    if (showSearchPage) {
      navigate("/hrms");
      return;
    }
    setShowSearchPage(true);
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/employees/${id}`);
      const emp = res.data.data;
      const fd = blankForm();
      for (const key of Object.keys(fd)) {
        if (emp[key] !== undefined && emp[key] !== null) {
          fd[key] = typeof fd[key] === "boolean" ? !!emp[key] : String(emp[key]);
        }
      }
      // Fix boolean fields that come as strings
      for (const boolKey of ["hold_salary", "reason_checked", "allow_system", "e_ot", "m_ot", "beta",
        "father_alive", "father_live_with", "mother_alive", "mother_live_with",
        "spouse_alive", "spouse_live_with", "is_active"]) {
        fd[boolKey] = !!emp[boolKey];
      }
      setFormData(fd);
      setCurrentId(emp.id);
      const fam = emp.families || [];
      const edu = emp.educations || [];
      const exp = emp.experiences || [];
      const add = emp.additionalInfos || [];
      const tra = emp.trainings || [];
      const cla = emp.classifications || [];
      setFamilyList(fam);
      setEducationList(edu);
      setExperienceList(exp);
      setAdditionalInfoList(add);
      setTrainingList(tra);
      setClassificationList(cla);
      const sigData = {
        formData: fd,
        families: fam,
        educations: edu,
        experiences: exp,
        additionalInfos: add,
        trainings: tra,
        classifications: cla,
      };
      initialFormRef.current = { id: emp.id, sig: normalizeFormSignature(sigData) };
      setShowSearchPage(false);
    } catch {
      toast.error("Failed to load employee");
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/employees/${deleteTarget.id}`);
      toast.success(`"${deleteTarget.name}" deleted successfully`);
      setSearchResults((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/employees/${id}`)));
      toast.success(`${keys.length} record(s) deleted`);
      setSelectedRows([]);
      handleSearch();
    } catch {
      toast.error("Failed to delete some records");
    }
  };

  // File upload handler
  const handleFileUpload = async (fieldName) => {
    if (!currentId) { toast.warning("Please save the employee first before uploading files"); return; }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append(fieldName, file);
      try {
        const res = await api.post(`/employees/${currentId}/upload`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFormData((prev) => ({ ...prev, [fieldName]: res.data.data[fieldName] }));
        toast.success("File uploaded successfully");
      } catch {
        toast.error("Upload failed");
      }
    };
    input.click();
  };

  // ─── LEFT SIDE ─────────────────────────────────────────────────────────────

  const renderLeftSide = () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, columnGap: 1.5, rowGap: 0.75 }}>
      <TextInput label="Employee Code" name="employee_code" value={formData.employee_code} onChange={handleChange} />
      <TextInput label="Contact No" name="contact_no" value={formData.contact_no} onChange={handleChange} />
      <TextInput label="Name" name="name" required value={formData.name} onChange={handleChange} />
      <TextInput label="Surname" name="surname" value={formData.surname} onChange={handleChange} />
      <SelectInput label="Gender" name="gender" value={formData.gender} onChange={handleChange} options={GENDER_OPTIONS} />
      <SelectInput label="Department" name="department_id" value={formData.department_id} onChange={handleChange} options={opts.departments} />
      <SelectInput label="Company" name="company_id" value={formData.company_id} onChange={handleChange} options={opts.companies} />
      <SelectInput label="Section" name="section_id" value={formData.section_id} onChange={handleChange} options={opts.sections} />
      <SelectInput label="Designation" name="designation_id" value={formData.designation_id} onChange={handleChange} options={opts.designations} />
      <SelectInput label="Working Location" name="working_location_id" value={formData.working_location_id} onChange={handleChange} options={opts.locations} />
      <SelectInput label="Floor" name="floor_id" value={formData.floor_id} onChange={handleChange} options={opts.floors} />
      <SelectInput label="Manager" name="manager_designation_id" value={formData.manager_designation_id} onChange={handleChange} options={opts.designations} />
      <TextInput label="Email ID" name="email_id" value={formData.email_id} onChange={handleChange} type="email" />
      <TextInput label="Date Of Birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} type="date" />
      <TextInput label="Date Of Joining" name="date_of_joining" value={formData.date_of_joining} onChange={handleChange} type="date" />
      <CheckboxWithField label="Hold Salary / Date" checkName="hold_salary" checked={formData.hold_salary}
        fieldName="hold_salary_date" fieldValue={formData.hold_salary_date} onChange={handleChange} fieldType="date" sx={{ gridColumn: { md: "span 2" } }} />
      <CheckboxWithField label="Reason" checkName="reason_checked" checked={formData.reason_checked}
        fieldName="reason" fieldValue={formData.reason} onChange={handleChange} fieldPlaceholder="Enter reason" sx={{ gridColumn: { md: "span 2" } }} />
      <CheckboxWithField label="Allow System / UserName" checkName="allow_system" checked={formData.allow_system}
        fieldName="system_username" fieldValue={formData.system_username} onChange={handleChange} fieldPlaceholder="Username" sx={{ gridColumn: { md: "span 2" } }} />
      <SelectInput label="Salary Mode" name="salary_mode" value={formData.salary_mode} onChange={handleChange} options={SALARY_MODE_OPTIONS} />
      <SelectInput label="Salary Structure" name="salary_structure_id" value={formData.salary_structure_id} onChange={handleChange} options={opts.salaryStructures} />
      <SelectInput label="Working Mode" name="working_mode" value={formData.working_mode} onChange={handleChange} options={WORKING_MODE_OPTIONS} />
      <SelectInput label="Working Hour" name="working_hour_id" value={formData.working_hour_id} onChange={handleChange} options={opts.workingHours} />
      <SelectInput label="Week Off" name="week_off" value={formData.week_off} onChange={handleChange} options={WEEK_OFF_OPTIONS} />
      <TextInput label="Gross Pay" name="gross_pay" value={formData.gross_pay} onChange={handleChange} />
      <TextInput label="Incentive %" name="incentive_pct" value={formData.incentive_pct} onChange={handleChange} />
      <TextInput label="Referred By" name="referred_by" value={formData.referred_by} onChange={handleChange} />
      <SelectInput label="Leave Encashment" name="leave_encashment" value={formData.leave_encashment} onChange={handleChange} options={LEAVE_ENCASHMENT_OPTIONS} />
      <Stack direction="row" sx={{ alignItems: "center", pt: 0.25, gridColumn: { md: "span 2" } }}>
        <Typography component="label" sx={{ width: "40%", flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>OT / Beta</Typography>
        <Stack direction="row" sx={{ ml: 0.75, flex: 1, alignItems: "center", gap: 1.5 }}>
          <Stack component="label" direction="row" sx={{ alignItems: "center", gap: 0.5, fontSize: 9.625, color: "text.secondary" }}>
            <Box component="input" type="checkbox" name="e_ot" checked={formData.e_ot} onChange={handleChange} sx={{ width: 14, height: 14, m: 0, accentColor: "#2563eb" }} /> E.OT
          </Stack>
          <Stack component="label" direction="row" sx={{ alignItems: "center", gap: 0.5, fontSize: 9.625, color: "text.secondary" }}>
            <Box component="input" type="checkbox" name="m_ot" checked={formData.m_ot} onChange={handleChange} sx={{ width: 14, height: 14, m: 0, accentColor: "#2563eb" }} /> M.OT
          </Stack>
          <Stack component="label" direction="row" sx={{ alignItems: "center", gap: 0.5, fontSize: 9.625, color: "text.secondary" }}>
            <Box component="input" type="checkbox" name="beta" checked={formData.beta} onChange={handleChange} sx={{ width: 14, height: 14, m: 0, accentColor: "#2563eb" }} /> Beta
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );

  // ─── RIGHT SIDE TAB PANELS ─────────────────────────────────────────────────

  const renderPFandESI = () => (
    <Stack sx={{ gap: 1.5 }}>
      <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main" }}>PF Details</Typography>
      <RTextInput label="PF No" name="pf_no" value={formData.pf_no} onChange={handleChange} />
      <RTextInput label="PF Eligible Date" name="pf_eligible_date" value={formData.pf_eligible_date} onChange={handleChange} type="date" />
      <RTextInput label="PF UAN" name="pf_uan" value={formData.pf_uan} onChange={handleChange} />
      <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main", pt: 1 }}>ESI Details</Typography>
      <RTextInput label="ESI No" name="esi_no" value={formData.esi_no} onChange={handleChange} />
      <RTextInput label="ESI Eligible Date" name="esi_eligible_date" value={formData.esi_eligible_date} onChange={handleChange} type="date" />
    </Stack>
  );

  const renderPersonal = () => (
    <Stack sx={{ gap: 1.25 }}>
      <RTextInput label="Father Name" name="father_name" value={formData.father_name} onChange={handleChange} />
      <RCheckboxInput label="Alive" name="father_alive" checked={formData.father_alive} onChange={handleChange} />
      <RTextInput label="Father Number" name="father_number" value={formData.father_number} onChange={handleChange} />
      <RCheckboxInput label="Live With" name="father_live_with" checked={formData.father_live_with} onChange={handleChange} />
      <RTextInput label="Mother Name" name="mother_name" value={formData.mother_name} onChange={handleChange} />
      <RCheckboxInput label="Alive" name="mother_alive" checked={formData.mother_alive} onChange={handleChange} />
      <RTextInput label="Mother Number" name="mother_number" value={formData.mother_number} onChange={handleChange} />
      <RCheckboxInput label="Live With" name="mother_live_with" checked={formData.mother_live_with} onChange={handleChange} />
      <RSelectInput label="Marital Status" name="marital_status" value={formData.marital_status} onChange={handleChange} options={MARITAL_STATUS_OPTIONS} />
      <RTextInput label="Marriage Date" name="marriage_date" value={formData.marriage_date} onChange={handleChange} type="date" />
      <RTextInput label="Spouse Name" name="spouse_name" value={formData.spouse_name} onChange={handleChange} />
      <RCheckboxInput label="Alive" name="spouse_alive" checked={formData.spouse_alive} onChange={handleChange} />
      <RTextInput label="Spouse Mobile No" name="spouse_mobile_no" value={formData.spouse_mobile_no} onChange={handleChange} />
      <RCheckboxInput label="Live With" name="spouse_live_with" checked={formData.spouse_live_with} onChange={handleChange} />
      <RTextInput label="Languages Known" name="languages_known" value={formData.languages_known} onChange={handleChange} />
      <RTextInput label="Strength" name="strength" value={formData.strength} onChange={handleChange} />
      <RSelectInput label="Blood Group" name="blood_group" value={formData.blood_group} onChange={handleChange} options={BLOOD_GROUP_OPTIONS} />
      <RTextInput label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} />
      <RTextInput label="Expected Salary" name="expected_salary" value={formData.expected_salary} onChange={handleChange} />
      <RTextInput label="Expected Designation" name="expected_designation" value={formData.expected_designation} onChange={handleChange} />
    </Stack>
  );

  const renderBank = () => (
    <Stack sx={{ gap: 1.5 }}>
      <RSelectInput label="Bank" name="bank_id" value={formData.bank_id} onChange={handleChange} options={opts.banks} />
      <RTextInput label="Bank Account Name" name="bank_account_name" value={formData.bank_account_name} onChange={handleChange} />
      <RTextInput label="Bank Account No" name="bank_account_no" value={formData.bank_account_no} onChange={handleChange} />
      <RTextInput label="Bank IFSC" name="bank_ifsc" value={formData.bank_ifsc} onChange={handleChange} />
      <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main", pt: 1 }}>Driving License Details</Typography>
      <RTextInput label="License Number" name="license_number" value={formData.license_number} onChange={handleChange} />
      <RTextInput label="Issue Date" name="license_issue_date" value={formData.license_issue_date} onChange={handleChange} type="date" />
      <RTextInput label="Issue At" name="license_issue_at" value={formData.license_issue_at} onChange={handleChange} />
      <RTextInput label="Expiry On" name="license_expiry" value={formData.license_expiry} onChange={handleChange} type="date" />
    </Stack>
  );

  const renderIDProof = () => (
    <Stack sx={{ gap: 1.5 }}>
      <RTextInput label="Aadhar Number" name="aadhar_number" value={formData.aadhar_number} onChange={handleChange} />
      <RTextInput label="Voter ID Number" name="voter_id" value={formData.voter_id} onChange={handleChange} />
      <RTextInput label="SmartCard Number" name="smart_card_number" value={formData.smart_card_number} onChange={handleChange} />
      <RTextInput label="PAN Number" name="pan_number" value={formData.pan_number} onChange={handleChange} />
      <RTextInput label="Passport Number" name="passport_number" value={formData.passport_number} onChange={handleChange} />
      <RTextInput label="Passport Expiry Date" name="passport_expiry" value={formData.passport_expiry} onChange={handleChange} type="date" />
      <RTextInput label="NPR Number" name="npr_number" value={formData.npr_number} onChange={handleChange} />

      <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main", pt: 1.5 }}>Upload Documents</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, pt: 0.5 }}>
        {[
          { field: "upload_id", label: "Upload ID" },
          { field: "upload_photo", label: "Upload Photo" },
          { field: "upload_aadhar", label: "Upload Aadhar Card" },
          { field: "upload_bank_book", label: "Upload Bank A/C Book" },
          { field: "upload_signature", label: "Upload Signature" },
        ].map(({ field, label }) => (
          <Stack key={field} sx={{ alignItems: "center" }}>
            <Button
              type="button"
              onClick={() => handleFileUpload(field)}
              className="glass-btn glass-btn-success"
              startIcon={<Upload size={12} />}
              fullWidth
              sx={{ justifyContent: "center" }}
            >
              {label}
            </Button>
            {formData[field] && (
              <Typography sx={{ fontSize: 10.5, color: "success.main", mt: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>Uploaded</Typography>
            )}
          </Stack>
        ))}
      </Box>
    </Stack>
  );

  const renderFamily = () => (
    <Stack sx={{ gap: 1.5 }}>
      <RTextInput label="Name" name="name" value={familyForm.name}
        onChange={(e) => setFamilyForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RSelectInput label="Gender" name="gender" value={familyForm.gender}
        onChange={(e) => setFamilyForm((p) => ({ ...p, [e.target.name]: e.target.value }))}
        options={GENDER_OPTIONS} />
      <RTextInput label="Age" name="age" value={familyForm.age} type="number"
        onChange={(e) => setFamilyForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Qualification" name="qualification" value={familyForm.qualification}
        onChange={(e) => setFamilyForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Date Of Birth" name="date_of_birth" value={familyForm.date_of_birth} type="date"
        onChange={(e) => setFamilyForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Relation" name="relation" value={familyForm.relation}
        onChange={(e) => setFamilyForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <Button type="button" onClick={() => {
          if (!familyForm.name.trim()) { toast.warning("Name is required"); return; }
          setFamilyList((prev) => [...prev, { ...familyForm }]);
          setFamilyForm({ name: "", gender: "", age: "", qualification: "", date_of_birth: "", relation: "" });
        }} className="glass-btn glass-btn-primary" startIcon={<PlusCircle size={12} />}>
          Add
        </Button>
      </Stack>
      <Box sx={{ border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden", mt: 1 }}>
        <Table sx={{ width: "100%" }} size="small">
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Name</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Gender</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Age</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Relation</TableCell>
              <TableCell align="center" sx={{ width: 64 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {familyList.length === 0 ? (
              <TableRow><TableCell colSpan={5} sx={{ py: 2, textAlign: "center", color: "text.disabled" }}>No family members added</TableCell></TableRow>
            ) : familyList.map((item, idx) => (
              <TableRow key={idx} hover>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.name}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.gender}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.age}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.relation}</TableCell>
                <TableCell align="center">
                  <IconButton type="button" onClick={() => setFamilyList((p) => p.filter((_, i) => i !== idx))}
                    size="small" sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}><Trash2 size={12} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );

  const renderAddress = () => (
    <Stack sx={{ gap: 1.5 }}>
      <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main" }}>Current Address</Typography>
      <RTextInput label="Resident No" name="curr_resident_no" value={formData.curr_resident_no} onChange={handleChange} />
      <RTextInput label="Resident Name" name="curr_resident_name" value={formData.curr_resident_name} onChange={handleChange} />
      <RTextInput label="Street" name="curr_street" value={formData.curr_street} onChange={handleChange} />
      <RTextInput label="Area" name="curr_area" value={formData.curr_area} onChange={handleChange} />
      <RTextInput label="Village" name="curr_village" value={formData.curr_village} onChange={handleChange} />
      <RSelectInput label="City" name="curr_city_id" value={formData.curr_city_id} onChange={handleChange} options={opts.cities} />
      <RTextInput label="District" name="curr_district" value={formData.curr_district} onChange={handleChange} />
      <RSelectInput label="State" name="curr_state_id" value={formData.curr_state_id} onChange={handleChange} options={opts.states} />
      <RTextInput label="Pincode" name="curr_pincode" value={formData.curr_pincode} onChange={handleChange} />

      <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "error.main", pt: 1.5 }}>Permanent Address</Typography>
      <RTextInput label="Resident No" name="perm_resident_no" value={formData.perm_resident_no} onChange={handleChange} />
      <RTextInput label="Resident Name" name="perm_resident_name" value={formData.perm_resident_name} onChange={handleChange} />
      <RTextInput label="Street" name="perm_street" value={formData.perm_street} onChange={handleChange} />
      <RTextInput label="Area" name="perm_area" value={formData.perm_area} onChange={handleChange} />
      <RTextInput label="Village" name="perm_village" value={formData.perm_village} onChange={handleChange} />
      <RSelectInput label="City" name="perm_city_id" value={formData.perm_city_id} onChange={handleChange} options={opts.cities} />
      <RTextInput label="District" name="perm_district" value={formData.perm_district} onChange={handleChange} />
      <RSelectInput label="State" name="perm_state_id" value={formData.perm_state_id} onChange={handleChange} options={opts.states} />
      <RTextInput label="Pincode" name="perm_pincode" value={formData.perm_pincode} onChange={handleChange} />
    </Stack>
  );

  const renderEducationExp = () => (
    <Stack sx={{ gap: 1.5 }}>
      {/* Tab selector */}
      <Stack direction="row" sx={{ gap: 1, mb: 1 }}>
        <Button type="button" onClick={() => setEduExpTab("education")}
          variant={eduExpTab === "education" ? "contained" : undefined}
          sx={eduExpTab === "education" ? { fontSize: 10.5, borderRadius: "3.5px" } : { fontSize: 10.5, borderRadius: "3.5px", bgcolor: "action.hover", color: "text.secondary", "&:hover": { bgcolor: "action.selected" } }}>
          Education
        </Button>
        <Button type="button" onClick={() => setEduExpTab("experience")}
          variant={eduExpTab === "experience" ? "contained" : undefined}
          sx={eduExpTab === "experience" ? { fontSize: 10.5, borderRadius: "3.5px" } : { fontSize: 10.5, borderRadius: "3.5px", bgcolor: "action.hover", color: "text.secondary", "&:hover": { bgcolor: "action.selected" } }}>
          Experience
        </Button>
      </Stack>

      {eduExpTab === "education" ? (
        <>
          <RTextInput label="Qualification Type" name="qualification_type" value={educationForm.qualification_type}
            onChange={(e) => setEducationForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <RTextInput label="Name" name="name" value={educationForm.name}
            onChange={(e) => setEducationForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <RTextInput label="Institution" name="institution" value={educationForm.institution}
            onChange={(e) => setEducationForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <RTextInput label="Place" name="place" value={educationForm.place}
            onChange={(e) => setEducationForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <RTextInput label="Year" name="year" value={educationForm.year}
            onChange={(e) => setEducationForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <RTextInput label="Percentage" name="percentage" value={educationForm.percentage}
            onChange={(e) => setEducationForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <Stack direction="row" sx={{ justifyContent: "flex-end", gap: 1 }}>
            <Button type="button" onClick={() => {
              if (!currentId) { toast.warning("Save employee first to upload certificate"); return; }
              const input = document.createElement("input");
              input.type = "file"; input.accept = "image/*,.pdf";
              input.onchange = async (ev) => {
                const file = ev.target.files[0]; if (!file) return;
                const fd = new FormData(); fd.append("certificate", file);
                try {
                  const res = await api.post(`/employees/${currentId}/education-certificate`, fd, { headers: { "Content-Type": "multipart/form-data" } });
                  setEducationForm((p) => ({ ...p, certificate: res.data.path }));
                  toast.success("Certificate uploaded");
                } catch { toast.error("Upload failed"); }
              };
              input.click();
            }} className="glass-btn glass-btn-success" startIcon={<Upload size={12} />}>
              Upload Certificate
            </Button>
            <Button type="button" onClick={() => {
              setEducationList((prev) => [...prev, { ...educationForm }]);
              setEducationForm({ qualification_type: "", name: "", institution: "", place: "", year: "", percentage: "" });
            }} className="glass-btn glass-btn-primary" startIcon={<PlusCircle size={12} />}>
              Add
            </Button>
          </Stack>
          <Box sx={{ border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden", mt: 1 }}>
            <Table sx={{ width: "100%" }} size="small">
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Type</TableCell>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Name</TableCell>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Institution</TableCell>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Year</TableCell>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>%</TableCell>
                  <TableCell align="center" sx={{ width: 64 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {educationList.length === 0 ? (
                  <TableRow><TableCell colSpan={6} sx={{ py: 2, textAlign: "center", color: "text.disabled" }}>No education records</TableCell></TableRow>
                ) : educationList.map((item, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.qualification_type}</TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.name}</TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.institution}</TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.year}</TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.percentage}</TableCell>
                    <TableCell align="center">
                      <IconButton type="button" onClick={() => setEducationList((p) => p.filter((_, i) => i !== idx))}
                        size="small" sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}><Trash2 size={12} /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      ) : (
        <>
          <RTextInput label="Name" name="name" value={experienceForm.name}
            onChange={(e) => setExperienceForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <RTextInput label="Institution" name="institution" value={experienceForm.institution}
            onChange={(e) => setExperienceForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <RTextInput label="Place" name="place" value={experienceForm.place}
            onChange={(e) => setExperienceForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <RTextInput label="Year" name="year" value={experienceForm.year}
            onChange={(e) => setExperienceForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <RTextInput label="Salary" name="salary" value={experienceForm.salary}
            onChange={(e) => setExperienceForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
          <Stack direction="row" sx={{ justifyContent: "flex-end", gap: 1 }}>
            <Button type="button" onClick={() => {
              if (!currentId) { toast.warning("Save employee first to upload certificate"); return; }
              const input = document.createElement("input");
              input.type = "file"; input.accept = "image/*,.pdf";
              input.onchange = async (ev) => {
                const file = ev.target.files[0]; if (!file) return;
                const fd = new FormData(); fd.append("certificate", file);
                try {
                  const res = await api.post(`/employees/${currentId}/education-certificate`, fd, { headers: { "Content-Type": "multipart/form-data" } });
                  setExperienceForm((p) => ({ ...p, certificate: res.data.path }));
                  toast.success("Certificate uploaded");
                } catch { toast.error("Upload failed"); }
              };
              input.click();
            }} className="glass-btn glass-btn-success" startIcon={<Upload size={12} />}>
              Upload Certificate
            </Button>
            <Button type="button" onClick={() => {
              setExperienceList((prev) => [...prev, { ...experienceForm }]);
              setExperienceForm({ name: "", institution: "", place: "", year: "", salary: "" });
            }} className="glass-btn glass-btn-primary" startIcon={<PlusCircle size={12} />}>
              Add
            </Button>
          </Stack>
          <Box sx={{ border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden", mt: 1 }}>
            <Table sx={{ width: "100%" }} size="small">
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Name</TableCell>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Institution</TableCell>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Place</TableCell>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Year</TableCell>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Salary</TableCell>
                  <TableCell align="center" sx={{ width: 64 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {experienceList.length === 0 ? (
                  <TableRow><TableCell colSpan={6} sx={{ py: 2, textAlign: "center", color: "text.disabled" }}>No experience records</TableCell></TableRow>
                ) : experienceList.map((item, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.name}</TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.institution}</TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.place}</TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.year}</TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.salary}</TableCell>
                    <TableCell align="center">
                      <IconButton type="button" onClick={() => setExperienceList((p) => p.filter((_, i) => i !== idx))}
                        size="small" sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}><Trash2 size={12} /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </Stack>
  );

  const renderAdditionalInfo = () => (
    <Stack sx={{ gap: 1.5 }}>
      <RTextInput label="Date" name="date" value={additionalInfoForm.date} type="date"
        onChange={(e) => setAdditionalInfoForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Name" name="name" value={additionalInfoForm.name}
        onChange={(e) => setAdditionalInfoForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Value" name="value" value={additionalInfoForm.value}
        onChange={(e) => setAdditionalInfoForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <Button type="button" onClick={() => {
          setAdditionalInfoList((prev) => [...prev, { ...additionalInfoForm }]);
          setAdditionalInfoForm({ date: "", name: "", value: "" });
        }} className="glass-btn glass-btn-primary" startIcon={<PlusCircle size={12} />}>
          Add
        </Button>
      </Stack>
      <Box sx={{ border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden", mt: 1 }}>
        <Table sx={{ width: "100%" }} size="small">
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Date</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Name</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Value</TableCell>
              <TableCell align="center" sx={{ width: 64 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {additionalInfoList.length === 0 ? (
              <TableRow><TableCell colSpan={4} sx={{ py: 2, textAlign: "center", color: "text.disabled" }}>No records</TableCell></TableRow>
            ) : additionalInfoList.map((item, idx) => (
              <TableRow key={idx} hover>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.date}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.name}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.value}</TableCell>
                <TableCell align="center">
                  <IconButton type="button" onClick={() => setAdditionalInfoList((p) => p.filter((_, i) => i !== idx))}
                    size="small" sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}><Trash2 size={12} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );

  const renderTraining = () => (
    <Stack sx={{ gap: 1.5 }}>
      <RTextInput label="Training Name" name="training_name" value={trainingForm.training_name}
        onChange={(e) => setTrainingForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Given On" name="given_on" value={trainingForm.given_on} type="date"
        onChange={(e) => setTrainingForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Remark" name="remark" value={trainingForm.remark}
        onChange={(e) => setTrainingForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Confirmation Date" name="confirmation_date" value={trainingForm.confirmation_date} type="date"
        onChange={(e) => setTrainingForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Completion Date" name="completion_date" value={trainingForm.completion_date} type="date"
        onChange={(e) => setTrainingForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Notice Period" name="notice_period" value={trainingForm.notice_period}
        onChange={(e) => setTrainingForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <Button type="button" onClick={() => {
          setTrainingList((prev) => [...prev, { ...trainingForm }]);
          setTrainingForm({ training_name: "", given_on: "", remark: "", confirmation_date: "", completion_date: "", notice_period: "" });
        }} className="glass-btn glass-btn-primary" startIcon={<PlusCircle size={12} />}>
          Add
        </Button>
      </Stack>
      <Box sx={{ border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden", mt: 1 }}>
        <Table sx={{ width: "100%" }} size="small">
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Training</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Given On</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Remark</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Confirmation</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Completion</TableCell>
              <TableCell align="center" sx={{ width: 64 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trainingList.length === 0 ? (
              <TableRow><TableCell colSpan={6} sx={{ py: 2, textAlign: "center", color: "text.disabled" }}>No training records</TableCell></TableRow>
            ) : trainingList.map((item, idx) => (
              <TableRow key={idx} hover>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.training_name}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.given_on}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.remark}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.confirmation_date}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.completion_date}</TableCell>
                <TableCell align="center">
                  <IconButton type="button" onClick={() => setTrainingList((p) => p.filter((_, i) => i !== idx))}
                    size="small" sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}><Trash2 size={12} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );

  const renderClassification = () => (
    <Stack sx={{ gap: 1.5 }}>
      <RTextInput label="Valid From" name="valid_from" value={classificationForm.valid_from} type="date"
        onChange={(e) => setClassificationForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RTextInput label="Valid To" name="valid_to" value={classificationForm.valid_to} type="date"
        onChange={(e) => setClassificationForm((p) => ({ ...p, [e.target.name]: e.target.value }))} />
      <RSelectInput label="Designation" name="designation_id" value={classificationForm.designation_id}
        onChange={(e) => setClassificationForm((p) => ({ ...p, [e.target.name]: e.target.value }))}
        options={opts.designations} />
      <RSelectInput label="Department" name="department_id" value={classificationForm.department_id}
        onChange={(e) => setClassificationForm((p) => ({ ...p, [e.target.name]: e.target.value }))}
        options={opts.departments} />
      <RSelectInput label="Section" name="section_id" value={classificationForm.section_id}
        onChange={(e) => setClassificationForm((p) => ({ ...p, [e.target.name]: e.target.value }))}
        options={opts.sections} />
      <RSelectInput label="Floor" name="floor_id" value={classificationForm.floor_id}
        onChange={(e) => setClassificationForm((p) => ({ ...p, [e.target.name]: e.target.value }))}
        options={opts.floors} />
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <Button type="button" onClick={() => {
          setClassificationList((prev) => [...prev, { ...classificationForm }]);
          setClassificationForm({ valid_from: "", valid_to: "", designation_id: "", department_id: "", section_id: "", floor_id: "" });
        }} className="glass-btn glass-btn-primary" startIcon={<PlusCircle size={12} />}>
          Add
        </Button>
      </Stack>
      <Box sx={{ border: 1, borderColor: "grey.300", borderRadius: "3.5px", overflow: "hidden", mt: 1 }}>
        <Table sx={{ width: "100%" }} size="small">
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>From</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>To</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Designation</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Department</TableCell>
              <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>Section</TableCell>
              <TableCell align="center" sx={{ width: 64 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classificationList.length === 0 ? (
              <TableRow><TableCell colSpan={6} sx={{ py: 2, textAlign: "center", color: "text.disabled" }}>No records</TableCell></TableRow>
            ) : classificationList.map((item, idx) => (
              <TableRow key={idx} hover>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.valid_from}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{item.valid_to}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{opts.designations.find((d) => d.value === item.designation_id)?.label || item.designation_id}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{opts.departments.find((d) => d.value === item.department_id)?.label || item.department_id}</TableCell>
                <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{opts.sections.find((d) => d.value === item.section_id)?.label || item.section_id}</TableCell>
                <TableCell align="center">
                  <IconButton type="button" onClick={() => setClassificationList((p) => p.filter((_, i) => i !== idx))}
                    size="small" sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}><Trash2 size={12} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );

  const renderRightPanel = () => {
    switch (rightTab) {
      case "PF and ESI": return renderPFandESI();
      case "Personal": return renderPersonal();
      case "Bank": return renderBank();
      case "ID Proof": return renderIDProof();
      case "Family": return renderFamily();
      case "Address": return renderAddress();
      case "Education/Exp": return renderEducationExp();
      case "Additional Info": return renderAdditionalInfo();
      case "Training": return renderTraining();
      case "Classification": return renderClassification();
      default: return null;
    }
  };

  const labelOf = (options, id) =>
    options.find((o) => o.value === String(id))?.label || "—";

  const employeeColumns = [
    { key: "employee_code", label: "Code" },
    {
      key: "name",
      label: "Name",
      render: (_, row) => `${row.name || ""} ${row.surname || ""}`.trim() || "—",
      searchValue: (row) => `${row.name || ""} ${row.surname || ""}`.trim(),
    },
    { key: "contact_no", label: "Contact" },
    {
      key: "department_id",
      label: "Department",
      render: (value) => labelOf(opts.departments, value),
      searchValue: (row) => labelOf(opts.departments, row.department_id),
    },
    { key: "email_id", label: "Email" },
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

  // ─── SEARCH PAGE ───────────────────────────────────────────────────────────

  const renderSearchPage = () => (
    <Card variant="outlined" sx={{ p: 2, width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <FilterableDataTable
        rows={searchResults}
        columns={employeeColumns}
        loading={searchLoading}
        searchPlaceholder="Search in employee fields..."
        searchButtonClassName="glass-btn glass-btn-primary"
        showExport={false}
        enableColumnResize
        tablePreferenceKey="hrms.employees.list"
        onRefresh={() => handleSearch()}
        enableServerSearch
        onServerSearch={handleServerSearch}
        page={page}
        limit={limit}
        totalPages={pagination.totalPages}
        totalRows={pagination.total}
        pagination={rawPagination}
        enableVirtualization
        onPageChange={setPage}
        onNextCursor={handleEmployeeNextCursor}
        onPreviousCursor={handleEmployeePreviousCursor}
        onFetchGroupSummaries={fetchEmployeeGroupSummaries}
        onFetchGroupRows={fetchEmployeeGroupRows}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        onRowClick={(row) => handleEdit(row.id)}
        enableKeyboardNav
        enableSelection
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onBulkDelete={handleBulkDelete}
        fillHeight
        renderActions={(row, { selectedCount } = {}) => (
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <Button
              onClick={() => handleEdit(row.id)}
              disabled={selectedCount > 1}
              className="glass-btn glass-btn-primary"
              sx={{ borderRadius: "3.5px", p: 0.75, fontSize: 10.5 }}
            >
              Edit
            </Button>
            <Button
              onClick={() => {
                setDeleteTarget(row);
                setConfirmOpen(true);
              }}
              className="glass-btn glass-btn-danger"
              sx={{ borderRadius: "3.5px", p: 0.75, fontSize: 10.5 }}
            >
              Delete
            </Button>
          </Stack>
        )}
      />
    </Card>
  );

  // ─── FORM PAGE ─────────────────────────────────────────────────────────────

  const renderForm = () => (
    <Card
      variant="outlined"
      sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
      data-enter-scope="true"
      onKeyDownCapture={handleEnterKeyNavigation}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" }, gap: 2, p: 1.75, flex: 1, minHeight: 0 }}>
        {/* LEFT COLUMN */}
        {/* Scrolls independently like the right column -- the Card is pinned to the viewport height
            with overflow:hidden, so without this everything below the fold was simply clipped. */}
        <Box sx={{ gridColumn: { xs: "span 12", lg: "span 8" }, pr: { lg: 1 }, overflowY: "auto", minHeight: 0 }}>
          {renderLeftSide()}
        </Box>

        {/* RIGHT COLUMN */}
        <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" }, overflowY: "auto", pl: { lg: 1 }, borderLeft: { lg: 1 }, borderColor: "divider", minHeight: 0 }}>
          {/* Tab selector dropdown */}
          <Box sx={{ mb: 1.5 }}>
            <Box
              component="select"
              value={rightTab}
              onChange={(e) => setRightTab(e.target.value)}
              sx={{ width: "100%", minWidth: 0, ...fieldBaseSx(false), fontWeight: 500 }}
            >
              {RIGHT_TABS.map((tab) => (
                <option key={tab} value={tab}>{tab}</option>
              ))}
            </Box>
          </Box>
          {renderRightPanel()}
        </Box>
      </Box>
    </Card>
  );

  // ─── MAIN RENDER ───────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", bgcolor: "background.default", color: "text.primary" }}>
      {/* Header */}
      <PageHeader
        title={
          <Breadcrumbs
            items={[
              { label: "HRMS", onClick: () => navigate("/hrms") },
              { label: "Employee" },
            ]}
          />
        }
        onBack={handleBackClick}
        actions={
          <Stack direction="row" sx={{ alignItems: "center" }} spacing={1.5}>
            <Button
              variant="text"
              className="topbar-action-btn topbar-action-new"
              onClick={handleNew}
              startIcon={<PlusCircle size={16} />}
              size="small"
            >
              New
            </Button>
            <Typography variant="body2" component="span" sx={{ color: "text.disabled" }}>|</Typography>
            <UploadImportButton
              endpoint="/employees/bulk"
              fieldConfig={EMPLOYEE_IMPORT_CONFIG}
              onDone={() => {
                setShowSearchPage(true);
                if (page === 1) handleSearch();
                else setPage(1);
              }}
            />
            {showSearchPage && (
              <>
                <Typography variant="body2" component="span" sx={{ color: "text.disabled" }}>|</Typography>
                <ExportBottomSheet
                  columns={employeeColumns}
                  rows={searchResults}
                  selectedRowKeys={selectedRows}
                  onExportRows={async () => {
                    const res = await api.get("/employees", { params: { all: "true" } });
                    return res.data?.data || [];
                  }}
                  fileName="employees"
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
                  startIcon={<Save size={16} />}
                  size="small"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            )}
            <Typography variant="body2" component="span" sx={{ color: "text.disabled" }}>|</Typography>
            <Button
              className="glass-btn glass-btn-primary"
              onClick={() => { setShowSearchPage(true); handleSearch(); }}
              startIcon={<Search size={16} />}
              size="small"
            >
              Search
            </Button>
          </Stack>
        }
      />

      {/* Content */}
      <Box sx={{ flex: 1, p: 1.5, minHeight: 0 }}>
        {showSearchPage ? renderSearchPage() : renderForm()}
      </Box>


      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Delete"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }}
      />
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
    </Box>
  );
};

export default Employee;
