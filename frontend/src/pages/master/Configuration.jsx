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
import useStoreNameMap from "../../hooks/useStoreNameMap";

const typeOptions = [
  { label: "LOCATION",              value: "LOCATION" },
  { label: "COUNTER",               value: "COUNTER" },
  { label: "TAILORING UNIT",        value: "TAILORING_UNIT" },
  { label: "PRF REASON",            value: "PRF_REASON" },
  { label: "RETURN REASON",         value: "RETURN_REASON" },
  { label: "SALE REASON",           value: "SALE_REASON" },
  { label: "SEASONS",               value: "SEASONS" },
  { label: "PO TYPE / BUDGET TYPE", value: "PO_TYPE" },
  { label: "SETTINGS",              value: "SETTINGS" },
  { label: "BANK",                  value: "BANK" },
  { label: "SWIPPING MACHINE",      value: "SWIPPING_MACHINE" },
  { label: "CARD TYPES",            value: "CARD_TYPES" },
  { label: "COURIER TYPE",          value: "COURIER_TYPE" },
  { label: "SALE AREA",             value: "SALE_AREA" },
  { label: "DISCOUNT REMARK",       value: "DISCOUNT_REMARK" },
  { label: "AREA GROUP 1",          value: "AREA_GROUP_1" },
  { label: "AREA GROUP 2",          value: "AREA_GROUP_2" },
  { label: "PRIORITY",              value: "PRIORITY" },
  { label: "CITY",                  value: "CITY" },
  { label: "DISTRICT",              value: "DISTRICT" },
  { label: "STATE",                 value: "STATE" },
  { label: "COUNTRY",               value: "COUNTRY" },
  { label: "EXPENSES TYPE",         value: "EXPENSES_TYPE" },
  { label: "CUSTOMER CATEGORY",     value: "CUSTOMER_CATEGORY" },
  { label: "VENDOR",                value: "VENDOR" },
  { label: "OFFLINE CLIENT",        value: "OFFLINE_CLIENT" },
  { label: "AUTO NUMBER",           value: "AUTO_NUMBER" },
  { label: "LOAN PROVIDER",         value: "LOAN_PROVIDER" },
  { label: "DELIVERY LOCATION",     value: "DELIVERY_LOCATION" },
  { label: "ADDITIONAL CHARGES",    value: "ADDITIONAL_CHARGES" },
  { label: "UPI PROVIDER",          value: "UPI_PROVIDER" },
  { label: "JOB WORK CHARGE",       value: "JOB_WORK_CHARGE" },
  { label: "TAILORING CHARGE",      value: "TAILORING_CHARGE" },
  { label: "BUNDLE RACK",           value: "BUNDLE_RACK" },
  { label: "DOCUMENT IMPORT",       value: "DOCUMENT_IMPORT" },
  { label: "SUPPLIER GROUP",        value: "SUPPLIER_GROUP" },
  { label: "VOUCHER TYPE",          value: "VOUCHER_TYPE" },
  { label: "BUYER GROUP",           value: "BUYER_GROUP" },
  { label: "CUSTOMER GROUP",        value: "CUSTOMER_GROUP" },
  { label: "LEAD EVENT",            value: "LEAD_EVENT" },
  { label: "LEAD STATUS",           value: "LEAD_STATUS" },
  { label: "LEAD PRIORITY",         value: "LEAD_PRIORITY" },
  { label: "ASSET TYPES",           value: "ASSET_TYPES" },
  { label: "FOOD COUNTER",          value: "FOOD_COUNTER" },
  { label: "DOCUMENT TYPE",         value: "DOCUMENT_TYPE" },
  { label: "CRM SOURCES",           value: "CRM_SOURCES" },
  { label: "CRM VISITING",          value: "CRM_VISITING" },
  { label: "PURCHASE TYPE",         value: "PURCHASE_TYPE" },
  { label: "ADDRESS TYPE",          value: "ADDRESS_TYPE" },
  { label: "TDS GROUP",             value: "TDS_GROUP" },
  { label: "AGENT TYPE",            value: "AGENT_TYPE" },
];

const Configuration = () => {
  const navigate = useNavigate();
  const [configType, setConfigType] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(20);
  const storeMap = useStoreNameMap();

  const fetchList = async (type) => {
    if (!type) return;
    setLoading(true);
    try {
      const res = await api.get(`/configurations/${type.toLowerCase()}`);
      const data = res.data?.data || [];
      setRows(data);
      if (data.length === 0) toast.info("No records found for this type.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load list");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (configType) fetchList(configType);
    else setRows([]);
    setTablePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configType]);

  const handleNew = () => {
    if (!configType) { toast.warning("Please select a Configuration Type first!"); return; }
    navigate(`/masters/configuration/new?type=${configType}`);
  };

  const handleEdit = (id) => {
    navigate(`/masters/configuration/new?type=${configType}&id=${id}`);
  };

  const handleDeleteConfirmed = async () => {
    const { id, name } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(`/configurations/${configType.toLowerCase()}/${id}`);
      toast.success(`"${name}" deleted successfully.`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  };

  const configColumns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "sort_order", label: "Sort Order", render: (value) => value ?? 0 },
    {
      key: "is_active",
      label: "Active",
      render: (value) => (value ? "Yes" : "No"),
      searchValue: (row) => (row.is_active ? "yes" : "no"),
    },
    { key: "created_by", label: "Created By", render: (value) => value || "—" },
    {
      key: "company_id",
      label: "Store/Warehouse",
      render: (value) => storeMap[String(value)] ?? "—",
      searchValue: (row) => storeMap[String(row.company_id)] ?? "",
    },
  ];

  return (
    <Box sx={{ minHeight: "70vh", bgcolor: "background.default", color: "text.primary" }}>
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
      />

      <PageHeader
        title={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Typography
              component="button"
              type="button"
              onClick={() => navigate("/masters")}
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
              Master
            </Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>/</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Configuration</Typography>
          </Stack>
        }
        onBack={() => navigate(-1)}
        actions={
          <Button
            onClick={handleNew}
            className="topbar-action-btn topbar-action-new"
            startIcon={<PlusCircle className="w-3 h-3" />}
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
                label="Configuration Type"
                name="configType"
                options={typeOptions}
                value={configType}
                onChange={(e) => setConfigType(e.target.value)}
              />
            </Box>
          </Box>
        </Card>

        <Box sx={{ mt: 2 }}>
          <FilterableDataTable
            rows={rows}
            columns={configColumns}
            onRowClick={(row) => handleEdit(row.id)}
            enableKeyboardNav
            loading={loading}
            emptyText={configType ? "No records found for this type." : "Select Configuration Type to load records."}
            searchPlaceholder="Search in configuration fields..."
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
            showExport={false}
            tablePreferenceKey="masters.configuration.list"
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
                  onClick={() => handleEdit(row.id)}
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
              </Stack>
            )}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Configuration;
