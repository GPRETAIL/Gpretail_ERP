import { ArrowLeft, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import SearchableSelect from "../../components/SearchableSelect";

const typeOptions = [
  { label: "DEPARTMENT", value: "department" },
  { label: "SECTION", value: "section" },
  { label: "ROLE", value: "role" },
  { label: "FLOOR", value: "floor" },
  { label: "DESIGNATION", value: "designation" },
  { label: "SALARY STRUCTURE", value: "salary_structure" },
  { label: "WORKING HOUR", value: "working_hour" },
];

const HrConfiguration = () => {
  const navigate = useNavigate();
  const [configType, setConfigType] = useState("department");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(20);

  const typeLabelMap = {
    department: "Department",
    section: "Section",
    role: "Role",
    floor: "Floor",
    designation: "Designation",
    salary_structure: "Salary Structure",
    working_hour: "Working Hour",
  };
  const endpointMap = {
    department: "/hr-departments",
    section: "/hr-sections",
    role: "/hr-roles",
    floor: "/hr-floors",
    designation: "/hr-designations",
    salary_structure: "/hr-salary-structures",
    working_hour: "/hr-working-hours",
  };
  const safeType = endpointMap[configType] ? configType : "department";
  const typeLabel = typeLabelMap[safeType];
  const baseEndpoint = endpointMap[safeType];
  const showIsSales = safeType === "department" || safeType === "section";
  const showLocation = safeType === "floor";
  const showRole = safeType === "designation";
  const showWorkingHourColumns = safeType === "working_hour";

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get(baseEndpoint);
      setRows(res.data?.data || []);
      if ((res.data?.data || []).length === 0) toast.info(`No ${typeLabel.toLowerCase()} records found.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load HR configuration");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList("");
    setTablePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configType]);

  const handleDeleteConfirmed = async () => {
    const { id, name } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(`${baseEndpoint}/${id}`);
      toast.success(`"${name}" deleted successfully.`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to delete ${typeLabel.toLowerCase()}`);
    }
  };

  const hrColumns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    ...(showLocation
      ? [{
          key: "location_name",
          label: "Location",
          render: (_, row) => row.location?.name || "—",
          searchValue: (row) => row.location?.name || "",
        }]
      : []),
    ...(showRole
      ? [{
          key: "role_name",
          label: "Role",
          render: (_, row) => row.role_name || row.role?.name || "—",
          searchValue: (row) => row.role_name || row.role?.name || "",
        }]
      : []),
    ...(showWorkingHourColumns
      ? [
          { key: "minimum_full_day", label: "Minimum Full Day" },
          { key: "minimum_present", label: "Minimum Present" },
          { key: "from_time", label: "From" },
          { key: "to_time", label: "To" },
          { key: "working_hours", label: "Working Hours" },
        ]
      : []),
    ...(showIsSales
      ? [
          {
            key: "is_sales",
            label: "Is Sales",
            render: (value) => (value ? "Yes" : "No"),
            searchValue: (row) => (row.is_sales ? "yes" : "no"),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-[70vh] bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete this ${typeLabel.toLowerCase()} "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
      />

      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
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
            <span>HR Configuration</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button
            onClick={() => navigate(`/masters/hr-configuration/new?type=${configType}`)}
            className="topbar-action-btn topbar-action-new"
          >
            <PlusCircle className="w-3 h-3 mr-1" /> New
          </button>
        </div>
      </div>

      <div className="p-3 pb-16">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-4 space-y-1.5">
              <SearchableSelect
                label="HR Type"
                name="configType"
                options={typeOptions}
                value={configType}
                onChange={(e) => setConfigType(e.target.value || "department")}
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <FilterableDataTable
            rows={rows}
            columns={hrColumns}
            onRowClick={(row) => navigate(`/masters/hr-configuration/new?type=${configType}&id=${row.id}`)}
            enableKeyboardNav
            loading={loading}
            emptyText="No records found."
            searchPlaceholder={`Search in ${typeLabel.toLowerCase()} fields...`}
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
            showExport={false}
            tablePreferenceKey={`masters.hr-configuration.${safeType}`}
            paginationMode="client"
            page={tablePage}
            limit={tableLimit}
            totalRows={rows.length}
            totalPages={Math.max(Math.ceil(rows.length / Math.max(tableLimit, 1)), 1)}
            onPageChange={setTablePage}
            onLimitChange={(value) => {
              setTableLimit(value);
              setTablePage(1);
            }}
            renderActions={(row) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/masters/hr-configuration/new?type=${configType}&id=${row.id}`)}
                  title="Edit"
                  className="glass-btn glass-btn-primary"
                  type="button"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirm({ open: true, id: row.id, name: row.name })}
                  title="Delete"
                  className="glass-btn glass-btn-danger rounded p-1.5"
                  type="button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default HrConfiguration;
