import useSearchGrid, { createSearchGridAdapter } from "../../hooks/useSearchGrid";
import useMasterBulkDelete from "../../hooks/useMasterBulkDelete";
import MasterSearchPanel from "../../components/MasterSearchPanel";
import { masterSearchAreaSx } from "../../theme/erpUi";
import { ArrowLeft, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Stack, Card, Typography, Button } from "@mui/material";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import SearchableSelect from "../../components/SearchableSelect";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
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
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const storeMap = useStoreNameMap();

  const grid = useSearchGrid({
    adapter: createSearchGridAdapter(`/configurations/${configType.toLowerCase()}`, undefined, { paginate: true }),
    enabled: Boolean(configType), scopeKey: configType,
    onError: err => toast.error(err.response?.data?.message || "Failed to load configuration"),
  });
  const { rows, setRows, loading, page: tablePage, setPage: setTablePage, limit: tableLimit, setLimit: setTableLimit } = grid;
  const bulkDelete = useMasterBulkDelete({ endpoint: `/configurations/${configType.toLowerCase()}`, setSelectedRows, onDeleted: grid.refresh });

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
      setSelectedRows((prev) => prev.filter((key) => key !== id));
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
    <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default", color: "text.primary" }}>
      <ConfirmDialog
        open={Boolean(bulkDelete.confirmation)}
        message={`Delete ${bulkDelete.confirmation?.keys.length ?? 0} selected record(s)? This action cannot be undone.`}
        onConfirm={bulkDelete.confirmDelete}
        onCancel={bulkDelete.cancelDelete}
      />
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
      />

      <PageHeader
        title={
          <Breadcrumbs
            items={[
              { label: "Master", onClick: () => navigate("/masters") },
              { label: "Configuration" },
            ]}
          />
        }
        onBack={() => navigate(-1)}
        actions={
          <Button
            onClick={handleNew}
            className="topbar-action-btn topbar-action-new"
            startIcon={<PlusCircle size={12} />}
            size="small"
          >
            New
          </Button>
        }
      />

      <Box sx={{ ...masterSearchAreaSx, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Card variant="outlined" sx={{ p: 1, mb: 1, flexShrink: 0 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" }, gap: 1.5 }}>
            <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" } }}>
              <SearchableSelect
                label="Configuration Type"
                name="configType"
                options={typeOptions}
                value={configType}
                onChange={(e) => {
                  setSelectedRows([]);
                  setConfigType(e.target.value);
                }}
              />
            </Box>
          </Box>
        </Card>

        <MasterSearchPanel>
          <FilterableDataTable
            fillHeight
            rows={rows}
            columns={configColumns}
            enableSelection
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={bulkDelete.requestDelete}
            onRowClick={(row) => handleEdit(row.id)}
            enableKeyboardNav
            loading={loading}
            emptyText={configType ? "No records found for this type." : "Select Configuration Type to load records."}
            searchPlaceholder="Search in configuration fields..."
            searchButtonClassName="glass-btn glass-btn-primary"
            showExport={false}
            tablePreferenceKey="masters.configuration.list"
            paginationMode="server"
              enableServerSearch
              onServerSearch={grid.onServerSearch}
              pagination={grid.rawPagination}
              onNextCursor={grid.navigateCursor}
              onPreviousCursor={grid.navigateCursor}
            page={tablePage}
            limit={tableLimit}
            totalRows={grid.pagination.total}
            totalPages={grid.pagination.totalPages}
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
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirm({ open: true, id: row.id, name: row.name })}
                  title="Delete"
                  className="glass-btn glass-btn-danger"
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </Stack>
            )}
          />
        </MasterSearchPanel>
      </Box>
    </Box>
  );
};

export default Configuration;
