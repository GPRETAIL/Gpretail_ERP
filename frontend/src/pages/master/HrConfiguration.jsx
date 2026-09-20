import { ArrowLeft, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Stack, Card, Typography, Button } from "@mui/material";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import SearchableSelect from "../../components/SearchableSelect";
import PageHeader from "../../components/PageHeader";

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
    <Box sx={{ minHeight: "70vh", bgcolor: "background.default", color: "text.primary" }}>
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete this ${typeLabel.toLowerCase()} "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
      />

      <PageHeader
        title={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Typography
              component="button"
              type="button"
              onClick={() => navigate("/hrms")}
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: "primary.main",
                background: "none",
                border: "none",
                p: 0,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              HRMS
            </Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>/</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>HR Configuration</Typography>
          </Stack>
        }
        onBack={() => navigate(-1)}
        actions={
          <Button
            onClick={() => navigate(`/hrms/hr-configuration/new?type=${configType}`)}
            className="topbar-action-btn topbar-action-new"
            startIcon={<PlusCircle size={12} />}
            size="small"
          >
            New
          </Button>
        }
      />

      <Box sx={{ p: 1.5, pb: 8 }}>
        <Card variant="outlined" sx={{ p: 1.5, mb: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" }, gap: 1.5 }}>
            <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" } }}>
              <SearchableSelect
                label="HR Type"
                name="configType"
                options={typeOptions}
                value={configType}
                onChange={(e) => setConfigType(e.target.value || "department")}
              />
            </Box>
          </Box>
        </Card>

        <Box sx={{ mt: 2 }}>
          <FilterableDataTable
            rows={rows}
            columns={hrColumns}
            onRowClick={(row) => navigate(`/hrms/hr-configuration/new?type=${configType}&id=${row.id}`)}
            enableKeyboardNav
            loading={loading}
            emptyText="No records found."
            searchPlaceholder={`Search in ${typeLabel.toLowerCase()} fields...`}
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
            showExport={false}
            tablePreferenceKey={`hrms.hr-configuration.${safeType}`}
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
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <button
                  onClick={() => navigate(`/hrms/hr-configuration/new?type=${configType}&id=${row.id}`)}
                  title="Edit"
                  className="glass-btn glass-btn-primary"
                  type="button"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirm({ open: true, id: row.id, name: row.name })}
                  title="Delete"
                  className="glass-btn glass-btn-danger rounded p-1.5"
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </Stack>
            )}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default HrConfiguration;
