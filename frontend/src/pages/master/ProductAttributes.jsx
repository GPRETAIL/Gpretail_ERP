import { ArrowLeft, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
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
  const [attributeValues, setAttributeValues] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(20);
  const storeMap = useStoreNameMap();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = async () => {
    if (!formData.productType) {
      toast.warning("Please select a Product Type first!");
      return;
    }
    try {
      let rows = [];

      if (formData.productType === "SIZE") {
        const res = await api.get("/sizes", { params: { all: "true" } });
        rows = (res.data?.data || []).map((s) => ({
          id: s.id,
          name: s.size_name,
          isActive: true,
          code: s.code || "--",
          created_by: s.created_by || s.createdByName || "Superadmin",
          company_id: s.company_id || 1,
        }));
      } else if (formData.productType === "SIZEGROUP") {
        const res = await api.get("/size-groups", { params: { all: "true" } });
        rows = (res.data?.data || []).map((g) => ({
          id: g.id,
          name: g.group_name,
          isActive: true,
          code: (g.sizes || []).map((s) => s.size_name).join(", ") || "--",
          created_by: g.created_by || g.createdByName || "Superadmin",
          company_id: g.company_id || 1,
        }));
      } else {
        const res = await api.get(`/attributes/${formData.productType.toLowerCase()}`, { params: { all: "true" } });
        rows = (res.data?.data || []).map((a) => ({
          id: a.id,
          name: a.name,
          isActive: a.is_active,
          code: a.code || "--",
          created_by: a.created_by || a.createdByName || "Superadmin",
          company_id: a.company_id || 1,
        }));
      }

      setAttributeValues(rows);
      if (rows.length === 0) toast.info("No records found for this type.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Search failed");
    }
  };

  useEffect(() => {
    if (formData.productType) handleSearch();
    setTablePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.productType]);

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
    <Box sx={{ minHeight: "70vh", bgcolor: "background.default", color: "text.primary" }}>
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

      <Box sx={{ p: 1.5, pb: 8 }}>
        <Card variant="outlined" sx={{ p: 1.5, mb: 2 }}>
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
          <Box sx={{ mt: 2 }}>
            <FilterableDataTable
              rows={attributeValues}
              columns={attributeColumns}
              onRowClick={(row) => handleEdit(row.id)}
              enableKeyboardNav
              loading={false}
              emptyText="No records found for this Product Type."
              searchPlaceholder="Search in attribute fields..."
              searchButtonClassName="glass-btn glass-btn-primary"
              showExport={false}
              tablePreferenceKey={`masters.product-attributes.${formData.productType.toLowerCase()}`}
              paginationMode="client"
              page={tablePage}
              limit={tableLimit}
              totalRows={attributeValues.length}
              totalPages={Math.max(Math.ceil(attributeValues.length / Math.max(tableLimit, 1)), 1)}
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
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ProductAttributes;
