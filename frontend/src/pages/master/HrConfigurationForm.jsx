import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CheckboxInput, SelectInput, TextInput } from "../../components/CustomInputs";
import api from "../../api/axios";

const STATIC_DESIGNATION_ROLES = [
  "Operational Manager",
  "Purchase Manager",
  "Sales Manager",
  "Sales Incharges",
  "Salesmen",
  "Biller",
  "Cashier",
  "Sales Support Staff",
  "Purchase Support Staff",
  "Operational Support Staff",
  "Accounts Manager",
  "Accounts Support Staff",
];

const HHMM_24_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isValidHHMM = (value) => HHMM_24_REGEX.test(String(value || "").trim());

const HrConfigurationForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawType = (searchParams.get("type") || "department").toLowerCase();
  const type =
    rawType === "section" ||
    rawType === "role" ||
    rawType === "floor" ||
    rawType === "designation" ||
    rawType === "salary_structure" ||
    rawType === "working_hour"
      ? rawType
      : "department";
  const typeLabel =
    type === "section"
      ? "Section"
      : type === "role"
      ? "Role"
      : type === "floor"
      ? "Floor"
      : type === "designation"
      ? "Designation"
      : type === "salary_structure"
      ? "Salary Structure"
      : type === "working_hour"
      ? "Working Hour"
      : "Department";
  const baseEndpoint =
    type === "section"
      ? "/hr-sections"
      : type === "role"
      ? "/hr-roles"
      : type === "floor"
      ? "/hr-floors"
      : type === "designation"
      ? "/hr-designations"
      : type === "salary_structure"
      ? "/hr-salary-structures"
      : type === "working_hour"
      ? "/hr-working-hours"
      : "/hr-departments";
  const showIsSales = type === "department" || type === "section";
  const showLocation = type === "floor";
  const showDesignationRole = type === "designation";
  const showWorkingHour = type === "working_hour";
  const recordId = searchParams.get("id") || null;
  const isEdit = !!recordId;
  const initialFormRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    isSales: false,
    locationId: "",
    roleChoice: "",
    minimumFullDay: "",
    minimumPresent: "",
    fromTime: "",
    toTime: "",
    workingHours: "",
  });
  const [locationOptions, setLocationOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);

  useEffect(() => {
    if (!showLocation) return;
    api
      .get("/configurations/location")
      .then((res) => {
        const options = (res.data?.data || []).map((row) => ({
          value: String(row.id),
          label: row.name,
        }));
        setLocationOptions(options);
      })
      .catch(() => {
        setLocationOptions([]);
      });
  }, [showLocation]);

  useEffect(() => {
    if (!showDesignationRole) return;
    api
      .get("/hr-roles")
      .then((res) => {
        const dbRows = res.data?.data || [];

        const staticOptions = STATIC_DESIGNATION_ROLES.map((name) => ({
          value: `static:${name}`,
          label: name,
        }));
        const dbOptions = dbRows.map((row) => ({
          value: `db:${row.id}`,
          label: row.name,
        }));
        setRoleOptions([...staticOptions, ...dbOptions]);
      })
      .catch(() => {
        const staticOptions = STATIC_DESIGNATION_ROLES.map((name) => ({
          value: `static:${name}`,
          label: name,
        }));
        setRoleOptions(staticOptions);
      });
  }, [showDesignationRole]);

  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);
    api
      .get(`${baseEndpoint}/${recordId}`)
      .then((res) => {
        const row = res.data?.data;
        if (!row) return;
        const loaded = {
          code: row.code || "",
          name: row.name || "",
          isSales: showIsSales ? !!row.is_sales : false,
          locationId: showLocation ? String(row.location_id || row.location?.id || "") : "",
          roleChoice: showDesignationRole
            ? row.role_id
              ? `db:${row.role_id}`
              : row.role_name
              ? `static:${row.role_name}`
              : ""
            : "",
          minimumFullDay: showWorkingHour ? row.minimum_full_day || "" : "",
          minimumPresent: showWorkingHour ? row.minimum_present || "" : "",
          fromTime: showWorkingHour ? row.from_time || "" : "",
          toTime: showWorkingHour ? row.to_time || "" : "",
          workingHours: showWorkingHour ? row.working_hours || "" : "",
        };
        setFormData(loaded);
        initialFormRef.current = JSON.stringify(loaded); // baseline for the no-changes guard

      })
      .catch((err) => {
        toast.error(err.response?.data?.message || `Failed to load ${typeLabel.toLowerCase()}`);
      })
      .finally(() => setLoading(false));
  }, [
    baseEndpoint,
    isEdit,
    recordId,
    showDesignationRole,
    showIsSales,
    showLocation,
    showWorkingHour,
    typeLabel,
  ]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!String(formData.name || "").trim()) {
      toast.warning("Name is required");
      return;
    }
    if (showLocation && !String(formData.locationId || "").trim()) {
      toast.warning("Location is required");
      return;
    }
    if (showDesignationRole && !String(formData.roleChoice || "").trim()) {
      toast.warning("Role is required");
      return;
    }
    if (showWorkingHour && !isValidHHMM(formData.minimumFullDay)) {
      toast.warning("Minimum Full Day must be in hh:mm format (24 hours)");
      return;
    }
    if (showWorkingHour && !isValidHHMM(formData.minimumPresent)) {
      toast.warning("Minimum Present must be in hh:mm format (24 hours)");
      return;
    }
    if (showWorkingHour && !isValidHHMM(formData.fromTime)) {
      toast.warning("From must be in hh:mm format (24 hours)");
      return;
    }
    if (showWorkingHour && !isValidHHMM(formData.toTime)) {
      toast.warning("To must be in hh:mm format (24 hours)");
      return;
    }
    if (showWorkingHour && !isValidHHMM(formData.workingHours)) {
      toast.warning("Working Hours must be in hh:mm format (24 hours)");
      return;
    }

    let designationRolePayload = {};
    if (showDesignationRole) {
      if (String(formData.roleChoice).startsWith("db:")) {
        designationRolePayload = {
          roleId: String(formData.roleChoice).replace("db:", ""),
          roleName: null,
        };
      } else if (String(formData.roleChoice).startsWith("static:")) {
        designationRolePayload = {
          roleId: null,
          roleName: String(formData.roleChoice).replace("static:", ""),
        };
      }
    }

    const payload = {
      code: String(formData.code || "").trim() || null,
      name: String(formData.name || "").trim(),
      ...(showIsSales ? { isSales: !!formData.isSales } : {}),
      ...(showLocation ? { locationId: formData.locationId } : {}),
      ...(showWorkingHour
        ? {
            minimumFullDay: String(formData.minimumFullDay || "").trim(),
            minimumPresent: String(formData.minimumPresent || "").trim(),
            fromTime: String(formData.fromTime || "").trim(),
            toTime: String(formData.toTime || "").trim(),
            workingHours: String(formData.workingHours || "").trim(),
          }
        : {}),
      ...designationRolePayload,
    };

    if (isEdit && initialFormRef.current && JSON.stringify(formData) === initialFormRef.current) {
      toast.info("No changes detected.");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`${baseEndpoint}/${recordId}`, payload);
        toast.success(`${typeLabel} updated successfully`);
      } else {
        await api.post(baseEndpoint, payload);
        toast.success(`${typeLabel} created successfully`);
      }
      navigate("/masters/hr-configuration");
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to save ${typeLabel.toLowerCase()}`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm sticky top-0 z-10">
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
              onClick={() => navigate("/masters/hr-configuration")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              HR Configuration
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>{typeLabel}</span>
          </h1>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-60"
        >
          <Save className="w-3 h-3 mr-1" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="p-3 pb-16">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          {loading ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">Loading {typeLabel.toLowerCase()}...</div>
          ) : (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 lg:col-span-4 space-y-1.5">
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
                {showLocation && (
                  <SelectInput
                    label="Location"
                    name="locationId"
                    required
                    options={locationOptions}
                    value={formData.locationId}
                    onChange={handleChange}
                  />
                )}
                {showDesignationRole && (
                  <SelectInput
                    label="Role"
                    name="roleChoice"
                    required
                    options={roleOptions}
                    value={formData.roleChoice}
                    onChange={handleChange}
                  />
                )}
                {showIsSales && (
                  <CheckboxInput
                    label="Is Sales"
                    name="isSales"
                    checked={formData.isSales}
                    onChange={handleChange}
                  />
                )}
                {showWorkingHour && (
                  <TextInput
                    label="Minimum Full Day [hh:mm]"
                    name="minimumFullDay"
                    required
                    value={formData.minimumFullDay}
                    onChange={handleChange}
                    placeholder="hh:mm"
                  />
                )}
                {showWorkingHour && (
                  <TextInput
                    label="Minimum Present [hh:mm]"
                    name="minimumPresent"
                    required
                    value={formData.minimumPresent}
                    onChange={handleChange}
                    placeholder="hh:mm"
                  />
                )}
                {showWorkingHour && (
                  <TextInput
                    label="From [hh:mm]"
                    name="fromTime"
                    required
                    value={formData.fromTime}
                    onChange={handleChange}
                    placeholder="hh:mm"
                  />
                )}
                {showWorkingHour && (
                  <TextInput
                    label="To [hh:mm]"
                    name="toTime"
                    required
                    value={formData.toTime}
                    onChange={handleChange}
                    placeholder="hh:mm"
                  />
                )}
                {showWorkingHour && (
                  <TextInput
                    label="Working Hours [hh:mm]"
                    name="workingHours"
                    required
                    value={formData.workingHours}
                    onChange={handleChange}
                    placeholder="hh:mm"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HrConfigurationForm;
