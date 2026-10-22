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
import UploadImportButton from "../../components/UploadImportButton";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import { getImportProps } from "../../utils/attrImportConfigs";
import useStoreNameMap from "../../hooks/useStoreNameMap";

const mockOptions = [
  { label: "SIZE", value: "SIZE" },
  { label: "SIZE GROUP", value: "SIZEGROUP" },
  { label: "PATTERN", value: "PATTERN" },
  { label: "STYLE", value: "STYLE" },
  { label: "TYPE", value: "TYPE" },
  { label: "COLOUR", value: "COLOUR" },
  { label: "MATERIAL", value: "MATERIAL" },
  { label: "SLEEVE", value: "SLEEVE" },
  { label: "FIT", value: "FIT" },
  { label: "STOCK MARKER", value: "MARKER" },
  { label: "AGESET", value: "AGESET" },
  { label: "UNITS", value: "UNITS" },
  { label: "PRODUCT GROUPS", value: "PRODUCTGROUPS" },
  { label: "PRODUCT HIERARCHY", value: "PRODUCTHIERARCHY" },
  { label: "SUPPLIER GROUP", value: "SUPPLIERGROUP" },
  { label: "CUSTOMER GROUP", value: "CUSTOMERGROUP" },
  { label: "BUYER GROUP", value: "BUYERSGROUP" },
  { label: "BARCODE ID", value: "BARCODEID" },
  { label: "SECTION", value: "DIVISION" },
  { label: "PRODUCT DIVISION", value: "PRODUCTDIVISION" },
  { label: "ITEM GROUPS", value: "ITEMGROUPS" },
  { label: "PRICE TAGS", value: "PRICETAGS" },
  { label: "SELLING NAME TEMPLATE", value: "SELLINGNAMES" },
  { label: "PRODUCT COVERAGE", value: "PRODUCTCOVERAGE" },
  { label: "DAILY PRICE GROUP", value: "DAILYPRICEGROUP" },
  { label: "CORE PRODUCT GROUP", value: "COREPRODUCTGROUP" },
  { label: "DUMPING GROUP", value: "DUMPINGGROUP" },
  { label: "CUSTOM FIELDS", value: "CUSTOMFIELDS" },
  { label: "COMPANY TYPE", value: "COMPANYTYPE" },
];

const ProductAttributes = () => {
  const [formData, setFormData] = useState({ productType: "" });
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const storeMap = useStoreNameMap();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedRows([]);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const type = formData.productType;
  const endpoint = type === "SIZE" ? "/sizes" : type === "SIZEGROUP" ? "/size-groups" : `/attributes/${type.toLowerCase()}`;
  const grid = useSearchGrid({
    adapter: createSearchGridAdapter(endpoint, row => ({
      ...row, name: row.size_name ?? row.group_name ?? row.name,
      isActive: row.is_active ?? true,
      code: type === "SIZEGROUP" ? (row.sizes || []).map(s => s.size_name).join(", ") || "--" : row.code || "--",
      created_by: row.created_by || row.createdByName || "Superadmin",
    }), { paginate: true }),
    enabled: Boolean(type), scopeKey: type,
    onError: err => toast.error(err.response?.data?.message || "Failed to load attributes"),
  });
  const { rows: attributeValues, setRows: setAttributeValues, page: tablePage, setPage: setTablePage, limit: tableLimit, setLimit: setTableLimit } = grid;
  const handleSearch = grid.refresh;
  const bulkDelete = useMasterBulkDelete({ endpoint, setSelectedRows, onDeleted: grid.refresh });

  const navigate = useNavigate();

  const handleNew = () => {
    const query = formData.productType ? `?type=${formData.productType}` : "";
    navigate(`/masters/product-attributes/new${query}`);
  };

  const handleEdit = (id) => {
    navigate(`/masters/product-attributes/new?type=${formData.productType}&id=${id}`);
  };

  const getDeleteEndpoint = (type, id) => {
    if (type === "SIZE") return `/sizes/${id}`;
    if (type === "SIZEGROUP") return `/size-groups/${id}`;
    return `/attributes/${type.toLowerCase()}/${id}`;
  };

  const handleDeleteConfirmed = async () => {
    const { id, name } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(getDeleteEndpoint(formData.productType, id));
      toast.success(`"${name}" deleted successfully.`);
      setAttributeValues((prev) => prev.filter((r) => r.id !== id));
      setSelectedRows((prev) => prev.filter((key) => key !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  };

  const attributeColumns = [
    { key: "name", label: "Name" },
    {
      key: "isActive",
      label: "Active",
      render: (value) => (value ? "Yes" : "No"),
      searchValue: (row) => (row.isActive ? "yes" : "no"),
    },
    {
      key: "code",
      label: formData.productType === "SIZEGROUP" ? "Sizes" : "Code",
    },
    {
      key: "created_by",
      label: "Created By",
      render: (value) => value || "Superadmin",
      searchValue: (row) => row.created_by || "Superadmin",
    },
    {
      key: "company_id",
      label: "Store/Warehouse",
      render: (value) => storeMap[String(value)] || (storeMap["1"] ?? "Main Store"),
      searchValue: (row) => storeMap[String(row.company_id)] || (storeMap["1"] ?? "Main Store"),
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
              { label: "Product Attributes" },
            ]}
          />
        }
        onBack={() => navigate(-1)}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              onClick={handleNew}
              className="topbar-action-btn topbar-action-new"
              startIcon={<PlusCircle size={12} />}
              size="small"
            >
              New
            </Button>
            {formData.productType && (() => {
              const ip = getImportProps(formData.productType);
              return ip ? (
                <>
                  <Typography sx={{ color: "text.secondary" }}>|</Typography>
                  <UploadImportButton
                    endpoint={ip.endpoint}
                    fieldConfig={ip.fieldConfig}
                    transform={ip.transform}
                    onDone={handleSearch}
                  />
                </>
              ) : null;
            })()}
          </Stack>
        }
      />

      <Box sx={{ ...masterSearchAreaSx, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Card variant="outlined" sx={{ p: 1, mb: 1, flexShrink: 0 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" }, gap: 1.5 }}>
            <Box sx={{ gridColumn: { xs: "span 12", lg: "span 4" } }}>
              <SearchableSelect
                label="Product Type"
                name="productType"
                options={mockOptions}
                value={formData.productType}
                onChange={handleChange}
              />
            </Box>
          </Box>
        </Card>

        {formData.productType && (
          <MasterSearchPanel>
            <FilterableDataTable
            fillHeight
              rows={attributeValues}
              columns={attributeColumns}
              enableSelection
              selectedRows={selectedRows}
              onSelectionChange={setSelectedRows}
              onBulkDelete={bulkDelete.requestDelete}
              onRowClick={(row) => handleEdit(row.id)}
              enableKeyboardNav
              loading={grid.loading}
              emptyText="No records found for this Product Type."
              searchPlaceholder="Search in attribute fields..."
              searchButtonClassName="glass-btn glass-btn-primary"
              showExport={false}
              tablePreferenceKey={`masters.product-attributes.${formData.productType.toLowerCase()}`}
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
        )}
      </Box>
    </Box>
  );
};

export default ProductAttributes;
